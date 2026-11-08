-- Preserve existing neighborhood/profile UUIDs while adding nationwide location identity.
alter table public.neighborhoods
  add column district_ubigeo text references public.peru_districts(ubigeo),
  add column province text;

-- Previous releases only shipped the district of Cusco.
update public.neighborhoods set district_ubigeo = '080101', province = 'CUSCO'
where lower(district) = 'cusco' and lower(region) = 'cusco';

alter table public.neighborhoods drop constraint neighborhoods_name_district_region_key;
create unique index neighborhoods_ubigeo_name_key
  on public.neighborhoods (district_ubigeo, lower(name)) where district_ubigeo is not null;
create unique index neighborhoods_legacy_name_key
  on public.neighborhoods (name, district, region) where district_ubigeo is null;

create or replace function public.complete_community_profile_v2(
  p_nickname text,
  p_phone text,
  p_neighborhood_name text,
  p_district_ubigeo text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_neighborhood_id uuid;
  target_name text := regexp_replace(trim(coalesce(p_neighborhood_name, '')), '\s+', ' ', 'g');
  saved_name text;
  location public.peru_districts%rowtype;
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  if char_length(trim(coalesce(p_nickname, ''))) not between 1 and 80 then
    raise exception 'Nickname must contain between 1 and 80 characters';
  end if;
  if coalesce(p_phone, '') !~ '^[+]519[0-9]{8}$' then
    raise exception 'A valid Peru mobile phone is required';
  end if;
  if char_length(target_name) not between 1 and 120 then
    raise exception 'Neighborhood must contain between 1 and 120 characters';
  end if;
  select * into location from public.peru_districts where ubigeo = p_district_ubigeo;
  if not found then raise exception 'Invalid district ubigeo'; end if;

  -- Serialize profile changes for this account, including membership removal.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller_id::text, 0));
  insert into public.neighborhoods (name, district, region, province, district_ubigeo)
  values (target_name, location.district, location.department, location.province, location.ubigeo)
  on conflict (district_ubigeo, lower(name)) where district_ubigeo is not null
  do update set name = public.neighborhoods.name
  returning id, name into target_neighborhood_id, saved_name;

  insert into public.profiles (id, nickname, phone, neighborhood_id)
  values (caller_id, trim(p_nickname), p_phone, target_neighborhood_id)
  on conflict (id) do update set nickname = excluded.nickname, phone = excluded.phone,
    neighborhood_id = excluded.neighborhood_id, updated_at = now();

  delete from public.community_memberships
    where user_id = caller_id and neighborhood_id <> target_neighborhood_id;
  insert into public.community_memberships (user_id, neighborhood_id, role)
  values (caller_id, target_neighborhood_id, 'vecino')
  on conflict (user_id, neighborhood_id) do nothing;

  return jsonb_build_object('neighborhood_id', target_neighborhood_id, 'neighborhood_name', saved_name);
end;
$$;
revoke all on function public.complete_community_profile_v2(text, text, text, text) from public, anon;
grant execute on function public.complete_community_profile_v2(text, text, text, text) to authenticated;

-- Older clients can edit their current neighborhood or select a legacy Cusco barrio.
-- Never choose an arbitrary national match using LIMIT 1 and a barrio name alone.
create or replace function public.complete_community_profile(
  p_nickname text, p_phone text, p_neighborhood_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  code text;
begin
  select n.district_ubigeo into code from public.profiles p
    join public.neighborhoods n on n.id = p.neighborhood_id
    where p.id = (select auth.uid()) and n.name = trim(p_neighborhood_name);
  if code is null then
    select n.district_ubigeo into code from public.neighborhoods n
    where n.district_ubigeo = '080101' and n.name = trim(p_neighborhood_name);
  end if;
  if code is null then raise exception 'Select a district using the updated app'; end if;
  perform public.complete_community_profile_v2(p_nickname, p_phone, p_neighborhood_name, code);
end;
$$;
revoke all on function public.complete_community_profile(text, text, text) from public, anon;
grant execute on function public.complete_community_profile(text, text, text) to authenticated;
