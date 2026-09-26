import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '../../../lib/supabase/server';
import { createAdminClient } from '../../../lib/supabase/admin';
import { getAccessStatus } from '../../../lib/access';

export const runtime = 'nodejs';

// Esta ruta SOLO usa el correo de la sesión ya autenticada del servidor
// (nunca un correo que venga en el cuerpo de la petición), para que nadie
// pueda pedir "vincula esta compra a mi cuenta" usando el correo de otra
// persona.
export async function POST() {
  const supabaseServidor = createServerSupabase();
  const {
    data: { user },
  } = await supabaseServidor.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No hay sesión iniciada' }, { status: 401 });
  }
  if (!user.email_confirmed_at) {
    return NextResponse.json({ error: 'Correo aún no confirmado' }, { status: 403 });
  }

  const admin = createAdminClient();
  const email = user.email.trim().toLowerCase();

  // Busca compras que llegaron por webhook antes de que existiera la cuenta
  // (user_id nulo) con este mismo correo, y las vincula.
  const { data: filasSinVincular, error: buscarError } = await admin
    .from('access_entitlements')
    .select('id')
    .is('user_id', null)
    .ilike('buyer_email', email);

  if (buscarError) {
    console.error('Error buscando compras sin vincular:', buscarError.message);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  if (filasSinVincular && filasSinVincular.length > 0) {
    const { error: updateError } = await admin
      .from('access_entitlements')
      .update({ user_id: user.id })
      .in(
        'id',
        filasSinVincular.map((f) => f.id)
      );

    if (updateError) {
      console.error('Error vinculando compra:', updateError.message);
      return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
  }

  // Devolvemos el estado de acceso actualizado usando el cliente admin (que
  // sí puede leer la fila recién vinculada) filtrando por este user.
  const estado = await getAccessStatus(admin, user);

  return NextResponse.json({
    vinculado: (filasSinVincular || []).length > 0,
    estado,
  });
}
