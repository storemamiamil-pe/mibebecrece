-- ============================================================================
-- Mi Bebé Crece · Migración inicial de base de datos
-- ============================================================================
-- Cómo aplicar esta migración:
--   1. Entra a tu proyecto en https://supabase.com/dashboard
--   2. Ve a "SQL Editor" (menú izquierdo) → "New query"
--   3. Pega todo este archivo y dale "Run"
-- Es seguro volver a correrlo si algo falla a la mitad (usa IF NOT EXISTS /
-- CREATE OR REPLACE en todo lo posible), pero revisa los mensajes de error.
-- ============================================================================

-- Función genérica para mantener updated_at al día en cada UPDATE.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- 1) profiles — un perfil por cada usuaria de auth.users
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea automáticamente un profile cuando alguien se registra en Supabase Auth.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- No hay policy de INSERT/DELETE para usuarias: el registro se crea solo por
-- el trigger anterior (que corre con privilegios elevados, "security definer").

-- ============================================================================
-- 2) access_entitlements — el estado real de compra/acceso de cada persona
-- ============================================================================
-- IMPORTANTE: esta tabla NO tiene policies de insert/update/delete para
-- usuarias autenticadas. Row Level Security deniega por defecto cualquier
-- operación sin policy, así que solo el webhook y el panel admin (que usan
-- la Service Role Key desde el servidor, saltándose RLS) pueden modificarla.
create table if not exists public.access_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  buyer_email text not null,
  provider text not null default 'hotmart',
  transaction_id text not null,
  product_id text,
  status text not null check (status in (
    'pending', 'active', 'refunded', 'chargeback', 'cancelled', 'expired'
  )),
  access_started_at timestamptz,
  access_expires_at timestamptz, -- null = acceso de por vida
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, transaction_id)
);

create index if not exists idx_entitlements_user_id on public.access_entitlements(user_id);
create index if not exists idx_entitlements_buyer_email on public.access_entitlements(lower(buyer_email));

drop trigger if exists trg_entitlements_updated_at on public.access_entitlements;
create trigger trg_entitlements_updated_at
  before update on public.access_entitlements
  for each row execute function public.set_updated_at();

alter table public.access_entitlements enable row level security;

drop policy if exists "entitlements_select_own" on public.access_entitlements;
create policy "entitlements_select_own" on public.access_entitlements
  for select using (auth.uid() = user_id);

-- ============================================================================
-- 3) baby_profiles — el perfil del bebé de cada usuaria
-- ============================================================================
create table if not exists public.baby_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  fecha_nacimiento date not null,
  semanas_gestacion integer,
  fecha_probable_parto date,
  foto_url text,
  intereses text[] default '{}',
  areas_prioritarias text[] default '{}',
  notas_familia text,
  preguntas_consulta text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_baby_profiles_user_id on public.baby_profiles(user_id);

drop trigger if exists trg_baby_profiles_updated_at on public.baby_profiles;
create trigger trg_baby_profiles_updated_at
  before update on public.baby_profiles
  for each row execute function public.set_updated_at();

alter table public.baby_profiles enable row level security;

drop policy if exists "baby_profiles_all_own" on public.baby_profiles;
create policy "baby_profiles_all_own" on public.baby_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- 4) milestone_progress — estado de cada hito, por bebé
-- ============================================================================
create table if not exists public.milestone_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  baby_id uuid not null references public.baby_profiles(id) on delete cascade,
  rango text not null,
  area text not null,
  hito_index integer not null,
  estado text not null default 'pendiente' check (estado in (
    'pendiente', 'comenzando', 'frecuente', 'comentar'
  )),
  fecha_observada date,
  nota text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (baby_id, rango, area, hito_index)
);

create index if not exists idx_milestone_progress_user_id on public.milestone_progress(user_id);
create index if not exists idx_milestone_progress_baby_id on public.milestone_progress(baby_id);

drop trigger if exists trg_milestone_progress_updated_at on public.milestone_progress;
create trigger trg_milestone_progress_updated_at
  before update on public.milestone_progress
  for each row execute function public.set_updated_at();

alter table public.milestone_progress enable row level security;

drop policy if exists "milestone_progress_all_own" on public.milestone_progress;
create policy "milestone_progress_all_own" on public.milestone_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- 5) activity_progress — actividades hechas / guardadas, por bebé
-- ============================================================================
create table if not exists public.activity_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  baby_id uuid not null references public.baby_profiles(id) on delete cascade,
  rango text not null,
  area text not null,
  hecho boolean not null default false,
  guardado boolean not null default false,
  fecha_realizada date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (baby_id, rango, area)
);

create index if not exists idx_activity_progress_user_id on public.activity_progress(user_id);
create index if not exists idx_activity_progress_baby_id on public.activity_progress(baby_id);

drop trigger if exists trg_activity_progress_updated_at on public.activity_progress;
create trigger trg_activity_progress_updated_at
  before update on public.activity_progress
  for each row execute function public.set_updated_at();

alter table public.activity_progress enable row level security;

drop policy if exists "activity_progress_all_own" on public.activity_progress;
create policy "activity_progress_all_own" on public.activity_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- 6) achievements — "sus pequeños grandes logros"
-- ============================================================================
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  baby_id uuid not null references public.baby_profiles(id) on delete cascade,
  nombre text not null,
  fecha date not null default current_date,
  area text,
  foto_url text,
  nota text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_achievements_user_id on public.achievements(user_id);
create index if not exists idx_achievements_baby_id on public.achievements(baby_id);

drop trigger if exists trg_achievements_updated_at on public.achievements;
create trigger trg_achievements_updated_at
  before update on public.achievements
  for each row execute function public.set_updated_at();

alter table public.achievements enable row level security;

drop policy if exists "achievements_all_own" on public.achievements;
create policy "achievements_all_own" on public.achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- 7) hotmart_webhook_events — registro técnico de cada evento recibido
-- ============================================================================
-- Sirve para no procesar dos veces el mismo evento (idempotencia) y para
-- poder auditar qué llegó de Hotmart ante cualquier duda. Sin policies de
-- RLS para usuarias: solo el servidor (Service Role Key) puede leer/escribir.
create table if not exists public.hotmart_webhook_events (
  id uuid primary key default gen_random_uuid(),
  hotmart_event_id text not null unique,
  event_name text not null,
  transaction_id text,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

alter table public.hotmart_webhook_events enable row level security;
-- Sin policies = nadie autenticado por el navegador puede leer ni escribir.

-- ============================================================================
-- Storage: bucket para fotos de bebé y de logros
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('baby-photos', 'baby-photos', true)
on conflict (id) do nothing;

drop policy if exists "baby_photos_select_public" on storage.objects;
create policy "baby_photos_select_public" on storage.objects
  for select using (bucket_id = 'baby-photos');

drop policy if exists "baby_photos_insert_own" on storage.objects;
create policy "baby_photos_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'baby-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "baby_photos_update_own" on storage.objects;
create policy "baby_photos_update_own" on storage.objects
  for update using (
    bucket_id = 'baby-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "baby_photos_delete_own" on storage.objects;
create policy "baby_photos_delete_own" on storage.objects
  for delete using (
    bucket_id = 'baby-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Con estas policies, cada usuaria debe subir sus fotos dentro de una carpeta
-- con su propio user_id como nombre, ej: "baby-photos/<user_id>/bebe.jpg".
-- El código de la app ya sube los archivos con esa estructura.

-- ============================================================================
-- Fin de la migración
-- ============================================================================
