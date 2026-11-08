-- Initial neighborhood catalog and authenticated profile bootstrap.
-- Self-service signup always receives the least-privileged role: vecino.

insert into public.neighborhoods (name, district, region)
values
  ('San Blas (Sector Central)', 'Cusco', 'Cusco'),
  ('San Cristóbal', 'Cusco', 'Cusco'),
  ('Santa Ana', 'Cusco', 'Cusco'),
  ('Lucrepata', 'Cusco', 'Cusco'),
  ('Tandapata', 'Cusco', 'Cusco'),
  ('Wanchaq Norte', 'Cusco', 'Cusco')
on conflict (name, district, region) do nothing;

alter table public.profiles
  add constraint profiles_phone_peru_mobile_check
  check (phone is null or phone ~ '^[+]519[0-9]{8}$');

create or replace function public.complete_community_profile(
  p_nickname text,
  p_phone text,
  p_neighborhood_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_neighborhood_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;
  if char_length(trim(coalesce(p_nickname, ''))) not between 1 and 80 then
    raise exception 'Nickname must contain between 1 and 80 characters';
  end if;
  if coalesce(p_phone, '') !~ '^[+]519[0-9]{8}$' then
    raise exception 'A valid Peru mobile phone is required';
  end if;

  select neighborhood.id into target_neighborhood_id
  from public.neighborhoods as neighborhood
  where neighborhood.name = trim(p_neighborhood_name)
  limit 1;

  if target_neighborhood_id is null then
    raise exception 'Selected neighborhood is not available';
  end if;

  insert into public.profiles (id, nickname, phone, neighborhood_id)
  values (caller_id, trim(p_nickname), p_phone, target_neighborhood_id)
  on conflict (id) do update set
    nickname = excluded.nickname,
    phone = excluded.phone,
    neighborhood_id = excluded.neighborhood_id,
    updated_at = now();

  -- Changing neighborhoods must not retain coordinator/admin membership in the old one.
  delete from public.community_memberships
  where user_id = caller_id and neighborhood_id <> target_neighborhood_id;

  insert into public.community_memberships (user_id, neighborhood_id, role)
  values (caller_id, target_neighborhood_id, 'vecino')
  on conflict (user_id, neighborhood_id) do nothing;
end;
$$;

revoke all on function public.complete_community_profile(text, text, text) from public, anon;
grant execute on function public.complete_community_profile(text, text, text) to authenticated;
