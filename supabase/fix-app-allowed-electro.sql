-- Forzar aislamiento de usuarios de Electro
-- Ajusta app_id y app_allowed SOLO para empresas ya identificadas como Electro.
-- Cambia 'electro' si tu APP_ID es distinto.

begin;

-- 1) Detectar empresas ya marcadas como electro
with empresas_electro as (
  select distinct empresa_id
  from perfiles
  where app_id = 'electro'
    and empresa_id is not null
)
-- 2) Completar app_id faltante en perfiles (solo electro)
update perfiles p
set app_id = 'electro'
from empresas_electro e
where p.empresa_id = e.empresa_id
  and (p.app_id is null or p.app_id = '');

-- 3) Forzar metadata en auth.users para los mismos usuarios
-- app_id en metadata
with empresas_electro as (
  select distinct empresa_id
  from perfiles
  where app_id = 'electro'
    and empresa_id is not null
)
update auth.users u
set raw_user_meta_data = jsonb_set(
  coalesce(u.raw_user_meta_data, '{}'::jsonb),
  '{app_id}',
  to_jsonb('electro'::text),
  true
)
from perfiles p
join empresas_electro e on e.empresa_id = p.empresa_id
where u.id = p.user_id;

-- app_allowed en metadata (solo ELECTRO)
with empresas_electro as (
  select distinct empresa_id
  from perfiles
  where app_id = 'electro'
    and empresa_id is not null
)
update auth.users u
set raw_user_meta_data = jsonb_set(
  coalesce(u.raw_user_meta_data, '{}'::jsonb),
  '{app_allowed}',
  to_jsonb('ELECTRO'::text),
  true
)
from perfiles p
join empresas_electro e on e.empresa_id = p.empresa_id
where u.id = p.user_id;

commit;
