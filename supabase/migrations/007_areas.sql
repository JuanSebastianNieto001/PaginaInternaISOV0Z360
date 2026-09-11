-- =============================================================================
-- ISO DMS · 007 · Áreas responsables
-- -----------------------------------------------------------------------------
-- Nueva dimensión de clasificación: el área o cargo dueño del documento
-- (CEO, Contabilidad, Líder ISO, Formación…).
--
-- Es global a propósito, no cuelga de una norma. Las categorías existentes
-- pertenecen a una norma concreta (`categories.standard_id`), así que usarlas
-- para esto obligaría a repetir cada área en las tres normas. Un documento de
-- Contabilidad puede ser de ISO 9001 o de ISO 27001 y el área no cambia.
--
-- El campo es opcional en `documents` para no invalidar lo ya cargado.
-- =============================================================================

create table if not exists public.areas (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  description text,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint areas_name_length check (char_length(name) between 2 and 120)
);

drop trigger if exists areas_set_updated_at on public.areas;
create trigger areas_set_updated_at
  before update on public.areas
  for each row execute function public.set_updated_at();

alter table public.documents
  add column if not exists area_id uuid references public.areas(id) on delete set null;

create index if not exists documents_area_idx on public.documents(area_id);

-- -----------------------------------------------------------------------------
-- Permisos de esquema (el grant masivo de 001 no alcanza a tablas nuevas)
-- -----------------------------------------------------------------------------
grant all on table public.areas to service_role;
grant select, insert, update, delete on table public.areas to authenticated;
revoke all on table public.areas from anon;

-- -----------------------------------------------------------------------------
-- RLS: la lectura basta con tener sesión activa; escribir exige categories.manage
-- (el mismo permiso que gobierna categorías, tipos y etiquetas).
-- -----------------------------------------------------------------------------
alter table public.areas enable row level security;

drop policy if exists areas_select on public.areas;
create policy areas_select on public.areas
  for select to authenticated
  using (public.is_active_user());

drop policy if exists areas_write on public.areas;
create policy areas_write on public.areas
  for all to authenticated
  using (public.has_permission('categories.manage'))
  with check (public.has_permission('categories.manage'));

-- -----------------------------------------------------------------------------
-- Auditoría
-- -----------------------------------------------------------------------------
drop trigger if exists areas_audit on public.areas;
create trigger areas_audit
  after insert or update or delete on public.areas
  for each row execute function public.audit_row_change('area');

-- -----------------------------------------------------------------------------
-- Búsqueda: el nombre del área pasa a formar parte del vector del documento,
-- igual que la norma, la categoría o el tipo.
-- -----------------------------------------------------------------------------
create or replace function public.build_document_search_vector(p_doc public.documents)
returns tsvector
language sql
stable
set search_path = public
as $$
  select
    setweight(to_tsvector('public.spanish_unaccent', coalesce(p_doc.code, '')), 'A') ||
    setweight(to_tsvector('public.spanish_unaccent', coalesce(p_doc.name, '')), 'A') ||
    setweight(to_tsvector('public.spanish_unaccent', coalesce(p_doc.description, '')), 'C') ||
    setweight(to_tsvector('public.spanish_unaccent', coalesce(p_doc.version, '')), 'D') ||
    setweight(to_tsvector('public.spanish_unaccent', coalesce(p_doc.status::text, '')), 'D') ||
    setweight(to_tsvector('public.spanish_unaccent', coalesce(p_doc.file_name, '')), 'D') ||
    setweight(to_tsvector('public.spanish_unaccent',
      coalesce((select s.code || ' ' || s.name from public.standards s where s.id = p_doc.standard_id), '')), 'B') ||
    setweight(to_tsvector('public.spanish_unaccent',
      coalesce((select c.name from public.categories c where c.id = p_doc.category_id), '')), 'B') ||
    setweight(to_tsvector('public.spanish_unaccent',
      coalesce((select sc.name from public.subcategories sc where sc.id = p_doc.subcategory_id), '')), 'B') ||
    setweight(to_tsvector('public.spanish_unaccent',
      coalesce((select dt.name from public.document_types dt where dt.id = p_doc.document_type_id), '')), 'B') ||
    setweight(to_tsvector('public.spanish_unaccent',
      coalesce((select a.name from public.areas a where a.id = p_doc.area_id), '')), 'B') ||
    setweight(to_tsvector('public.spanish_unaccent',
      coalesce((select string_agg(t.name, ' ') from public.document_tags dtg join public.tags t on t.id = dtg.tag_id where dtg.document_id = p_doc.id), '')), 'B')
$$;

drop trigger if exists documents_search_vector on public.documents;
create trigger documents_search_vector
  before insert or update of code, name, description, version, status, file_name,
    standard_id, category_id, subcategory_id, document_type_id, area_id
  on public.documents
  for each row execute function public.documents_search_vector_trigger();

-- Renombrar un área refresca el vector de sus documentos.
create or replace function public.areas_search_refresh()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.name is distinct from old.name then
    update public.documents d
    set search_vector = public.build_document_search_vector(d)
    where d.area_id = new.id;
  end if;
  return null;
end;
$$;

drop trigger if exists areas_search_refresh on public.areas;
create trigger areas_search_refresh
  after update on public.areas
  for each row execute function public.areas_search_refresh();

-- -----------------------------------------------------------------------------
-- Conteo de documentos por área (para el dashboard)
-- -----------------------------------------------------------------------------
create or replace function public.get_area_counts()
returns table (area_id uuid, total bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select d.area_id, count(*)::bigint
  from public.documents d
  where d.area_id is not null
  group by d.area_id;
$$;

revoke all on function public.get_area_counts() from public;
grant execute on function public.get_area_counts() to authenticated;

-- -----------------------------------------------------------------------------
-- Áreas de VOZ360 (organigrama de la documentación interna)
-- -----------------------------------------------------------------------------
insert into public.areas (code, name, sort_order) values
  ('CEO',                 'CEO',                    10),
  ('GERENTE',             'Gerente',                20),
  ('DIRECTOR',            'Director',               30),
  ('CONTABILIDAD',        'Contabilidad',           40),
  ('LIDER_ISO',           'Líder ISO',              50),
  ('GERENTE_OPERACIONES', 'Gerente de Operaciones', 60),
  ('LIDER_TI',            'Líder TI',               70),
  ('GERENTE_TALENTO',     'Gerente de Talento',     80),
  ('VALIDACION_BO',       'Validación BO',          90),
  ('DATA_MARSHALL',       'Data Marshall',         100),
  ('TEAM_LEADER',         'Team Leader',           110),
  ('COORDINADOR_CX',      'Coordinador CX',        120),
  ('ANALISTA_CALIDAD',    'Analista de Calidad',   130),
  ('FORMACION',           'Formación',             140),
  ('SOPORTE_TECNICO',     'Soporte Técnico',       150),
  ('COORDINADOR_SST',     'Coordinador SST',       160),
  ('SERVICIOS_GENERALES', 'Servicios Generales',   170)
on conflict (code) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;
