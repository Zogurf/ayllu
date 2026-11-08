-- Shared service directory, endorsements, community resources and moderation.
-- All writes go through authenticated RPCs so ownership and territorial scope
-- are checked on the server instead of trusting client supplied roles/phones.

create table public.local_services (
  id uuid primary key,
  author_id uuid not null references auth.users(id) on delete cascade,
  neighborhood_id uuid not null references public.neighborhoods(id),
  district_ubigeo text not null references public.peru_districts(ubigeo),
  content jsonb not null,
  deleted boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index local_services_district_created_idx on public.local_services(district_ubigeo, created_at desc);

create table public.service_endorsements (
  service_id uuid not null references public.local_services(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (service_id, user_id)
);

create table public.critical_resources (
  id uuid primary key,
  neighborhood_id uuid not null references public.neighborhoods(id),
  content jsonb not null,
  quantity numeric not null check (quantity > 0),
  unit text not null,
  version integer not null default 1 check (version > 0),
  created_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.emergency_modes (
  neighborhood_id uuid primary key references public.neighborhoods(id) on delete cascade,
  active boolean not null default false,
  emergency_type text not null default '',
  activated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.content_reports (
  id uuid primary key,
  item_id uuid not null,
  item_type text not null check (item_type in ('favor','service','emergency_report')),
  neighborhood_id uuid not null references public.neighborhoods(id),
  reported_by uuid not null references auth.users(id),
  reason text not null check (char_length(trim(reason)) between 1 and 160),
  details text not null default '' check (char_length(details) <= 2000),
  status text not null default 'pending' check (status in ('pending','reviewed','hidden')),
  created_at timestamptz not null default now()
);
create index content_reports_neighborhood_created_idx on public.content_reports(neighborhood_id,created_at desc);
create table public.content_moderation_events (
  id bigint generated always as identity primary key,
  item_id uuid not null,
  item_type text not null,
  neighborhood_id uuid not null references public.neighborhoods(id),
  moderator_id uuid not null references auth.users(id),
  hidden boolean not null,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.local_services enable row level security;
alter table public.service_endorsements enable row level security;
alter table public.critical_resources enable row level security;
alter table public.emergency_modes enable row level security;
alter table public.content_reports enable row level security;
alter table public.content_moderation_events enable row level security;

revoke all on public.local_services, public.service_endorsements, public.critical_resources,
  public.emergency_modes, public.content_reports from anon, authenticated;
revoke all on public.content_moderation_events from anon,authenticated;
grant select on public.content_moderation_events to authenticated;
grant select on public.local_services, public.service_endorsements, public.critical_resources,
  public.emergency_modes, public.content_reports to authenticated;

create policy "district members can read services" on public.local_services for select to authenticated
using (exists (
  select 1 from public.community_memberships m join public.neighborhoods n on n.id=m.neighborhood_id
  where m.user_id=(select auth.uid()) and n.district_ubigeo=local_services.district_ubigeo
));
create policy "district members can read endorsements" on public.service_endorsements for select to authenticated
using (exists (
  select 1 from public.local_services s join public.community_memberships m on m.user_id=(select auth.uid())
  join public.neighborhoods n on n.id=m.neighborhood_id
  where s.id=service_endorsements.service_id and s.district_ubigeo=n.district_ubigeo
));
create policy "members can read neighborhood resources" on public.critical_resources for select to authenticated
using (public.has_community_role(neighborhood_id,array['vecino','proveedor','coordinador','admin']::public.app_role[]));
create policy "members can read emergency mode" on public.emergency_modes for select to authenticated
using (public.has_community_role(neighborhood_id,array['vecino','proveedor','coordinador','admin']::public.app_role[]));
create policy "coordinators can read neighborhood reports" on public.content_reports for select to authenticated
using (public.has_community_role(neighborhood_id,array['coordinador','admin']::public.app_role[]));
create policy "coordinators can read moderation history" on public.content_moderation_events for select to authenticated
using (public.has_community_role(neighborhood_id,array['coordinador','admin']::public.app_role[]));

alter table public.community_favors add column hidden boolean not null default false;
alter table public.community_favors add column version integer not null default 1 check (version > 0);
alter table public.emergency_reports add column hidden boolean not null default false;

-- Retain the first implementation for its ownership and idempotency checks,
-- then add author edits and the shared visibility flag.
alter function public.sync_community_favor(uuid,jsonb,text) rename to sync_community_favor_v1;
create or replace function public.sync_community_favor(p_operation_id uuid,p_favor jsonb,p_action text default 'save')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  result_id uuid;
  caller uuid := (select auth.uid());
  target public.community_favors%rowtype;
  favor_id uuid := (p_favor->>'id')::uuid;
  safe_title text := trim(coalesce(p_favor->>'title',''));
  safe_description text := trim(coalesce(p_favor->>'description',''));
begin
  if p_action='save' and p_favor->>'contactChannel'='whatsapp'
     and coalesce((p_favor->>'sharePhone')::boolean,false) is not true then
    raise exception 'Autoriza compartir tu teléfono antes de publicar con WhatsApp.';
  end if;
  result_id := public.sync_community_favor_v1(p_operation_id,p_favor,p_action);
  if p_action='save' then
    if char_length(safe_title) not between 1 and 160 or char_length(safe_description) not between 1 and 500 then raise exception 'Revisa el título y la descripción.'; end if;
    select * into target from public.community_favors where id=result_id;
    if target.author_id<>caller then raise exception 'Solo el autor puede editar el favor.'; end if;
    if not target.deleted then
      update public.community_favors set content=content||jsonb_build_object('title',safe_title,'description',safe_description),version=version+1 where id=result_id;
    end if;
  end if;
  return result_id;
end;
$$;
revoke all on function public.sync_community_favor(uuid,jsonb,text) from public,anon;
grant execute on function public.sync_community_favor(uuid,jsonb,text) to authenticated;

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  favor_id uuid not null references public.community_favors(id) on delete cascade,
  title text not null,
  requester_id uuid not null references auth.users(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(favor_id,requester_id),
  check(requester_id<>author_id)
);
create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_delivered_at timestamptz,
  last_read_at timestamptz,
  primary key(conversation_id,user_id)
);
create table public.messages (
  id uuid primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check(char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_conversation_created_idx on public.messages(conversation_id,created_at);
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
revoke all on public.conversations,public.conversation_participants,public.messages from anon,authenticated;
grant select on public.conversations,public.conversation_participants,public.messages to authenticated;
create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.conversation_participants p where p.conversation_id=p_conversation_id and p.user_id=(select auth.uid()));
$$;
revoke all on function public.is_conversation_participant(uuid) from public,anon;
grant execute on function public.is_conversation_participant(uuid) to authenticated;
create policy "participants can read conversations" on public.conversations for select to authenticated
using(public.is_conversation_participant(id));
create policy "participants can read participant receipts" on public.conversation_participants for select to authenticated
using(public.is_conversation_participant(conversation_id));
create policy "participants can read messages" on public.messages for select to authenticated
using(public.is_conversation_participant(conversation_id));

create or replace function public.open_favor_conversation(p_favor_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare caller uuid:=(select auth.uid()); favor public.community_favors%rowtype; conversation_id uuid;
begin
  if caller is null then raise exception 'Inicia sesión para contactar.'; end if;
  select * into favor from public.community_favors where id=p_favor_id and not deleted and not hidden and status='disponible';
  if favor.id is null then raise exception 'Este favor ya no está disponible para contacto.'; end if;
  if favor.author_id=caller then raise exception 'No puedes iniciar un chat contigo mismo.'; end if;
  if not exists(select 1 from public.community_memberships m join public.neighborhoods n on n.id=m.neighborhood_id where m.user_id=caller and n.district_ubigeo=favor.district_ubigeo) then raise exception 'Debes pertenecer al distrito de este favor.'; end if;
  insert into public.conversations(favor_id,title,requester_id,author_id) values(p_favor_id,coalesce(favor.content->>'title','Favor vecinal'),caller,favor.author_id)
  on conflict(favor_id,requester_id) do update set title=excluded.title returning id into conversation_id;
  insert into public.conversation_participants(conversation_id,user_id) values(conversation_id,caller),(conversation_id,favor.author_id) on conflict do nothing;
  return conversation_id;
end;
$$;
create or replace function public.send_message(p_id uuid,p_conversation_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare caller uuid:=(select auth.uid()); existing public.messages%rowtype;
begin
  if caller is null or not exists(select 1 from public.conversation_participants where conversation_id=p_conversation_id and user_id=caller) then raise exception 'No perteneces a esta conversación.'; end if;
  if char_length(trim(coalesce(p_body,''))) not between 1 and 2000 then raise exception 'El mensaje debe tener entre 1 y 2000 caracteres.'; end if;
  select * into existing from public.messages where id=p_id;
  if found then
    if existing.sender_id<>caller or existing.conversation_id<>p_conversation_id or existing.body<>trim(p_body) then raise exception 'El identificador del mensaje ya fue usado.'; end if;
    return p_id;
  end if;
  insert into public.messages(id,conversation_id,sender_id,body) values(p_id,p_conversation_id,caller,trim(p_body));
  return p_id;
end;
$$;
create or replace function public.mark_conversation_delivered(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.conversation_participants set last_delivered_at=now() where conversation_id=p_id and user_id=(select auth.uid());
  if not found then raise exception 'No perteneces a esta conversación.'; end if;
end;
$$;
create or replace function public.mark_conversation_read(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.conversation_participants set last_read_at=now(),last_delivered_at=coalesce(last_delivered_at,now()) where conversation_id=p_id and user_id=(select auth.uid());
  if not found then raise exception 'No perteneces a esta conversación.'; end if;
end;
$$;
revoke all on function public.open_favor_conversation(uuid),public.send_message(uuid,uuid,text),public.mark_conversation_delivered(uuid),public.mark_conversation_read(uuid) from public,anon;
grant execute on function public.open_favor_conversation(uuid),public.send_message(uuid,uuid,text),public.mark_conversation_delivered(uuid),public.mark_conversation_read(uuid) to authenticated;

create or replace function public.sync_local_service(p_operation_id uuid,p_service jsonb,p_action text default 'save')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  service_id uuid := (p_service->>'id')::uuid;
  profile public.profiles%rowtype;
  location public.neighborhoods%rowtype;
  existing public.local_services%rowtype;
  prior public.sync_operations%rowtype;
  safe_content jsonb;
begin
  if caller is null then raise exception 'Inicia sesión para sincronizar el servicio.'; end if;
  if p_operation_id is null or service_id is null or p_action not in ('save','delete') then raise exception 'Operación inválida.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(service_id::text,0));
  select * into prior from public.sync_operations where idempotency_key=p_operation_id;
  if found then
    if prior.user_id<>caller or prior.operation_type<>'service_post' or prior.result_id<>service_id then raise exception 'La operación ya se usó para otro cambio.'; end if;
    return service_id;
  end if;
  select * into profile from public.profiles where id=caller;
  select * into location from public.neighborhoods where id=profile.neighborhood_id;
  if location.id is null or not exists(select 1 from public.community_memberships where user_id=caller and neighborhood_id=location.id) then
    raise exception 'Completa tu perfil y barrio antes de publicar.';
  end if;
  select * into existing from public.local_services where id=service_id;
  if found then
    if existing.author_id<>caller then raise exception 'Solo el autor puede modificar este servicio.'; end if;
    if p_action='delete' then update public.local_services set deleted=true,updated_at=now() where id=service_id;
    else
      if existing.deleted then raise exception 'Este servicio fue retirado.'; end if;
      if coalesce(char_length(trim(p_service->>'title')),0) not between 1 and 160 or coalesce(char_length(trim(p_service->>'description')),0) not between 1 and 500 then raise exception 'Revisa el título y la descripción.'; end if;
      safe_content := existing.content || jsonb_build_object('title',trim(p_service->>'title'),'description',trim(p_service->>'description'));
      update public.local_services set content=safe_content,updated_at=now() where id=service_id;
    end if;
  else
    if p_action<>'save' then raise exception 'El servicio no existe.'; end if;
    if coalesce(char_length(trim(p_service->>'title')),0) not between 1 and 160 or coalesce(char_length(trim(p_service->>'description')),0) not between 1 and 500
       or coalesce(p_service->>'category','') not in ('carpinteria','cuidados','gasfiteria','electricidad','cerrajeria','educacion','otros') then raise exception 'Revisa los datos del servicio.'; end if;
    if coalesce((p_service->>'sharePhone')::boolean,false) and coalesce(profile.phone,'')='' then raise exception 'Agrega un teléfono válido a tu perfil antes de compartirlo.'; end if;
    safe_content:=jsonb_build_object(
      'title',trim(p_service->>'title'),'category',p_service->>'category','categoryLabel',left(coalesce(p_service->>'categoryLabel',''),80),
      'providerName',profile.nickname,'providerPhone',case when coalesce((p_service->>'sharePhone')::boolean,false) then profile.phone else '' end,
      'sharePhone',coalesce((p_service->>'sharePhone')::boolean,false),'neighborhood',location.name,'districtUbigeo',location.district_ubigeo,
      'addressApprox',left(coalesce(p_service->>'addressApprox','Barrio '||location.name),160),'description',trim(p_service->>'description'),
      'avalesCount',0,'avalesUserIds','[]'::jsonb,'isVerified',false,'avatarUrl','','isHidden',false);
    insert into public.local_services(id,author_id,neighborhood_id,district_ubigeo,content)
    values(service_id,caller,location.id,location.district_ubigeo,safe_content);
  end if;
  insert into public.sync_operations(idempotency_key,user_id,operation_type,result_id) values(p_operation_id,caller,'service_post',service_id);
  return service_id;
end;
$$;

create or replace function public.sync_service_endorsement(p_operation_id uuid,p_service_id uuid,p_active boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare caller uuid := (select auth.uid()); target public.local_services%rowtype; profile public.profiles%rowtype; prior public.sync_operations%rowtype;
begin
  if caller is null then raise exception 'Inicia sesión para avalar.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_service_id::text||':'||caller::text,0));
  select * into prior from public.sync_operations where idempotency_key=p_operation_id;
  if found then
    if prior.user_id<>caller or prior.operation_type<>'aval' or prior.result_id<>p_service_id then raise exception 'La operación ya se usó para otro aval.'; end if;
    return p_service_id;
  end if;
  select * into target from public.local_services where id=p_service_id and not deleted;
  select * into profile from public.profiles where id=caller;
  if target.id is null or profile.neighborhood_id is null then raise exception 'Servicio o perfil no disponible.'; end if;
  if target.author_id=caller then raise exception 'No puedes avalar tu propio servicio.'; end if;
  if target.neighborhood_id<>profile.neighborhood_id or not exists(select 1 from public.community_memberships where user_id=caller and neighborhood_id=target.neighborhood_id) then raise exception 'Solo puedes avalar servicios de tu barrio.'; end if;
  if p_active then insert into public.service_endorsements(service_id,user_id) values(p_service_id,caller) on conflict do nothing;
  else delete from public.service_endorsements where service_id=p_service_id and user_id=caller; end if;
  insert into public.sync_operations(idempotency_key,user_id,operation_type,result_id) values(p_operation_id,caller,'aval',p_service_id);
  return p_service_id;
end;
$$;

create or replace function public.save_critical_resource(p_id uuid,p_content jsonb,p_quantity numeric,p_unit text,p_version integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare caller uuid := (select auth.uid()); profile public.profiles%rowtype; location public.neighborhoods%rowtype; prior public.critical_resources%rowtype;
begin
  if caller is null then raise exception 'Inicia sesión para publicar recursos.'; end if;
  if p_quantity is null or p_quantity<=0 or coalesce(char_length(trim(p_unit)),0)>40 then raise exception 'Cantidad o unidad inválida.'; end if;
  select * into profile from public.profiles where id=caller; select * into location from public.neighborhoods where id=profile.neighborhood_id;
  if location.id is null or not exists(select 1 from public.community_memberships where user_id=caller and neighborhood_id=location.id) then raise exception 'Completa tu barrio antes de publicar recursos.'; end if;
  if not exists(select 1 from public.community_memberships where user_id=caller and neighborhood_id=location.id and role in ('coordinador','admin')) then raise exception 'Solo coordinadores pueden administrar recursos.'; end if;
  select * into prior from public.critical_resources where id=p_id;
  if found then
    if prior.created_by<>caller then raise exception 'No tienes permiso para editar este recurso.'; end if;
    if prior.version=1 and p_version=0 and prior.content=p_content and prior.quantity=p_quantity and prior.unit=coalesce(nullif(trim(p_unit),''),'unidades') then return p_id; end if;
    if prior.version<>p_version then raise exception 'El recurso cambió; actualiza e inténtalo de nuevo.'; end if;
    update public.critical_resources set content=p_content,quantity=p_quantity,unit=coalesce(nullif(trim(p_unit),''),'unidades'),version=version+1,updated_at=now() where id=p_id;
  else
    if p_version<>0 then raise exception 'El recurso ya no existe; actualiza e inténtalo de nuevo.'; end if;
    insert into public.critical_resources(id,neighborhood_id,content,quantity,unit,created_by) values(p_id,location.id,p_content,p_quantity,coalesce(nullif(trim(p_unit),''),'unidades'),caller);
  end if;
  return p_id;
end;
$$;

create or replace function public.set_emergency_mode(p_neighborhood_id uuid,p_active boolean,p_type text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_community_role(p_neighborhood_id,array['coordinador','admin']::public.app_role[]) then raise exception 'Solo coordinadores pueden activar emergencias.'; end if;
  insert into public.emergency_modes(neighborhood_id,active,emergency_type,activated_by,updated_at)
  values(p_neighborhood_id,p_active,case when p_active then left(coalesce(p_type,''),120) else '' end,case when p_active then (select auth.uid()) else null end,now())
  on conflict(neighborhood_id) do update set active=excluded.active,emergency_type=excluded.emergency_type,activated_by=excluded.activated_by,updated_at=now();
end;
$$;

create or replace function public.update_emergency_status(p_report_id uuid,p_status text,p_brigade text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare target public.emergency_reports%rowtype;
begin
  if p_status not in ('pendiente','atencion','resuelto','cerrado') then raise exception 'Estado inválido.'; end if;
  select * into target from public.emergency_reports where id=p_report_id;
  if target.id is null or not public.has_community_role(target.neighborhood_id,array['coordinador','admin']::public.app_role[]) then raise exception 'No tienes permiso para actualizar este reporte.'; end if;
  update public.emergency_reports set status=p_status::public.emergency_status,assigned_brigade=left(nullif(trim(p_brigade),''),120),updated_at=now() where id=p_report_id;
end;
$$;

create or replace function public.read_emergency_private(p_report_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  select jsonb_build_object('beneficiary_name',private.beneficiary_name,'beneficiary_age',private.beneficiary_age,'exact_address',private.exact_address,'contact_phone',private.contact_phone)
  into result from public.emergency_report_private private join public.emergency_reports report on report.id=private.report_id
  where report.id=p_report_id and public.has_community_role(report.neighborhood_id,array['coordinador','admin']::public.app_role[]);
  if result is null then raise exception 'No tienes permiso para consultar los datos privados.'; end if;
  return result;
end;
$$;

create or replace function public.report_content(p_id uuid,p_item_id uuid,p_item_type text,p_reason text,p_details text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare caller uuid := (select auth.uid()); target_neighborhood uuid; target_district text;
begin
  if caller is null then raise exception 'Inicia sesión para denunciar contenido.'; end if;
  if p_item_type='favor' then select neighborhood_id,district_ubigeo into target_neighborhood,target_district from public.community_favors where id=p_item_id and not deleted;
  elsif p_item_type='service' then select neighborhood_id,district_ubigeo into target_neighborhood,target_district from public.local_services where id=p_item_id and not deleted;
  elsif p_item_type='emergency_report' then select r.neighborhood_id,n.district_ubigeo into target_neighborhood,target_district from public.emergency_reports r join public.neighborhoods n on n.id=r.neighborhood_id where r.id=p_item_id;
  else raise exception 'Tipo de contenido inválido.'; end if;
  if target_neighborhood is null or (target_district is not null and not exists(select 1 from public.community_memberships m join public.neighborhoods n on n.id=m.neighborhood_id where m.user_id=caller and n.district_ubigeo=target_district)) then raise exception 'No puedes denunciar este contenido desde tu distrito.'; end if;
  if char_length(trim(coalesce(p_reason,''))) not between 1 and 160 or char_length(coalesce(p_details,''))>2000 then raise exception 'Revisa el motivo de la denuncia.'; end if;
  insert into public.content_reports(id,item_id,item_type,neighborhood_id,reported_by,reason,details) values(p_id,p_item_id,p_item_type,target_neighborhood,caller,trim(p_reason),coalesce(p_details,''));
  return p_id;
end;
$$;

create or replace function public.moderate_content(p_item_id uuid,p_item_type text,p_hidden boolean,p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare target_neighborhood uuid;
begin
  if p_item_type='favor' then
    select neighborhood_id into target_neighborhood from public.community_favors where id=p_item_id;
    if target_neighborhood is null or not public.has_community_role(target_neighborhood,array['coordinador','admin']::public.app_role[]) then raise exception 'No tienes permiso para moderar este favor.'; end if;
    update public.community_favors set content=content||jsonb_build_object('isHidden',p_hidden) where id=p_item_id;
  elsif p_item_type='service' then
    select neighborhood_id into target_neighborhood from public.local_services where id=p_item_id;
    if target_neighborhood is null or not public.has_community_role(target_neighborhood,array['coordinador','admin']::public.app_role[]) then raise exception 'No tienes permiso para moderar este servicio.'; end if;
    update public.local_services set hidden=p_hidden,updated_at=now() where id=p_item_id;
  elsif p_item_type='emergency_report' then
    select neighborhood_id into target_neighborhood from public.emergency_reports where id=p_item_id;
    if target_neighborhood is null or not public.has_community_role(target_neighborhood,array['coordinador','admin']::public.app_role[]) then raise exception 'No tienes permiso para moderar este reporte.'; end if;
    update public.emergency_reports set hidden=p_hidden,updated_at=now() where id=p_item_id;
  else raise exception 'Tipo de contenido inválido.'; end if;
  insert into public.content_moderation_events(item_id,item_type,neighborhood_id,moderator_id,hidden,reason)
  values(p_item_id,p_item_type,target_neighborhood,(select auth.uid()),p_hidden,left(coalesce(nullif(trim(p_reason),''),'Revisión de denuncia vecinal'),500));
  update public.content_reports set status=case when p_hidden then 'hidden' else 'reviewed' end
  where item_id=p_item_id and item_type=p_item_type and neighborhood_id=target_neighborhood;
end;
$$;

revoke all on function public.sync_local_service(uuid,jsonb,text),public.sync_service_endorsement(uuid,uuid,boolean),
  public.save_critical_resource(uuid,jsonb,numeric,text,integer),public.set_emergency_mode(uuid,boolean,text),
  public.update_emergency_status(uuid,text,text),public.read_emergency_private(uuid),public.report_content(uuid,uuid,text,text,text),
  public.moderate_content(uuid,text,boolean,text) from public,anon;
grant execute on function public.sync_local_service(uuid,jsonb,text),public.sync_service_endorsement(uuid,uuid,boolean),
  public.save_critical_resource(uuid,jsonb,numeric,text,integer),public.set_emergency_mode(uuid,boolean,text),
  public.update_emergency_status(uuid,text,text),public.read_emergency_private(uuid),public.report_content(uuid,uuid,text,text,text),
  public.moderate_content(uuid,text,boolean,text) to authenticated;
