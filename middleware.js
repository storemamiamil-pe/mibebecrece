import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { getAccessStatus, ACCESS_STATES } from './lib/access';

// Rutas que cualquier persona puede ver sin sesión (páginas públicas, legales
// y las pantallas del propio flujo de autenticación).
const RUTAS_PUBLICAS = [
  '/',
  '/bienvenida',
  '/crear-cuenta',
  '/iniciar-sesion',
  '/revisar-correo',
  '/recuperar-contrasena',
  '/restablecer-contrasena',
  '/privacidad',
  '/terminos',
  '/descargo-responsabilidad',
  '/eliminar-cuenta',
  '/acceso-no-autorizado',
  '/acceso-pendiente',
  '/acceso-vencido',
];

// Rutas que solo requieren sesión iniciada y correo confirmado, sin exigir
// todavía acceso "active" (para que la clienta pueda ver por qué no entra).
const RUTAS_SOLO_SESION = ['/revisar-correo'];

function esRutaPublica(pathname) {
  return RUTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Los archivos estáticos, la API y las rutas administrativas se manejan
  // aparte (la API valida sus propias credenciales; /admin protege con su
  // propia verificación de rol dentro del Route Handler / layout).
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/admin') ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|webmanifest)$/)
  ) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // ⚠️ DIAGNÓSTICO TEMPORAL — solo imprime true/false, nunca el valor real.
  // Bórralo de este archivo una vez que confirmes en los Runtime Logs de
  // Vercel cuál de las dos variables llega vacía.
  console.log(
    `[diagnóstico-env] NEXT_PUBLIC_SUPABASE_URL presente: ${!!supabaseUrl} | NEXT_PUBLIC_SUPABASE_ANON_KEY presente: ${!!supabaseAnonKey}`
  );

  // Si faltan las variables, fallamos "cerrado": nunca dejamos pasar a
  // nadie a una ruta protegida solo porque la configuración esté rota.
  // Las rutas públicas sí se siguen mostrando (para no tumbar toda la web
  // por un problema de configuración), pero cualquier ruta que requiera
  // sesión se manda a /iniciar-sesion en vez de crashear con 500.
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      '[middleware] Faltan variables de entorno de Supabase en este despliegue. Revisa Vercel → Settings → Environment Variables.'
    );
    if (esRutaPublica(pathname)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/iniciar-sesion', request.url));
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name, options) {
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const estado = await getAccessStatus(supabase, user);

  if (esRutaPublica(pathname)) {
    // Si ya tiene acceso activo y visita una pantalla de auth, la mandamos
    // directo a la app para no hacerla pasar por el login de nuevo.
    if (
      estado === ACCESS_STATES.ACTIVE &&
      ['/', '/bienvenida', '/crear-cuenta', '/iniciar-sesion'].includes(pathname)
    ) {
      return NextResponse.redirect(new URL('/app', request.url));
    }
    return response;
  }

  // A partir de aquí, todas las rutas restantes (incluida /app y /onboarding)
  // requieren sesión con acceso activo.
  switch (estado) {
    case ACCESS_STATES.NO_SESSION:
      return NextResponse.redirect(new URL('/iniciar-sesion', request.url));
    case ACCESS_STATES.EMAIL_NOT_CONFIRMED:
      return NextResponse.redirect(new URL('/revisar-correo', request.url));
    case ACCESS_STATES.NO_ENTITLEMENT:
    case ACCESS_STATES.PENDING:
      return NextResponse.redirect(new URL('/acceso-pendiente', request.url));
    case ACCESS_STATES.REFUNDED:
    case ACCESS_STATES.CHARGEBACK:
    case ACCESS_STATES.CANCELLED:
      return NextResponse.redirect(new URL('/acceso-no-autorizado', request.url));
    case ACCESS_STATES.EXPIRED:
      return NextResponse.redirect(new URL('/acceso-vencido', request.url));
    case ACCESS_STATES.ACTIVE:
      return response;
    default:
      return NextResponse.redirect(new URL('/acceso-no-autorizado', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
