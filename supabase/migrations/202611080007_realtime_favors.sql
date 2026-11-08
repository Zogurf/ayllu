-- Publica community_favors en Realtime para que el muro se actualice al instante.
-- RLS sigue aplicando: cada cuenta solo recibe cambios de filas que puede leer.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'community_favors') then
    alter publication supabase_realtime add table public.community_favors;
  end if;
end
$$;
