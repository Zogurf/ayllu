-- Replace the exact RPC signature to reconcile older return types/argument names.
-- No CASCADE: unexpected dependent objects stop this migration rather than being deleted.
-- Resource rows remain intact. Supabase applies this migration transactionally.
drop function if exists public.save_critical_resource(uuid,jsonb,numeric,text,integer);

-- Serialize resource edits so concurrent updates cannot both accept the same version.
create or replace function public.save_critical_resource(p_id uuid,p_content jsonb,p_quantity numeric,p_unit text,p_version integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare caller uuid := (select auth.uid()); profile public.profiles%rowtype; location public.neighborhoods%rowtype; prior public.critical_resources%rowtype;
begin
  if caller is null then raise exception 'Inicia sesión para publicar recursos.'; end if;
  if p_quantity is null or p_quantity<=0 or coalesce(char_length(trim(p_unit)),0)>40 then raise exception 'Cantidad o unidad inválida.'; end if;
  select * into profile from public.profiles where id=caller; select * into location from public.neighborhoods where id=profile.neighborhood_id;
  if location.id is null or not exists(select 1 from public.community_memberships where user_id=caller and neighborhood_id=location.id) then raise exception 'Completa tu barrio antes de publicar recursos.'; end if;
  if not exists(select 1 from public.community_memberships where user_id=caller and neighborhood_id=location.id and role in ('coordinador','admin')) then raise exception 'Solo coordinadores pueden administrar recursos.'; end if;
  select * into prior from public.critical_resources where id=p_id for update;
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


-- A recreated SECURITY DEFINER function must not retain the default PUBLIC execute grant.
revoke all on function public.save_critical_resource(uuid,jsonb,numeric,text,integer) from public,anon;
grant execute on function public.save_critical_resource(uuid,jsonb,numeric,text,integer) to authenticated;
notify pgrst, 'reload schema';
