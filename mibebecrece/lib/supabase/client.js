import { createBrowserClient } from '@supabase/ssr';

// Cliente de Supabase para usar en componentes de cliente ("use client").
// Usa la ANON KEY pública: es segura de exponer en el navegador porque
// todo el acceso a datos está protegido por Row Level Security (RLS)
// en la base de datos, no por esta clave.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
