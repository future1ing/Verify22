-- ═══════════════════════════════════════════════════════════════
-- Veriphy — Schema v2 (SÉCURISÉ) — idempotent, ré-exécutable
-- Coller dans : Supabase → SQL Editor → New query → Run
--
-- CORRECTIF CRITIQUE vs v1 :
--   "for all using (auth.uid()=id)" permettait à un client de faire
--   UPDATE profiles SET plan='business', role='admin' depuis la
--   console navigateur. v2 sépare les policies et protège les
--   colonnes sensibles par trigger.
-- ═══════════════════════════════════════════════════════════════

create extension if not exists pg_trgm;

-- ─── PROFILES ────────────────────────────────────────────────
create table if not exists public.profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  email                  text unique not null,
  name                   text not null default 'Utilisateur',
  phone                  text,
  country                text default 'MA',
  language               text default 'fr',
  role                   text default 'client' check (role in ('client','admin')),
  plan                   text default 'free'   check (plan in ('free','starter','pro','business')),
  is_active              boolean default true,
  crops                  text default '',
  countries_watched      text default 'EU',
  notify_channels        text default 'email',
  min_severity           text default 'info' check (min_severity in ('info','warning','critical')),
  stripe_customer_id     text unique,
  stripe_subscription_id text,
  plan_expires_at        timestamptz,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 🔒 Un utilisateur authentifié ne peut PAS modifier ses colonnes
-- sensibles. Seul le service_role (serveur) le peut.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  jwt_role text := coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','');
begin
  if jwt_role = 'authenticated' then
    new.role                   := old.role;
    new.plan                   := old.plan;
    new.is_active              := old.is_active;
    new.email                  := old.email;
    new.stripe_customer_id     := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.plan_expires_at        := old.plan_expires_at;
  end if;
  return new;
end; $$;

drop trigger if exists protect_profile_columns_tg on public.profiles;
create trigger protect_profile_columns_tg
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ─── ALERTS ──────────────────────────────────────────────────
create table if not exists public.alerts (
  id             bigserial primary key,
  user_id        uuid references public.profiles(id) on delete cascade,
  event_type     text not null,
  severity       text not null check (severity in ('critical','warning','info')),
  substance_name text not null,
  substance_id   text,
  product_code   text,
  product_name   text,
  old_mrl        text,
  new_mrl        text,
  regulation     text,
  description    text not null,
  country        text default 'EU',
  source         text default 'EU_Commission',
  detected_at    text,
  is_read        boolean default false,
  created_at     timestamptz default now()
);

create index if not exists idx_alerts_user    on public.alerts(user_id);
create index if not exists idx_alerts_sev     on public.alerts(severity);
create index if not exists idx_alerts_read    on public.alerts(is_read);
create index if not exists idx_alerts_created on public.alerts(created_at desc);

-- Un client ne peut modifier QUE is_read sur ses alertes
create or replace function public.protect_alert_columns()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  jwt_role text := coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','');
  submitted_is_read boolean := new.is_read;
begin
  if jwt_role = 'authenticated' then
    new := old;
    new.is_read := submitted_is_read;
  end if;
  return new;
end; $$;

drop trigger if exists protect_alert_columns_tg on public.alerts;
create trigger protect_alert_columns_tg
  before update on public.alerts
  for each row execute function public.protect_alert_columns();

-- ─── SNAPSHOTS & RAPPORTS ────────────────────────────────────
create table if not exists public.snapshots (
  id               bigserial primary key,
  snapshot_id      text unique not null,
  country          text not null,
  source           text not null,
  db_creation_date text,
  extracted_at     timestamptz default now(),
  total_substances integer default 0,
  total_records    integer default 0,
  storage_path     text,
  is_current       boolean default false
);

create table if not exists public.diff_reports (
  id                  bigserial primary key,
  report_id           text unique not null,
  snapshot_old        text,
  snapshot_new        text,
  country             text default 'EU',
  total_changes       integer default 0,
  critical_count      integer default 0,
  warning_count       integer default 0,
  info_count          integer default 0,
  substances_affected integer default 0,
  generated_at        timestamptz default now(),
  report_data         jsonb
);

create table if not exists public.notification_logs (
  id        bigserial primary key,
  user_id   uuid references public.profiles(id) on delete cascade,
  alert_id  bigint references public.alerts(id),
  channel   text check (channel in ('email','whatsapp','sms')),
  status    text check (status in ('sent','failed','dry_run')),
  sent_at   timestamptz default now(),
  error_msg text
);

-- ─── BASES PRODUITS (remplace les JSON 84MB) ────────────────
create table if not exists public.eu_substances (
  id         text primary key,
  name       text not null,
  flags      text[] default '{}',
  regulation text,
  mrl_count  integer default 0,
  updated_at timestamptz default now()
);

create table if not exists public.eu_mrls (
  id               bigserial primary key,
  substance_id     text references public.eu_substances(id) on delete cascade,
  product_code     text,
  product_name     text,
  mrl_value        text,
  mrl_type         text,
  application_date text
);
create index if not exists idx_eu_mrls_sub  on public.eu_mrls(substance_id);
create index if not exists idx_eu_mrls_prod on public.eu_mrls(product_code);

create table if not exists public.ma_products (
  id                 text primary key,
  name               text not null,
  holder             text,
  supplier           text,
  category           text,
  formulation        text,
  active_ingredients jsonb default '[]',
  valid_until        date,
  toxicity_class     text,
  usages             jsonb default '[]',
  updated_at         timestamptz default now()
);

create table if not exists public.es_products (
  id                text primary key,
  name              text not null,
  holder            text,
  manufacturer      text,
  active_ingredient text,
  concentration     text,
  formulation_type  text,
  status            text,
  expiry_date       date,
  registration_date date,
  renewal_date      date,
  updated_at        timestamptz default now()
);

create index if not exists idx_eu_sub_name_trgm on public.eu_substances using gin (name gin_trgm_ops);
create index if not exists idx_ma_name_trgm     on public.ma_products  using gin (name gin_trgm_ops);
create index if not exists idx_es_name_trgm     on public.es_products  using gin (name gin_trgm_ops);
create index if not exists idx_ma_category      on public.ma_products(category);
create index if not exists idx_es_status        on public.es_products(status);
create index if not exists idx_es_expiry        on public.es_products(expiry_date);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.alerts            enable row level security;
alter table public.notification_logs enable row level security;
alter table public.snapshots         enable row level security;
alter table public.diff_reports      enable row level security;
alter table public.eu_substances     enable row level security;
alter table public.eu_mrls           enable row level security;
alter table public.ma_products       enable row level security;
alter table public.es_products       enable row level security;

drop policy if exists "own profile"         on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

drop policy if exists "own alerts"        on public.alerts;
drop policy if exists "alerts_select_own" on public.alerts;
drop policy if exists "alerts_update_own" on public.alerts;
create policy "alerts_select_own" on public.alerts for select using (auth.uid() = user_id);
create policy "alerts_update_own" on public.alerts for update using (auth.uid() = user_id);

drop policy if exists "own notifs"        on public.notification_logs;
drop policy if exists "notifs_select_own" on public.notification_logs;
create policy "notifs_select_own" on public.notification_logs for select using (auth.uid() = user_id);

drop policy if exists "read snapshots" on public.snapshots;
drop policy if exists "read reports"   on public.diff_reports;
create policy "read snapshots" on public.snapshots    for select using (auth.role() = 'authenticated');
create policy "read reports"   on public.diff_reports for select using (auth.role() = 'authenticated');

drop policy if exists "read eu_substances" on public.eu_substances;
drop policy if exists "read eu_mrls"       on public.eu_mrls;
drop policy if exists "read ma_products"   on public.ma_products;
drop policy if exists "read es_products"   on public.es_products;
create policy "read eu_substances" on public.eu_substances for select using (auth.role() = 'authenticated');
create policy "read eu_mrls"       on public.eu_mrls       for select using (auth.role() = 'authenticated');
create policy "read ma_products"   on public.ma_products   for select using (auth.role() = 'authenticated');
create policy "read es_products"   on public.es_products   for select using (auth.role() = 'authenticated');

-- ─── STORAGE : uploads pipeline (admins uniquement) ─────────
insert into storage.buckets (id, name, public)
values ('pipeline-uploads', 'pipeline-uploads', false)
on conflict (id) do nothing;

drop policy if exists "pipeline admin insert" on storage.objects;
create policy "pipeline admin insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'pipeline-uploads'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "pipeline admin read" on storage.objects;
create policy "pipeline admin read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'pipeline-uploads'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ─── HELPERS ─────────────────────────────────────────────────
create or replace function public.get_alert_stats(p_user_id uuid)
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'total',    count(*),
    'unread',   count(*) filter (where not is_read),
    'critical', count(*) filter (where severity = 'critical'),
    'warning',  count(*) filter (where severity = 'warning'),
    'info',     count(*) filter (where severity = 'info')
  ) from public.alerts where user_id = p_user_id;
$$;

-- ═══ APRÈS ta première inscription, promouvoir ton compte : ═══
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'ton@email.com';
