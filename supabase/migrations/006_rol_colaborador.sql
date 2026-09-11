-- =============================================================================
-- ISO DMS · 006 · Rol COLABORADOR
-- -----------------------------------------------------------------------------
-- Perfil operativo para quien aporta documentación al repositorio pero no
-- decide sobre ella: puede consultar, descargar y subir documentos nuevos
-- (incluidas sus etiquetas), y no puede editar, aprobar ni eliminar.
--
-- Necesario porque los roles del seed no cubren ese caso: CONSULTOR solo
-- consulta y descarga, y ADMIN ya puede editar, aprobar y eliminar.
--
-- Nota: aprobar un documento es un cambio de estado y exige documents.update;
-- por eso este rol no lo incluye.
-- =============================================================================

insert into public.roles (code, name, description, level, is_system) values
  ('COLABORADOR', 'Colaborador', 'Sube documentos al repositorio, consulta y descarga. No edita, aprueba ni elimina.', 55, true)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  level = excluded.level,
  is_system = excluded.is_system;

with matrix (role_code, permission_code) as (
  values
    ('COLABORADOR', 'documents.read'),
    ('COLABORADOR', 'documents.download'),
    ('COLABORADOR', 'documents.create')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from matrix m
join public.roles r on r.code = m.role_code
join public.permissions p on p.code = m.permission_code
on conflict do nothing;

-- Retira cualquier permiso que no corresponda al rol (idempotencia si se
-- reaplica tras haberlo editado desde /admin/roles).
delete from public.role_permissions rp
using public.roles r, public.permissions p
where rp.role_id = r.id
  and rp.permission_id = p.id
  and r.code = 'COLABORADOR'
  and p.code not in ('documents.read', 'documents.download', 'documents.create');
