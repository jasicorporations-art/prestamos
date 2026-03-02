-- Forzar que los perfiles siempre tengan app_id y que coincida con auth.users
-- Evita que futuros usuarios entren a la PWA incorrecta.

begin;

create or replace function public.enforce_perfil_app_id()
returns trigger
language plpgsql
security definer
as $$
declare
  auth_app_id text;
begin
  select (raw_user_meta_data->>'app_id')
    into auth_app_id
  from auth.users
  where id = new.user_id;

  if new.app_id is null or new.app_id = '' then
    new.app_id := auth_app_id;
  end if;

  if new.app_id is null or new.app_id = '' then
    raise exception 'app_id requerido para crear perfil';
  end if;

  if auth_app_id is not null and auth_app_id <> '' and new.app_id <> auth_app_id then
    raise exception 'app_id no coincide con auth.users';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_perfil_app_id on public.perfiles;
create trigger trg_enforce_perfil_app_id
before insert or update of app_id, user_id
on public.perfiles
for each row
execute function public.enforce_perfil_app_id();

commit;
