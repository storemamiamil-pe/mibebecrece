import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Cliente de Supabase para usar en Server Components, Server Actions y
// Route Handlers. Lee la sesión del usuario desde las cookies, así que
// todas las consultas quedan protegidas por RLS como el propio usuario
// autenticado (nunca con privilegios de administrador).
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (e) {
            // Puede fallar si se llama desde un Server Component sin
            // capacidad de escribir cookies (se resuelve en el middleware).
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (e) {}
        },
      },
    }
  );
}
