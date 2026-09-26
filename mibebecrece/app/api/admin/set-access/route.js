import { NextResponse } from 'next/server';
import { getAdminUser } from '../../../../lib/admin';
import { createAdminClient } from '../../../../lib/supabase/admin';

export const runtime = 'nodejs';

const ESTADOS_VALIDOS = ['pending', 'active', 'refunded', 'chargeback', 'cancelled', 'expired'];

export async function POST(request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizada' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const entitlementId = body?.entitlementId;
  const nuevoEstado = body?.status;

  if (!entitlementId || !ESTADOS_VALIDOS.includes(nuevoEstado)) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  const updates = { status: nuevoEstado };
  if (nuevoEstado === 'active') {
    updates.access_started_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from('access_entitlements')
    .update(updates)
    .eq('id', entitlementId);

  if (error) {
    console.error('Error actualizando acceso desde admin:', error.message);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
