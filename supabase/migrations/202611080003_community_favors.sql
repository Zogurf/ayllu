-- Shared favors: authenticated district feed, owner-only writes via idempotent RPC.
create table public.community_favors (
  id uuid primary key,
  author_id uuid not null references auth.users(id) on delete cascade,
  neighborhood_id uuid not null references public.neighborhoods(id),
  district_ubigeo text not null references public.peru_districts(ubigeo),
  content jsonb not null,
  status text not null check (status in ('disponible', 'resuelta', 'cerrada')),
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);
create index community_favors_district_created on public.community_favors(district_ubigeo, created_at desc);
alter table public.community_favors enable row level security;
revoke all on public.community_favors from anon, authenticated;
grant select on public.community_favors to authenticated;
create policy "district members read favors" on public.community_favors for select to authenticated
using (exists (
  select 1 from public.community_memberships m join public.neighborhoods n on n.id = m.neighborhood_id
  where m.user_id = (select auth.uid()) and n.district_ubigeo = community_favors.district_ubigeo
));

create function public.sync_community_favor(p_operation_id uuid, p_favor jsonb, p_action text default 'save')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  favor_id uuid := (p_favor->>'id')::uuid;
  existing public.community_favors%rowtype;
  profile public.profiles%rowtype;
  location public.neighborhoods%rowtype;
  prior public.sync_operations%rowtype;
  safe_content jsonb;
begin
  if caller is null then raise exception 'Inicia sesión para publicar.'; end if;
  -- Serialize retries and edits of the same favor, including creation.
  perform pg_advisory_xact_lock(hashtextextended(favor_id::text, 0));
  select * into prior from public.sync_operations where idempotency_key = p_operation_id;
  if found then
    if prior.user_id <> caller or prior.operation_type <> 'favor' or prior.result_id <> favor_id then
      raise exception 'Operación inválida.';
    end if;
    return favor_id;
  end if;
  select * into existing from public.community_favors where id = favor_id;
  if found then
    if existing.author_id <> caller then raise exception 'Solo el autor puede modificar el favor.'; end if;
    if p_action = 'delete' then
      update public.community_favors set deleted = true where id = favor_id;
    elsif p_action = 'save' and not existing.deleted then
      if p_favor->>'status' not in ('disponible','resuelta','cerrada') or p_favor->>'status' is null then
        raise exception 'Estado inválido.';
      end if;
      update public.community_favors set status = p_favor->>'status' where id = favor_id;
    else raise exception 'Esta publicación fue retirada.';
    end if;
  else
    if p_action <> 'save' then raise exception 'Favor inexistente.'; end if;
    select * into profile from public.profiles where id = caller;
    select * into location from public.neighborhoods where id = profile.neighborhood_id;
    if location.district_ubigeo is null or not exists (
      select 1 from public.community_memberships where user_id = caller and neighborhood_id = location.id
    ) then raise exception 'Completa tu perfil y barrio antes de publicar.'; end if;
    if p_favor->>'districtUbigeo' is distinct from location.district_ubigeo or
       p_favor->>'neighborhood' is distinct from location.name then
      raise exception 'El barrio del borrador no coincide con tu perfil actual.';
    end if;
    if coalesce(char_length(trim(p_favor->>'title')),0) not between 1 and 160
       or coalesce(char_length(p_favor->>'description'),0) not between 1 and 500
       or coalesce(p_favor->>'category','') not in ('herramientas','acompanamiento','cuidado','donacion','movilidad','habilidades')
       or coalesce(p_favor->>'mode','') not in ('ofrezco','solicito')
       or coalesce(p_favor->>'contactChannel','') not in ('ayllu','whatsapp')
       or coalesce(p_favor->>'status','') not in ('disponible','resuelta','cerrada')
       or coalesce(char_length(p_favor->>'durationInfo'),0) not between 1 and 100 then
      raise exception 'Revisa los datos del favor.';
    end if;
    safe_content := jsonb_build_object(
      'title',trim(p_favor->>'title'), 'description',p_favor->>'description',
      'category',p_favor->>'category', 'categoryLabel',left(p_favor->>'categoryLabel',80),
      'mode',p_favor->>'mode', 'durationInfo',p_favor->>'durationInfo',
      'contactChannel',p_favor->>'contactChannel', 'isUrgent',coalesce((p_favor->>'isUrgent')::boolean,false),
      'authorName',profile.nickname, 'authorPhone',case when p_favor->>'contactChannel' = 'whatsapp' then profile.phone else '' end,
      'neighborhood',location.name, 'districtUbigeo',location.district_ubigeo,
      'authorAvatar','', 'distanceMeters',0);
    insert into public.community_favors(id,author_id,neighborhood_id,district_ubigeo,content,status)
    values(favor_id,caller,location.id,location.district_ubigeo,safe_content,p_favor->>'status');
  end if;
  insert into public.sync_operations(idempotency_key,user_id,operation_type,result_id)
  values(p_operation_id,caller,'favor',favor_id);
  return favor_id;
end;
$$;
revoke all on function public.sync_community_favor(uuid,jsonb,text) from public, anon;
grant execute on function public.sync_community_favor(uuid,jsonb,text) to authenticated;
