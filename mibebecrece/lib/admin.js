import { createClient as createServerSupabase } from './supabase/server';

/**
 * Verifica, del lado del servidor, si la sesión actual pertenece a una
 * administradora autorizada. La lista de correos vive en la variable de
 * entorno ADMIN_EMAILS (separados por coma), nunca expuesta al navegador
 * porque no lleva el prefijo NEXT_PUBLIC_.
 *
 * Ocultar el botón de "Admin" en la interfaz NO es suficiente: esta función
 * se usa dentro de cada Route Handler y layout administrativo para negar
 * el acceso también a nivel de servidor.
 */
export async function getAdminUser() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email_confirmed_at) return null;

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.includes(user.email.trim().toLowerCase())) {
    return user;
  }
  return null;
}
