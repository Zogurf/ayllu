-- Ayllu backend foundation.
-- Apply to a new Supabase project; no production data is created by this migration.
-- Membership roles are managed by a trusted administrator/service role, never by the app client.

create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('vecino', 'proveedor', 'coordinador', 'admin');
create type public.emergency_status as enum ('pendiente', 'atencion', 'resuelto', 'cerrado');
create type public.emergency_priority as enum ('media', 'alta', 'urgente');

create table public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  district text not null,
  region text not null,
  created_at timestamptz not null default now(),
  unique (name, district, region)
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(trim(nickname)) between 1 and 80),
  phone text,
  neighborhood_id uuid references public.neighborhoods (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.community_memberships (
  user_id uuid not null references auth.users (id) on delete cascade,
  neighborhood_id uuid not null references public.neighborhoods (id) on delete cascade,
  role public.app_role not null default 'vecino',
  created_at timestamptz not null default now(),
  primary key (user_id, neighborhood_id)
);

create table public.emergency_reports (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('AY-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  neighborhood_id uuid not null references public.neighborhoods (id),
  created_by uuid not null references auth.users (id),
  category text not null,
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text not null default '',
  priority public.emergency_priority not null default 'media',
  status public.emergency_status not null default 'pendiente',
  assigned_brigade text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep direct identifiers and exact location outside the community-readable report row.
create table public.emergency_report_private (
  report_id uuid primary key references public.emergency_reports (id) on delete cascade,
  beneficiary_name text not null,
  beneficiary_age smallint check (beneficiary_age is null or beneficiary_age between 0 and 125),
  exact_address text not null,
  contact_phone text,
  consent_at timestamptz not null,
  consent_version text not null
);

create index emergency_reports_neighborhood_created_idx
  on public.emergency_reports (neighborhood_id, created_at desc);
create index community_memberships_neighborhood_role_idx
  on public.community_memberships (neighborhood_id, role);

create or replace function public.has_community_role(
  target_neighborhood_id uuid,
  allowed_roles public.app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.community_memberships as membership
    where membership.user_id = (select auth.uid())
      and membership.neighborhood_id = target_neighborhood_id
      and membership.role = any (allowed_roles)
  );
$$;

revoke all on function public.has_community_role(uuid, public.app_role[]) from public;
grant execute on function public.has_community_role(uuid, public.app_role[]) to authenticated;

alter table public.neighborhoods enable row level security;
alter table public.profiles enable row level security;
alter table public.community_memberships enable row level security;
alter table public.emergency_reports enable row level security;
alter table public.emergency_report_private enable row level security;

revoke all on public.neighborhoods, public.profiles, public.community_memberships,
  public.emergency_reports, public.emergency_report_private from anon, authenticated;
grant select on public.neighborhoods to authenticated;
grant select on public.profiles to authenticated;
grant insert (id, nickname, phone, neighborhood_id) on public.profiles to authenticated;
grant update (nickname, phone, neighborhood_id, updated_at) on public.profiles to authenticated;
grant select on public.community_memberships to authenticated;
grant select on public.emergency_reports to authenticated;
grant insert (neighborhood_id, created_by, category, title, description, priority)
  on public.emergency_reports to authenticated;
grant update (status, assigned_brigade, updated_at) on public.emergency_reports to authenticated;
grant insert, select on public.emergency_report_private to authenticated;

create policy "authenticated users can read neighborhoods"
  on public.neighborhoods for select to authenticated
  using (true);

create policy "users can read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "users can create their own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

create policy "users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "users can read their own memberships"
  on public.community_memberships for select to authenticated
  using (user_id = (select auth.uid()));

create policy "community members can read neighborhood reports"
  on public.emergency_reports for select to authenticated
  using (
    public.has_community_role(neighborhood_id, array['vecino', 'proveedor', 'coordinador', 'admin']::public.app_role[])
  );

create policy "community members can submit reports"
  on public.emergency_reports for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.has_community_role(neighborhood_id, array['vecino', 'proveedor', 'coordinador', 'admin']::public.app_role[])
  );

create policy "coordinators can update neighborhood reports"
  on public.emergency_reports for update to authenticated
  using (
    public.has_community_role(neighborhood_id, array['coordinador', 'admin']::public.app_role[])
  )
  with check (
    public.has_community_role(neighborhood_id, array['coordinador', 'admin']::public.app_role[])
  );

create policy "report author can submit private details"
  on public.emergency_report_private for insert to authenticated
  with check (
    exists (
      select 1 from public.emergency_reports as report
      where report.id = report_id and report.created_by = (select auth.uid())
    )
  );

create policy "coordinators can read private report details"
  on public.emergency_report_private for select to authenticated
  using (
    exists (
      select 1
      from public.emergency_reports as report
      where report.id = report_id
        and public.has_community_role(report.neighborhood_id, array['coordinador', 'admin']::public.app_role[])
    )
  );
