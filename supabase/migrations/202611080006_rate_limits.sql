-- Límites de publicación por cuenta. Los reintentos de una fila ya existente
-- (upsert idempotente de la cola offline) no cuentan.
create or replace function public.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_col text := tg_argv[0];
  v_max       integer := tg_argv[1]::integer;
  v_window    interval := (tg_argv[2] || ' minutes')::interval;
  v_owner     uuid := (to_jsonb(new) ->> tg_argv[0])::uuid;
  v_exists    boolean;
  v_recent    integer;
begin
  execute format('select exists (select 1 from %I.%I where id = $1)', tg_table_schema, tg_table_name)
    into v_exists using new.id;
  if v_exists then
    return new;
  end if;

  execute format('select count(*) from %I.%I where %I = $1 and created_at > now() - $2',
                 tg_table_schema, tg_table_name, v_owner_col)
    into v_recent using v_owner, v_window;

  if v_recent >= v_max then
    -- 53400 no está en la lista de errores permanentes del cliente: se reintenta con espera.
    raise exception 'Límite alcanzado. Espera un momento antes de volver a enviar.'
      using errcode = '53400';
  end if;
  return new;
end;
$$;

create index if not exists community_favors_author_created_idx on public.community_favors (author_id, created_at desc);
create index if not exists local_services_author_created_idx on public.local_services (author_id, created_at desc);
create index if not exists content_reports_reporter_created_idx on public.content_reports (reported_by, created_at desc);
create index if not exists messages_sender_created_idx on public.messages (sender_id, created_at desc);
create index if not exists emergency_reports_creator_created_idx on public.emergency_reports (created_by, created_at desc);

-- Argumentos: columna del autor, máximo, ventana en minutos.
create trigger community_favors_rate_limit before insert on public.community_favors
  for each row execute function public.enforce_rate_limit('author_id', '10', '60');
create trigger local_services_rate_limit before insert on public.local_services
  for each row execute function public.enforce_rate_limit('author_id', '5', '60');
create trigger content_reports_rate_limit before insert on public.content_reports
  for each row execute function public.enforce_rate_limit('reported_by', '20', '60');
create trigger messages_rate_limit before insert on public.messages
  for each row execute function public.enforce_rate_limit('sender_id', '60', '10');
create trigger emergency_reports_rate_limit before insert on public.emergency_reports
  for each row execute function public.enforce_rate_limit('created_by', '10', '60');
