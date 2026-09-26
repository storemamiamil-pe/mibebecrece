import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// ⚠️ ADVERTENCIA DE SEGURIDAD ⚠️
// Este cliente usa la SUPABASE_SERVICE_ROLE_KEY, que se salta por completo
// Row Level Security. NUNCA debe importarse en un componente de cliente
// ("use client") ni en ningún archivo que pueda terminar en el bundle del
// navegador. Solo se usa dentro de Route Handlers (app/api/**) que corren
// exclusivamente en el servidor de Vercel.
//
// La variable SUPABASE_SERVICE_ROLE_KEY (sin prefijo NEXT_PUBLIC_) nunca
// se envía al navegador; Next.js solo expone al cliente las variables que
// empiezan con NEXT_PUBLIC_.

if (typeof window !== 'undefined') {
  throw new Error(
    'lib/supabase/admin.js fue importado en el navegador. Esto es un error de seguridad grave: revisa que ningún componente "use client" lo importe.'
  );
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el servidor.'
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
