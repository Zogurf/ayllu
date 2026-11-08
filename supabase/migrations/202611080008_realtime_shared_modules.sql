-- Recover audit objects when remote migration history and schema have diverged.
-- This does not delete existing audit rows or change migration history.
-- Append-only audit trail for emergency operations. Never store report PII here.
create table if not exists public.emergency_audit_events (
  id bigint generated always as identity primary key,
  neighborhood_id uuid not null references public.neighborhoods(id) on delete cascade,
  report_id uuid references public.emergency_reports(id) on delete set null,
  actor_id uuid not null references auth.users(id),
  event_type text not null check (event_type in ('report_status_changed','brigade_assigned','private_report_viewed','emergency_mode_activated','emergency_mode_closed')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists emergency_audit_events_scope_created_idx
  on public.emergency_audit_events(neighborhood_id,created_at desc);
alter table public.emergency_audit_events enable row level security;
revoke all on public.emergency_audit_events from anon,authenticated;
grant select on public.emergency_audit_events to authenticated;
do $repair_policy$
begin
  if not exists (select 1 from pg_policies where schemaname='public'
    and tablename='emergency_audit_events' and policyname='coordinators can read emergency audit') then
create policy "coordinators can read emergency audit" on public.emergency_audit_events
  for select to authenticated using (
    public.has_community_role(neighborhood_id,array['coordinador','admin']::public.app_role[])
  );
  end if;
end
$repair_policy$;

-- Private report reads must pass through the audited RPC; direct PostgREST
-- SELECT would otherwise bypass the audit event written by that RPC.
revoke select on public.emergency_report_private from authenticated,anon;

create or replace function public.set_emergency_mode(p_neighborhood_id uuid,p_active boolean,p_type text)
returns void language plpgsql security definer set search_path = '' as $$
declare prior public.emergency_modes%rowtype;
begin
  if not public.has_community_role(p_neighborhood_id,array['coordinador','admin']::public.app_role[]) then raise exception 'Solo coordinadores pueden activar emergencias.'; end if;
  select * into prior from public.emergency_modes where neighborhood_id=p_neighborhood_id for update;
  insert into public.emergency_modes(neighborhood_id,active,emergency_type,activated_by,updated_at)
  values(p_neighborhood_id,p_active,case when p_active then left(coalesce(p_type,''),120) else '' end,case when p_active then (select auth.uid()) else null end,now())
  on conflict(neighborhood_id) do update set active=excluded.active,emergency_type=excluded.emergency_type,activated_by=excluded.activated_by,updated_at=now();
  if coalesce(prior.active,false) is distinct from p_active then
    insert into public.emergency_audit_events(neighborhood_id,actor_id,event_type,details)
    values(p_neighborhood_id,(select auth.uid()),case when p_active then 'emergency_mode_activated' else 'emergency_mode_closed' end,
      jsonb_build_object('emergency_type',case when p_active then left(coalesce(p_type,''),120) else coalesce(prior.emergency_type,'') end));
  end if;
end;
$$;

create or replace function public.update_emergency_status(p_report_id uuid,p_status text,p_brigade text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare target public.emergency_reports%rowtype; new_brigade text;
begin
  if p_status not in ('pendiente','atencion','resuelto','cerrado') then raise exception 'Estado inválido.'; end if;
  select * into target from public.emergency_reports where id=p_report_id for update;
  if target.id is null or not public.has_community_role(target.neighborhood_id,array['coordinador','admin']::public.app_role[]) then raise exception 'No tienes permiso para actualizar este reporte.'; end if;
  new_brigade:=left(nullif(trim(p_brigade),''),120);
  update public.emergency_reports set status=p_status::public.emergency_status,assigned_brigade=new_brigade,updated_at=now() where id=p_report_id;
  if target.status::text is distinct from p_status then
    insert into public.emergency_audit_events(neighborhood_id,report_id,actor_id,event_type,details)
    values(target.neighborhood_id,p_report_id,(select auth.uid()),'report_status_changed',jsonb_build_object('from',target.status::text,'to',p_status));
  end if;
  if target.assigned_brigade is distinct from new_brigade then
    insert into public.emergency_audit_events(neighborhood_id,report_id,actor_id,event_type,details)
    values(target.neighborhood_id,p_report_id,(select auth.uid()),'brigade_assigned',jsonb_build_object('from',target.assigned_brigade,'to',new_brigade));
  end if;
end;
$$;

create or replace function public.read_emergency_private(p_report_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb; target_neighborhood uuid;
begin
  select report.neighborhood_id into target_neighborhood from public.emergency_reports report
  where report.id=p_report_id and public.has_community_role(report.neighborhood_id,array['coordinador','admin']::public.app_role[]);
  if target_neighborhood is null then raise exception 'No tienes permiso para consultar los datos privados.'; end if;
  select jsonb_build_object('beneficiary_name',private.beneficiary_name,'beneficiary_age',private.beneficiary_age,'exact_address',private.exact_address,'contact_phone',private.contact_phone)
  into result from public.emergency_report_private private where private.report_id=p_report_id;
  if result is null then raise exception 'No hay información privada disponible para este reporte.'; end if;
  insert into public.emergency_audit_events(neighborhood_id,report_id,actor_id,event_type)
  values(target_neighborhood,p_report_id,(select auth.uid()),'private_report_viewed');
  return result;
end;
$$;

-- Reapply RPC permissions even when an earlier migration was recorded without these objects.
revoke all on function public.set_emergency_mode(uuid,boolean,text),
  public.update_emergency_status(uuid,text,text),public.read_emergency_private(uuid) from public,anon;
grant execute on function public.set_emergency_mode(uuid,boolean,text),
  public.update_emergency_status(uuid,text,text),public.read_emergency_private(uuid) to authenticated;

-- Extend realtime to shared modules. Existing RLS policies still control row delivery.
-- Private emergency details are deliberately excluded from the publication.
do $$
declare target text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'supabase_realtime is unavailable; the app will continue polling.';
    return;
  end if;
  foreach target in array array[
    'local_services', 'service_endorsements', 'emergency_reports',
    'critical_resources', 'emergency_modes', 'content_reports',
    'emergency_audit_events', 'conversations', 'messages', 'conversation_participants'
  ] loop
    if not exists (select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = target) then
      execute format('alter publication supabase_realtime add table public.%I', target);
    end if;
  end loop;
end
$$;
