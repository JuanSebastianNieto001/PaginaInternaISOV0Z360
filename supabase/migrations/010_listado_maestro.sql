-- =============================================================================
-- ISO DMS · 010 · Listado maestro del SGI
-- -----------------------------------------------------------------------------
-- Alinea el repositorio con Listado_Maestro_Documentos_SGI_ISO.xlsx, que es el
-- control de información documentada que ya usa VOZ360. De ese libro salen:
--
--   · Norma aplicable  → un documento puede aplicar a una, a dos o a las tres
--                        normas ("SGI (9001 + 45001 + 27001)"), así que deja de
--                        ser un campo único y pasa a ser una relación N:N.
--   · Proceso / Área   → nueve procesos del SGI (ADM, MKT, OPE, FIN, RRHH,
--                        SINF, SGI, LEG, AUD). Convive con las áreas del
--                        organigrama, que responden a otra pregunta: los
--                        procesos dicen de qué trata el documento y las áreas
--                        qué cargo lo custodia.
--   · Clasificación    → Pública, Uso Interno, Confidencial y Restringida, el
--                        control de clasificación de la información de 27001.
--   · Retención        → cuánto tiempo se conserva el documento.
--   · Tipo             → los nueve tipos del libro, con su abreviatura.
--
-- `documents.standard_id` se conserva como norma principal: sigue gobernando el
-- capítulo (`category_id`) y el vector de búsqueda, y siempre está incluido en
-- el conjunto de `document_standards`. Así ninguna consulta existente se rompe.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Normas aplicables (N:N)
-- -----------------------------------------------------------------------------
create table if not exists public.document_standards (
  document_id uuid not null references public.documents(id) on delete cascade,
  standard_id uuid not null references public.standards(id) on delete restrict,
  created_at  timestamptz not null default now(),
  primary key (document_id, standard_id)
);

create index if not exists document_standards_standard_idx
  on public.document_standards(standard_id);

grant all on table public.document_standards to service_role;
grant select, insert, update, delete on table public.document_standards to authenticated;
revoke all on table public.document_standards from anon;

alter table public.document_standards enable row level security;

-- Mismas reglas que document_tags: leer exige documents.read y escribir,
-- documents.create o documents.update.
drop policy if exists document_standards_select on public.document_standards;
create policy document_standards_select on public.document_standards
  for select to authenticated
  using (public.has_permission('documents.read'));

drop policy if exists document_standards_write on public.document_standards;
create policy document_standards_write on public.document_standards
  for all to authenticated
  using (public.has_permission('documents.update') or public.has_permission('documents.create'))
  with check (public.has_permission('documents.update') or public.has_permission('documents.create'));

-- Lo ya cargado pasa a tener su norma principal también en la relación.
insert into public.document_standards (document_id, standard_id)
select d.id, d.standard_id
from public.documents d
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 2. Procesos del SGI
-- -----------------------------------------------------------------------------
create table if not exists public.processes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  description text,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint processes_name_length check (char_length(name) between 2 and 120)
);

drop trigger if exists processes_set_updated_at on public.processes;
create trigger processes_set_updated_at
  before update on public.processes
  for each row execute function public.set_updated_at();

alter table public.documents
  add column if not exists process_id uuid references public.processes(id) on delete set null;

create index if not exists documents_process_idx on public.documents(process_id);

grant all on table public.processes to service_role;
grant select, insert, update, delete on table public.processes to authenticated;
revoke all on table public.processes from anon;

alter table public.processes enable row level security;

drop policy if exists processes_select on public.processes;
create policy processes_select on public.processes
  for select to authenticated
  using (public.is_active_user());

drop policy if exists processes_write on public.processes;
create policy processes_write on public.processes
  for all to authenticated
  using (public.has_permission('categories.manage'))
  with check (public.has_permission('categories.manage'));

drop trigger if exists processes_audit on public.processes;
create trigger processes_audit
  after insert or update or delete on public.processes
  for each row execute function public.audit_row_change('process');

insert into public.processes (code, name, description, sort_order) values
  ('ADM',  'ADM: Administración y Gerencia',        'Dirección, planeación estratégica y gobierno del SGI.', 10),
  ('MKT',  'MKT: Marketing y Ventas',               'Comercial, mercadeo y relación con el cliente.', 20),
  ('OPE',  'OPE: Operaciones (Campañas)',           'Ejecución del servicio y operación de campañas.', 30),
  ('FIN',  'FIN: Finanzas y Compras',               'Contabilidad, tesorería, compras y proveedores.', 40),
  ('RRHH', 'RRHH: Recursos Humanos y SST',          'Talento humano y seguridad y salud en el trabajo.', 50),
  ('SINF', 'SINF: Sistemas de Información y TI',    'Tecnología, infraestructura y seguridad de la información.', 60),
  ('SGI',  'SGI: Sistema de Gestión Integrado',     'Documentación transversal del sistema integrado.', 70),
  ('LEG',  'LEG: Legal y Cumplimiento',             'Requisitos legales, contratos y cumplimiento normativo.', 80),
  ('AUD',  'AUD: Auditoría Interna',                'Programa, planes e informes de auditoría interna.', 90)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

-- -----------------------------------------------------------------------------
-- 3. Clasificación de la información (ISO 27001) y retención
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'info_classification') then
    create type public.info_classification as enum ('public', 'internal', 'confidential', 'restricted');
  end if;
end $$;

alter table public.documents
  add column if not exists classification public.info_classification not null default 'internal';

alter table public.documents
  add column if not exists retention text;

alter table public.documents
  drop constraint if exists documents_retention_length;
alter table public.documents
  add constraint documents_retention_length check (retention is null or char_length(retention) <= 120);

create index if not exists documents_classification_idx on public.documents(classification);

-- -----------------------------------------------------------------------------
-- 4. El capítulo deja de ser obligatorio
-- -----------------------------------------------------------------------------
-- El listado maestro no clasifica por capítulo de la norma: lo hace por tipo,
-- proceso y norma aplicable. Se conserva la columna para quien quiera afinar,
-- pero ya no bloquea la subida de un documento.
alter table public.documents alter column category_id drop not null;

-- -----------------------------------------------------------------------------
-- 5. Tipos de documento del listado maestro
-- -----------------------------------------------------------------------------
insert into public.document_types (code, name, description, sort_order) values
  ('manual',      'Manual (MGD)',        'Documento marco que describe el sistema de gestión.', 10),
  ('policy',      'Política (POL)',      'Declaración de intenciones y dirección de la organización.', 20),
  ('procedure',   'Procedimiento (PRC)', 'Forma especificada de llevar a cabo una actividad o proceso.', 30),
  ('instruction', 'Instructivo (INS)',   'Instrucciones detalladas de trabajo.', 40),
  ('form',        'Formato (FTM)',       'Plantilla para registrar información.', 50),
  ('record',      'Registro (REG)',      'Evidencia de actividades realizadas o resultados obtenidos.', 60),
  ('plan',        'Plan (PLN)',          'Planes de acción, continuidad, auditoría, etc.', 70),
  ('annex',       'Anexo (ANX)',         'Documento complementario que acompaña a otro.', 80),
  ('matrix',      'Matriz (MTZ)',        'Matrices de riesgos, legales, de responsabilidades, etc.', 90),
  ('report',      'Informe (INF)',       'Informes de auditoría, revisión por la dirección, etc.', 100),
  ('other',       'Otro',                'Cualquier otro tipo de documento.', 999)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

-- -----------------------------------------------------------------------------
-- 6. Búsqueda: el proceso y todas las normas aplicables entran en el vector
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
      coalesce((select string_agg(s.code || ' ' || s.name, ' ')
                from public.document_standards ds
                join public.standards s on s.id = ds.standard_id
                where ds.document_id = p_doc.id), '')), 'B') ||
    setweight(to_tsvector('public.spanish_unaccent',
      coalesce((select c.name from public.categories c where c.id = p_doc.category_id), '')), 'B') ||
    setweight(to_tsvector('public.spanish_unaccent',
      coalesce((select sc.name from public.subcategories sc where sc.id = p_doc.subcategory_id), '')), 'B') ||
    setweight(to_tsvector('public.spanish_unaccent',
      coalesce((select dt.name from public.document_types dt where dt.id = p_doc.document_type_id), '')), 'B') ||
    setweight(to_tsvector('public.spanish_unaccent',
      coalesce((select a.name from public.areas a where a.id = p_doc.area_id), '')), 'B') ||
    setweight(to_tsvector('public.spanish_unaccent',
      coalesce((select p.name from public.processes p where p.id = p_doc.process_id), '')), 'B') ||
    setweight(to_tsvector('public.spanish_unaccent',
      coalesce((select string_agg(t.name, ' ') from public.document_tags dtg join public.tags t on t.id = dtg.tag_id where dtg.document_id = p_doc.id), '')), 'B')
$$;

drop trigger if exists documents_search_vector on public.documents;
create trigger documents_search_vector
  before insert or update of code, name, description, version, status, file_name,
    standard_id, category_id, subcategory_id, document_type_id, area_id, process_id
  on public.documents
  for each row execute function public.documents_search_vector_trigger();

-- Las normas aplicables se escriben después de crear el documento, así que su
-- propio trigger vuelve a calcular el vector.
create or replace function public.document_standards_search_refresh()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document_id uuid := coalesce(new.document_id, old.document_id);
begin
  update public.documents d
  set search_vector = public.build_document_search_vector(d)
  where d.id = v_document_id;
  return null;
end;
$$;

drop trigger if exists document_standards_search_refresh on public.document_standards;
create trigger document_standards_search_refresh
  after insert or delete on public.document_standards
  for each row execute function public.document_standards_search_refresh();

-- Renombrar un proceso refresca el vector de sus documentos.
create or replace function public.processes_search_refresh()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.name is distinct from old.name then
    update public.documents d
    set search_vector = public.build_document_search_vector(d)
    where d.process_id = new.id;
  end if;
  return null;
end;
$$;

drop trigger if exists processes_search_refresh on public.processes;
create trigger processes_search_refresh
  after update on public.processes
  for each row execute function public.processes_search_refresh();

-- -----------------------------------------------------------------------------
-- 7. Conteos para el dashboard y los filtros
-- -----------------------------------------------------------------------------
create or replace function public.get_process_counts()
returns table (process_id uuid, total bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select d.process_id, count(*)::bigint
  from public.documents d
  where d.process_id is not null
  group by d.process_id;
$$;

revoke all on function public.get_process_counts() from public;
grant execute on function public.get_process_counts() to authenticated;

-- El reparto por norma pasa a contar sobre la relación N:N: un documento que
-- aplica a las tres normas suma en las tres, que es como lo lee un auditor.
create or replace function public.get_dashboard_stats()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'total',              (select count(*) from public.documents),
    'draft',              (select count(*) from public.documents where status = 'draft'),
    'review',             (select count(*) from public.documents where status = 'review'),
    'pending_approval',   (select count(*) from public.documents where status = 'pending_approval'),
    'approved',           (select count(*) from public.documents where status = 'approved'),
    'obsolete',           (select count(*) from public.documents where status = 'obsolete'),
    'by_standard', coalesce((
      select jsonb_agg(jsonb_build_object(
        'standard_id', s.id,
        'code', s.code,
        'name', s.name,
        'color', s.color,
        'total', coalesce(d.total, 0),
        'approved', coalesce(d.approved, 0)
      ) order by s.sort_order, s.name)
      from public.standards s
      left join (
        select ds.standard_id,
               count(*) as total,
               count(*) filter (where doc.status = 'approved') as approved
        from public.document_standards ds
        join public.documents doc on doc.id = ds.document_id
        group by ds.standard_id
      ) d on d.standard_id = s.id
      where s.active
    ), '[]'::jsonb),
    'added_last_30_days',   (select count(*) from public.documents where created_at >= now() - interval '30 days'),
    'updated_last_30_days', (select count(*) from public.documents where updated_at >= now() - interval '30 days' and updated_at <> created_at)
  );
$$;

revoke all on function public.get_dashboard_stats() from public;
grant execute on function public.get_dashboard_stats() to authenticated;

-- -----------------------------------------------------------------------------
-- 8. Refrescar los vectores existentes
-- -----------------------------------------------------------------------------
update public.documents d set search_vector = public.build_document_search_vector(d);
