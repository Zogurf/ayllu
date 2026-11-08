-- Idempotent, authenticated transaction for syncing an offline emergency report.
-- The outbox operation key is stable across retries; public and private rows commit together.

create table public.sync_operations (
  idempotency_key uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  operation_type text not null,
  result_id uuid not null,
  created_at timestamptz not null default now()
);

alter table public.sync_operations enable row level security;
revoke all on public.sync_operations from anon, authenticated;

create or replace function public.sync_emergency_report(
  p_idempotency_key uuid,
  p_report jsonb,
  p_private jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  report_id uuid := (p_report ->> 'id')::uuid;
  neighborhood_id uuid := (p_report ->> 'neighborhood_id')::uuid;
  prior_operation public.sync_operations%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;
  if p_idempotency_key is null or report_id is null or neighborhood_id is null then
    raise exception 'Missing idempotency key or report identifiers';
  end if;
  if coalesce(trim(p_report ->> 'title'), '') = ''
    or coalesce(trim(p_private ->> 'beneficiary_name'), '') = ''
    or coalesce(trim(p_private ->> 'exact_address'), '') = ''
    or coalesce(trim(p_private ->> 'consent_version'), '') = ''
    or p_private ->> 'consent_at' is null then
    raise exception 'Required report or consent fields are missing';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_idempotency_key::text, 0)
  );

  select * into prior_operation
  from public.sync_operations
  where idempotency_key = p_idempotency_key;

  if found then
    if prior_operation.user_id <> caller_id
      or prior_operation.operation_type <> 'emergency_report'
      or prior_operation.result_id <> report_id then
      raise exception 'Idempotency key was already used for another operation';
    end if;
    return prior_operation.result_id;
  end if;

  if not public.has_community_role(
    neighborhood_id,
    array['vecino', 'proveedor', 'coordinador', 'admin']::public.app_role[]
  ) then
    raise exception 'User is not a member of this neighborhood';
  end if;

  insert into public.emergency_reports (
    id, neighborhood_id, created_by, category, title, description, priority
  ) values (
    report_id,
    neighborhood_id,
    caller_id,
    p_report ->> 'category',
    trim(p_report ->> 'title'),
    coalesce(p_report ->> 'description', ''),
    coalesce((p_report ->> 'priority')::public.emergency_priority, 'media')
  );

  insert into public.emergency_report_private (
    report_id, beneficiary_name, beneficiary_age, exact_address, contact_phone, consent_at, consent_version
  ) values (
    report_id,
    trim(p_private ->> 'beneficiary_name'),
    nullif(p_private ->> 'beneficiary_age', '')::smallint,
    trim(p_private ->> 'exact_address'),
    nullif(trim(p_private ->> 'contact_phone'), ''),
    (p_private ->> 'consent_at')::timestamptz,
    trim(p_private ->> 'consent_version')
  );

  insert into public.sync_operations (idempotency_key, user_id, operation_type, result_id)
  values (p_idempotency_key, caller_id, 'emergency_report', report_id);

  return report_id;
end;
$$;

revoke all on function public.sync_emergency_report(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.sync_emergency_report(uuid, jsonb, jsonb) to authenticated;
