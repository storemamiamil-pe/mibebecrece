# Mi Bebé Crece — Guía de puesta en marcha

Esta app pasó de ser un archivo HTML suelto a una aplicación Next.js con
autenticación real (Supabase), control de acceso por compra (Hotmart) y
despliegue en Vercel. Esta guía te lleva paso a paso para dejarla vendiendo.

## Resumen de lo que se construyó / modificó

**Nuevo (antes no existía nada de esto):**
- Proyecto Next.js 14 completo (`app/`, `components/`, `lib/`, `middleware.js`)
- Autenticación con Supabase Auth: crear cuenta, iniciar sesión, cerrar sesión,
  recuperar contraseña, confirmar correo, mostrar/ocultar contraseña
- 9 pantallas de estado de acceso (bienvenida, crear cuenta, iniciar sesión,
  revisar correo, recuperar contraseña, restablecer contraseña, acceso
  pendiente, acceso no autorizado, acceso vencido)
- Middleware (`middleware.js`) que protege rutas a nivel de servidor —
  escribir la URL directamente no sirve de nada sin acceso activo
- Migración SQL completa (`supabase/migrations/0001_init.sql`) con las tablas
  `profiles`, `access_entitlements`, `baby_profiles`, `milestone_progress`,
  `activity_progress`, `achievements`, `hotmart_webhook_events`, políticas de
  Row Level Security, índices y un bucket de Storage para fotos
- Webhook seguro de Hotmart (`app/api/webhooks/hotmart/route.js`) que valida
  el Hottok, evita procesar eventos duplicados, y activa/revoca acceso
- Vinculación automática de compras hechas antes de crear la cuenta
  (`app/api/link-purchase/route.js`)
- Panel administrativo protegido en `/admin` (buscar compradora, activar o
  revocar acceso manualmente)
- Páginas legales con campos marcados para completar (`/privacidad`,
  `/terminos`, `/descargo-responsabilidad`, `/eliminar-cuenta`)

**Migrado desde la versión anterior (mismo diseño, mismos colores, misma
tipografía, mismo contenido):**
- Las 8 pestañas (Inicio, Biblioteca, ¿Qué hacemos?, Hitos, Logros, Resumen,
  Cuándo consultar, Rutinas) — ahora en `components/AppDashboard.jsx`
- Los datos de hitos y actividades (`lib/data.js`)
- Toda la lógica de edad cronológica/corregida (`lib/helpers.js`)
- Los datos que antes vivían en `localStorage` ahora se guardan en Supabase
  y se cargan automáticamente al iniciar sesión, en cualquier celular

## 1) Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) → crea un proyecto nuevo (elige
   la región más cercana a tus compradoras).
2. Ve a **SQL Editor** → **New query**, pega todo el contenido de
   `supabase/migrations/0001_init.sql` y dale **Run**. Esto crea todas las
   tablas, políticas de seguridad y el bucket de fotos.
3. Ve a **Settings → API** y copia:
   - **Project URL** → será tu `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → será tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** (clic en "Reveal") → será tu
     `SUPABASE_SERVICE_ROLE_KEY`. **Nunca la compartas ni la subas a GitHub.**
4. Ve a **Authentication → Email Templates** y personaliza (opcional) el
   correo de confirmación y el de recuperación de contraseña con el nombre
   de tu marca.
5. Ve a **Authentication → URL Configuration** y agrega tu dominio de Vercel
   (ej. `https://tu-app.vercel.app`) tanto en "Site URL" como en "Redirect
   URLs" (agrega también `https://tu-app.vercel.app/auth/callback`).

## 2) Configurar Hotmart

1. En Hotmart, ve a tu producto → **Webhook** → crea un nuevo webhook.
2. En **URL de recepción**, pon: `https://tu-app.vercel.app/api/webhooks/hotmart`
3. Selecciona la versión **2.0.0** del webhook.
4. Marca los eventos: Compra aprobada, Compra completa, Compra cancelada,
   Compra reembolsada, Compra con chargeback, Compra expirada.
5. Ve a la pestaña **Autenticación** del webhook y copia el **Hottok** → será
   tu `HOTMART_HOTTOK`.
6. Copia el **ID del producto** (lo ves en la configuración del producto) →
   será tu `HOTMART_PRODUCT_ID`. Esto evita que comprar otro producto tuyo en
   Hotmart active esta app.
7. Usa el botón de **"Enviar prueba"** de Hotmart para confirmar que tu
   webhook responde `200` una vez esté publicado en Vercel.

## 3) Configurar Vercel

1. Sube este proyecto a un repositorio de GitHub (todo el contenido de esta
   carpeta, tal cual).
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el
   repositorio.
3. Antes de darle "Deploy", ve a **Environment Variables** y agrega TODAS las
   variables de `.env.example` con tus valores reales:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `HOTMART_HOTTOK`
   - `HOTMART_PRODUCT_ID`
   - `NEXT_PUBLIC_APP_URL` (la URL que te dará Vercel, puedes actualizarla
     después del primer deploy)
   - `ADMIN_EMAILS` (tu correo, para poder entrar a `/admin`)
4. Dale **Deploy**.
5. Una vez publicada, actualiza `NEXT_PUBLIC_APP_URL` con la URL final y
   vuelve a desplegar (Vercel → Deployments → ⋯ → Redeploy).

## 4) Antes de empezar a vender: completa esto

- [ ] Edita `lib/config.js` con tu WhatsApp/correo de soporte reales
- [ ] Completa los `[CORCHETES]` de `/privacidad` y `/terminos` con los datos
      legales reales de tu negocio (idealmente revisado por un abogado)
- [ ] Confirma que tu correo esté en `ADMIN_EMAILS` en Vercel
- [ ] Haz una compra de prueba en modo sandbox de Hotmart si tu plan lo
      permite, o una compra real de bajo monto, para probar el flujo completo

## 5) Lista de pruebas antes de vender

- [ ] Crear una cuenta nueva → llega el correo de confirmación
- [ ] Confirmar el correo → la app intenta vincular una compra automáticamente
- [ ] Iniciar sesión y cerrar sesión
- [ ] Recuperar contraseña → llega el correo → se puede establecer una nueva
- [ ] Una cuenta SIN compra vinculada ve la pantalla de "acceso pendiente" y
      NO puede entrar a `/app` escribiendo la URL directamente
- [ ] Hacer una compra de prueba en Hotmart con un correo ya registrado → el
      acceso se activa solo, sin recargar nada manualmente
- [ ] Hacer una compra de prueba con un correo SIN cuenta → queda pendiente,
      y al crear la cuenta con ese mismo correo y confirmarla, se activa sola
- [ ] Simular un reembolso desde el panel de pruebas de Hotmart (o cambiar el
      estado manualmente desde `/admin`) → la cuenta pierde el acceso
- [ ] Verificar en Supabase (tabla `hotmart_webhook_events`) que reenviar el
      mismo evento de prueba dos veces no duplica ni vuelve a procesar el acceso
- [ ] Crear el perfil del bebé, marcar hitos, actividades y un logro con dos
      cuentas distintas → confirmar que ninguna ve los datos de la otra
      (pídele a una amiga que pruebe con su propia cuenta, o usa una ventana
      de incógnito)
- [ ] Cerrar sesión y volver a entrar → el progreso sigue ahí
- [ ] Entrar a `/admin` con tu correo autorizado, buscar una compradora y
      probar activar/revocar su acceso manualmente
- [ ] Entrar a `/admin` con una cuenta que NO esté en `ADMIN_EMAILS` → debe
      rechazar el acceso

## Notas importantes

- **No se usó ningún dato simulado ni autenticación falsa.** Todo pasa por
  Supabase Auth real y por Row Level Security real en la base de datos.
- El middleware (`middleware.js`) es lo que impide que alguien sin acceso
  activo entre escribiendo la URL directamente — no depende de ocultar
  botones en la interfaz.
- La `SUPABASE_SERVICE_ROLE_KEY` solo se usa dentro de `app/api/**` (nunca en
  componentes de cliente), y `lib/supabase/admin.js` lanza un error a
  propósito si alguna vez terminara ejecutándose en el navegador.
- Los nombres de eventos y el mecanismo de autenticación del webhook
  (`X-HOTMART-HOTTOK`) se verificaron contra la documentación vigente de
  Hotmart al momento de construir esto — no se inventó nada, pero te
  recomendamos confirmar la estructura exacta del payload con el botón
  "Enviar prueba" de Hotmart antes de vender, por si hay diferencias menores
  entre cuentas.
- El proyecto se compiló exitosamente (`npm run build`) y se probaron en vivo
  todas las rutas públicas, la protección de rutas privadas sin sesión, la
  validación del Hottok (correcto/incorrecto) y la detección de eventos
  duplicados del webhook — todo funcionó como se esperaba. Lo único que no
  se pudo probar de extremo a extremo es la conexión real con tu proyecto de
  Supabase y tu cuenta de Hotmart, porque eso requiere tus credenciales
  reales, que nunca deben compartirse en un chat.
