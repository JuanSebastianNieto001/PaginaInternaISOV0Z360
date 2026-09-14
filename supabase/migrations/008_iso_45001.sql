-- =============================================================================
-- ISO DMS · 008 · La tercera norma es ISO 45001, no ISO 14001
-- -----------------------------------------------------------------------------
-- El seed inicial dejó ISO 14001 (gestión ambiental) como tercera norma de
-- ejemplo. La norma que realmente aplica en VOZ360 es ISO 45001, de seguridad
-- y salud en el trabajo.
--
-- La fila se actualiza en su sitio para conservar el mismo identificador, de
-- modo que cualquier cosa que ya apuntara a ella sigue apuntando a la norma
-- correcta. Sus categorías ambientales se sustituyen por categorías de SST.
-- =============================================================================

update public.standards
set code = 'ISO-45001',
    name = 'ISO 45001',
    description = 'Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST).'
where code = 'ISO-14001';

-- Fuera las categorías ambientales (y sus subcategorías, en cascada).
-- Si alguna tuviera documentos, la clave foránea lo impediría y la migración
-- fallaría en lugar de borrar información en silencio.
delete from public.categories c
using public.standards s
where c.standard_id = s.id
  and s.code = 'ISO-45001'
  and c.code in ('SGA', 'ASP', 'CUMP');

-- Categorías propias de seguridad y salud en el trabajo.
with cats (standard_code, code, name, description, sort_order) as (
  values
    ('ISO-45001', 'SGSST', 'Sistema de Gestión de SST', 'Política, objetivos, roles y alcance del SG-SST.', 1),
    ('ISO-45001', 'PEL',   'Peligros y Riesgos', 'Identificación de peligros, valoración de riesgos y controles.', 2),
    ('ISO-45001', 'EMER',  'Emergencias y Respuesta', 'Preparación y respuesta ante emergencias.', 3),
    ('ISO-45001', 'LEGS',  'Requisitos Legales de SST', 'Matriz legal y evaluación del cumplimiento en SST.', 4)
)
insert into public.categories (standard_id, code, name, description, sort_order)
select s.id, c.code, c.name, c.description, c.sort_order
from cats c
join public.standards s on s.code = c.standard_code
on conflict (standard_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

with subs (standard_code, category_code, code, name, sort_order) as (
  values
    ('ISO-45001', 'SGSST', 'POLSST', 'Política de SST', 1),
    ('ISO-45001', 'SGSST', 'OBJSST', 'Objetivos y Programas', 2),
    ('ISO-45001', 'PEL',   'MPR',    'Matriz de Peligros y Riesgos', 1),
    ('ISO-45001', 'PEL',   'INSP',   'Inspecciones y Controles', 2),
    ('ISO-45001', 'EMER',  'PLANE',  'Plan de Emergencias', 1),
    ('ISO-45001', 'LEGS',  'MLEG',   'Matriz Legal de SST', 1)
)
insert into public.subcategories (category_id, code, name, sort_order)
select c.id, sb.code, sb.name, sb.sort_order
from subs sb
join public.standards s on s.code = sb.standard_code
join public.categories c on c.standard_id = s.id and c.code = sb.category_code
on conflict (category_id, code) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;

-- La etiqueta "Ambiental" del seed solo existía por la norma ambiental.
-- Se renombra a "SST" salvo que alguien ya la esté usando en documentos.
update public.tags t
set name = 'SST', slug = 'sst'
where t.slug = 'ambiental'
  and not exists (select 1 from public.document_tags dt where dt.tag_id = t.id)
  and not exists (select 1 from public.tags o where o.slug = 'sst');

-- El nombre de la norma forma parte del vector de búsqueda de sus documentos.
update public.documents d
set search_vector = public.build_document_search_vector(d)
where d.standard_id = (select id from public.standards where code = 'ISO-45001');
