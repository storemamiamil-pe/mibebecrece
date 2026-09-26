import { NextResponse } from 'next/server';
import { getAdminUser } from '../../../../lib/admin';
import { createAdminClient } from '../../../../lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET(request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizada' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const email = (searchParams.get('email') || '').trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'Falta el parámetro email' }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  const { data: perfil } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, created_at')
    .ilike('email', email)
    .maybeSingle();

  const { data: compras, error } = await supabaseAdmin
    .from('access_entitlements')
    .select('*')
    .ilike('buyer_email', email)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  return NextResponse.json({
    cuentaCreada: !!perfil,
    perfil: perfil || null,
    compras: compras || [],
  });
}
