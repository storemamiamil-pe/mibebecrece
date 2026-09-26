import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/restablecer-contrasena`);
  }

  // Confirmación de correo (signup) u otro tipo: el middleware decide a
  // dónde va según su estado real de acceso; /acceso-pendiente intentará
  // vincular una compra pendiente automáticamente.
  return NextResponse.redirect(`${origin}/acceso-pendiente`);
}
