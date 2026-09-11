-- =============================================================================
-- ISO DMS · 004 · Seed
-- -----------------------------------------------------------------------------
-- Datos iniciales del sistema: roles, permisos, normas, categorías,
-- subcategorías, tipos de documento, etiquetas y configuración.
--
-- Los registros marcados con "(demo)" en la descripción son datos de ejemplo
-- y pueden eliminarse o editarse libremente desde /admin.
--
-- Los usuarios y los documentos de ejemplo (con archivos reales en Storage) se
-- crean con los scripts `npm run seed:admin` y `npm run seed:demo`, ya que
-- requieren la API de administración de Supabase Auth y subir binarios.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Roles
-- -----------------------------------------------------------------------------
insert into public.roles (code, name, description, level, is_system) values
  ('SUPER_ADMIN',  'Super administrador', 'Acceso completo al sistema, incluida la configuración crítica y la gestión de usuarios.', 100, true),
  ('ADMIN',        'Administrador / Gestor', 'Gestiona el repositorio documental: sube, edita, organiza y elimina documentos y categorías.', 70, true),
  ('CONSULTOR',    'Consultor / Auditor', 'Consulta, busca, filtra y descarga documentos. No modifica contenido.', 40, true),
  ('VISUALIZADOR', 'Visualizador', 'Consulta y busca documentos. No descarga ni modifica.', 10, true)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  level = excluded.level,
  is_system = excluded.is_system;

-- -----------------------------------------------------------------------------
-- Permisos
-- -----------------------------------------------------------------------------
insert into public.permissions (code, name, description, module) values
  ('documents.read',     'Consultar documentos',   'Ver el repositorio, buscar, filtrar y ver detalles.', 'documents'),
  ('documents.download', 'Descargar documentos',   'Descargar el archivo original de un documento.', 'documents'),
  ('documents.create',   'Subir documentos',       'Crear documentos nuevos en el repositorio.', 'documents'),
  ('documents.update',   'Editar documentos',      'Modificar metadatos, estado y crear nuevas versiones.', 'documents'),
  ('documents.delete',   'Eliminar documentos',    'Eliminar documentos y su historial.', 'documents'),
  ('categories.manage',  'Gestionar categorías',   'Crear y editar categorías, subcategorías, tipos y etiquetas.', 'taxonomy'),
  ('standards.manage',   'Gestionar normas',       'Crear, editar, activar y desactivar normas.', 'taxonomy'),
  ('users.manage',       'Gestionar usuarios',     'Crear, editar, activar/desactivar usuarios y cambiar roles.', 'users'),
  ('roles.manage',       'Gestionar roles',        'Modificar la matriz de permisos por rol.', 'users'),
  ('audit.read',         'Consultar auditoría',    'Ver la actividad completa del sistema.', 'audit'),
  ('settings.manage',    'Configurar el sistema',  'Modificar la configuración global de la aplicación.', 'settings')
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  module = excluded.module;

-- -----------------------------------------------------------------------------
-- Matriz rol → permisos
-- -----------------------------------------------------------------------------
with matrix (role_code, permission_code) as (
  values
    -- SUPER_ADMIN: todo
    ('SUPER_ADMIN', 'documents.read'),
    ('SUPER_ADMIN', 'documents.download'),
    ('SUPER_ADMIN', 'documents.create'),
    ('SUPER_ADMIN', 'documents.update'),
    ('SUPER_ADMIN', 'documents.delete'),
    ('SUPER_ADMIN', 'categories.manage'),
    ('SUPER_ADMIN', 'standards.manage'),
    ('SUPER_ADMIN', 'users.manage'),
    ('SUPER_ADMIN', 'roles.manage'),
    ('SUPER_ADMIN', 'audit.read'),
    ('SUPER_ADMIN', 'settings.manage'),
    -- ADMIN / GESTOR
    ('ADMIN', 'documents.read'),
    ('ADMIN', 'documents.download'),
    ('ADMIN', 'documents.create'),
    ('ADMIN', 'documents.update'),
    ('ADMIN', 'documents.delete'),
    ('ADMIN', 'categories.manage'),
    ('ADMIN', 'audit.read'),
    -- CONSULTOR / AUDITOR
    ('CONSULTOR', 'documents.read'),
    ('CONSULTOR', 'documents.download'),
    -- VISUALIZADOR
    ('VISUALIZADOR', 'documents.read')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from matrix m
join public.roles r on r.code = m.role_code
join public.permissions p on p.code = m.permission_code
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Normas (ISO 14001 es simplemente la tercera norma de ejemplo; sustituible)
-- -----------------------------------------------------------------------------
insert into public.standards (code, name, description, color, active, sort_order) values
  ('ISO-27001', 'ISO/IEC 27001', 'Sistema de Gestión de Seguridad de la Información (SGSI).', 'blue', true, 1),
  ('ISO-9001',  'ISO 9001',      'Sistema de Gestión de la Calidad (SGC).', 'emerald', true, 2),
  ('ISO-14001', 'ISO 14001',     'Sistema de Gestión Ambiental (SGA). (demo) Norma de ejemplo configurable.', 'amber', true, 3)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  color = excluded.color,
  sort_order = excluded.sort_order;

-- -----------------------------------------------------------------------------
-- Categorías y subcategorías (demo)
-- -----------------------------------------------------------------------------
with cats (standard_code, code, name, description, sort_order) as (
  values
    -- ISO 27001
    ('ISO-27001', 'SGSI',  'Sistema de Gestión de Seguridad de la Información', 'Gobierno, alcance, política y contexto del SGSI. (demo)', 1),
    ('ISO-27001', 'SEG',   'Seguridad de la Información', 'Controles operativos de seguridad. (demo)', 2),
    ('ISO-27001', 'RIES',  'Gestión de Riesgos', 'Metodología, evaluación y tratamiento de riesgos. (demo)', 3),
    ('ISO-27001', 'CONT',  'Continuidad y Respuesta a Incidentes', 'Continuidad del negocio y gestión de incidentes. (demo)', 4),
    -- ISO 9001
    ('ISO-9001',  'SGC',   'Sistema de Gestión de la Calidad', 'Manual, política y objetivos de calidad. (demo)', 1),
    ('ISO-9001',  'PROC',  'Procesos Operativos', 'Procedimientos e instructivos de los procesos. (demo)', 2),
    ('ISO-9001',  'MEJ',   'Medición y Mejora', 'Indicadores, auditorías internas y mejora continua. (demo)', 3),
    -- ISO 14001
    ('ISO-14001', 'SGA',   'Sistema de Gestión Ambiental', 'Política, objetivos y alcance ambiental. (demo)', 1),
    ('ISO-14001', 'ASP',   'Aspectos e Impactos Ambientales', 'Identificación y evaluación de aspectos ambientales. (demo)', 2),
    ('ISO-14001', 'CUMP',  'Cumplimiento Legal Ambiental', 'Requisitos legales y otros requisitos. (demo)', 3)
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
    ('ISO-27001', 'SGSI', 'ALC',  'Alcance y Contexto', 1),
    ('ISO-27001', 'SGSI', 'POL',  'Políticas del SGSI', 2),
    ('ISO-27001', 'SEG',  'ACC',  'Gestión de Accesos', 1),
    ('ISO-27001', 'SEG',  'CRIP', 'Criptografía', 2),
    ('ISO-27001', 'SEG',  'OPS',  'Seguridad de las Operaciones', 3),
    ('ISO-27001', 'SEG',  'RRHH', 'Seguridad ligada a las Personas', 4),
    ('ISO-27001', 'RIES', 'MET',  'Metodología de Riesgos', 1),
    ('ISO-27001', 'RIES', 'TRAT', 'Tratamiento de Riesgos', 2),
    ('ISO-27001', 'CONT', 'BCP',  'Continuidad del Negocio', 1),
    ('ISO-27001', 'CONT', 'INC',  'Gestión de Incidentes', 2),
    ('ISO-9001',  'SGC',  'MAN',  'Manual de Calidad', 1),
    ('ISO-9001',  'SGC',  'OBJ',  'Objetivos de Calidad', 2),
    ('ISO-9001',  'PROC', 'COMP', 'Compras y Proveedores', 1),
    ('ISO-9001',  'PROC', 'PROD', 'Producción y Prestación del Servicio', 2),
    ('ISO-9001',  'MEJ',  'AUD',  'Auditorías Internas', 1),
    ('ISO-9001',  'MEJ',  'NC',   'No Conformidades y Acciones Correctivas', 2),
    ('ISO-14001', 'SGA',  'POLA', 'Política Ambiental', 1),
    ('ISO-14001', 'ASP',  'IDEN', 'Identificación de Aspectos', 1),
    ('ISO-14001', 'CUMP', 'LEG',  'Matriz Legal', 1)
)
insert into public.subcategories (category_id, code, name, sort_order)
select c.id, sb.code, sb.name, sb.sort_order
from subs sb
join public.standards s on s.code = sb.standard_code
join public.categories c on c.standard_id = s.id and c.code = sb.category_code
on conflict (category_id, code) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;

-- -----------------------------------------------------------------------------
-- Tipos de documento
-- -----------------------------------------------------------------------------
insert into public.document_types (code, name, description, sort_order) values
  ('policy',      'Política',       'Declaración de intenciones y dirección de la organización.', 1),
  ('manual',      'Manual',         'Documento marco que describe el sistema de gestión.', 2),
  ('procedure',   'Procedimiento',  'Forma especificada de llevar a cabo una actividad o proceso.', 3),
  ('instruction', 'Instructivo',    'Instrucciones detalladas de trabajo.', 4),
  ('form',        'Formato',        'Plantilla para registrar información.', 5),
  ('record',      'Registro',       'Evidencia de actividades realizadas o resultados obtenidos.', 6),
  ('matrix',      'Matriz',         'Matrices de riesgos, legales, de responsabilidades, etc.', 7),
  ('plan',        'Plan',           'Planes de acción, continuidad, auditoría, etc.', 8),
  ('report',      'Informe',        'Informes de auditoría, revisión por la dirección, etc.', 9),
  ('other',       'Otro',           'Cualquier otro tipo de documento.', 99)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

-- -----------------------------------------------------------------------------
-- Etiquetas iniciales (demo)
-- -----------------------------------------------------------------------------
insert into public.tags (name, slug, color) values
  ('Seguridad',      'seguridad',      'blue'),
  ('Calidad',        'calidad',        'emerald'),
  ('Ambiental',      'ambiental',      'amber'),
  ('Confidencial',   'confidencial',   'rose'),
  ('Obligatorio',    'obligatorio',    'violet'),
  ('Auditoría 2026', 'auditoria-2026', 'slate')
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- Configuración global
-- -----------------------------------------------------------------------------
insert into public.app_settings (key, value, description) values
  ('org_name',            '"Mi Organización"',  'Nombre de la organización mostrado en la interfaz.'),
  ('max_file_size_mb',    '20',                 'Tamaño máximo permitido por archivo (MB). Techo duro del bucket: 25 MB.'),
  ('allowed_extensions',  '["pdf","doc","docx","xls","xlsx","ppt","pptx","odt","ods","txt","csv","md","png","jpg","jpeg","webp","gif","svg","zip"]', 'Extensiones de archivo permitidas en la subida.'),
  ('default_status',      '"draft"',            'Estado por defecto al crear un documento.'),
  ('recent_limit',        '20',                 'Número de documentos mostrados en Recientes.')
on conflict (key) do nothing;
