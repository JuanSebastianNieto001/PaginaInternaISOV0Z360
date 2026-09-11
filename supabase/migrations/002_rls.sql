-- =============================================================================
-- ISO DMS · 002 · Row Level Security
-- -----------------------------------------------------------------------------
-- Principio: la seguridad se aplica en la base de datos, nunca solo en la UI.
-- Todas las políticas se apoyan en public.has_permission(code), que evalúa
-- rol + permisos del usuario autenticado y exige que el perfil esté activo.
-- =============================================================================

alter table public.roles              enable row level security;
alter table public.permissions        enable row level security;
alter table public.role_permissions   enable row level security;
alter table public.profiles           enable row level security;
alter table public.standards          enable row level security;
alter table public.categories         enable row level security;
alter table public.subcategories      enable row level security;
alter table public.document_types     enable row level security;
alter table public.documents          enable row level security;
alter table public.document_versions  enable row level security;
alter table public.tags               enable row level security;
alter table public.document_tags      enable row level security;
alter table public.favorites          enable row level security;
alter table public.recent_documents   enable row level security;
alter table public.audit_logs         enable row level security;
alter table public.app_settings       enable row level security;

-- Helper para recrear políticas de forma idempotente
create or replace function public.__drop_policy_if_exists(p_table text, p_policy text)
returns void language plpgsql as $$
begin
  execute format('drop policy if exists %I on public.%I', p_policy, p_table);
end $$;

-- -----------------------------------------------------------------------------
-- roles / permissions / role_permissions
-- Lectura: cualquier usuario activo (la UI necesita nombres de rol).
-- Escritura: roles.manage (solo SUPER_ADMIN por seed).
-- -----------------------------------------------------------------------------
select public.__drop_policy_if_exists('roles', 'roles_select');
create policy roles_select on public.roles
  for select to authenticated
  using (public.is_active_user());

select public.__drop_policy_if_exists('roles', 'roles_write');
create policy roles_write on public.roles
  for all to authenticated
  using (public.has_permission('roles.manage'))
  with check (public.has_permission('roles.manage'));

select public.__drop_policy_if_exists('permissions', 'permissions_select');
create policy permissions_select on public.permissions
  for select to authenticated
  using (public.is_active_user());

select public.__drop_policy_if_exists('permissions', 'permissions_write');
create policy permissions_write on public.permissions
  for all to authenticated
  using (public.has_permission('roles.manage'))
  with check (public.has_permission('roles.manage'));

select public.__drop_policy_if_exists('role_permissions', 'role_permissions_select');
create policy role_permissions_select on public.role_permissions
  for select to authenticated
  using (public.is_active_user());

-- No se permite tocar los permisos del rol SUPER_ADMIN desde la app.
select public.__drop_policy_if_exists('role_permissions', 'role_permissions_write');
create policy role_permissions_write on public.role_permissions
  for all to authenticated
  using (
    public.has_permission('roles.manage')
    and not exists (select 1 from public.roles r where r.id = role_id and r.code = 'SUPER_ADMIN')
  )
  with check (
    public.has_permission('roles.manage')
    and not exists (select 1 from public.roles r where r.id = role_id and r.code = 'SUPER_ADMIN')
  );

-- -----------------------------------------------------------------------------
-- profiles
-- Lectura: usuarios activos ven a todos (autores de documentos, auditoría).
-- Actualización: el propio perfil o users.manage. Campos sensibles protegidos
-- por trigger protect_profile_fields (rol, estado, email).
-- Inserción/borrado: solo vía trigger de auth.users / service role.
-- -----------------------------------------------------------------------------
select public.__drop_policy_if_exists('profiles', 'profiles_select');
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_active_user());

select public.__drop_policy_if_exists('profiles', 'profiles_update_own');
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid() and public.is_active_user())
  with check (id = auth.uid());

select public.__drop_policy_if_exists('profiles', 'profiles_update_admin');
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.has_permission('users.manage'))
  with check (public.has_permission('users.manage'));

-- -----------------------------------------------------------------------------
-- Taxonomía
-- -----------------------------------------------------------------------------
select public.__drop_policy_if_exists('standards', 'standards_select');
create policy standards_select on public.standards
  for select to authenticated
  using (public.is_active_user());

select public.__drop_policy_if_exists('standards', 'standards_write');
create policy standards_write on public.standards
  for all to authenticated
  using (public.has_permission('standards.manage'))
  with check (public.has_permission('standards.manage'));

select public.__drop_policy_if_exists('categories', 'categories_select');
create policy categories_select on public.categories
  for select to authenticated
  using (public.is_active_user());

select public.__drop_policy_if_exists('categories', 'categories_write');
create policy categories_write on public.categories
  for all to authenticated
  using (public.has_permission('categories.manage'))
  with check (public.has_permission('categories.manage'));

select public.__drop_policy_if_exists('subcategories', 'subcategories_select');
create policy subcategories_select on public.subcategories
  for select to authenticated
  using (public.is_active_user());

select public.__drop_policy_if_exists('subcategories', 'subcategories_write');
create policy subcategories_write on public.subcategories
  for all to authenticated
  using (public.has_permission('categories.manage'))
  with check (public.has_permission('categories.manage'));

select public.__drop_policy_if_exists('document_types', 'document_types_select');
create policy document_types_select on public.document_types
  for select to authenticated
  using (public.is_active_user());

select public.__drop_policy_if_exists('document_types', 'document_types_write');
create policy document_types_write on public.document_types
  for all to authenticated
  using (public.has_permission('categories.manage'))
  with check (public.has_permission('categories.manage'));

-- -----------------------------------------------------------------------------
-- documents
-- -----------------------------------------------------------------------------
select public.__drop_policy_if_exists('documents', 'documents_select');
create policy documents_select on public.documents
  for select to authenticated
  using (public.has_permission('documents.read'));

select public.__drop_policy_if_exists('documents', 'documents_insert');
create policy documents_insert on public.documents
  for insert to authenticated
  with check (
    public.has_permission('documents.create')
    and created_by = auth.uid()
  );

select public.__drop_policy_if_exists('documents', 'documents_update');
create policy documents_update on public.documents
  for update to authenticated
  using (public.has_permission('documents.update'))
  with check (public.has_permission('documents.update'));

select public.__drop_policy_if_exists('documents', 'documents_delete');
create policy documents_delete on public.documents
  for delete to authenticated
  using (public.has_permission('documents.delete'));

-- -----------------------------------------------------------------------------
-- document_versions (histórico inmutable: no update; delete solo en cascada
-- o por quien puede eliminar documentos)
-- -----------------------------------------------------------------------------
select public.__drop_policy_if_exists('document_versions', 'document_versions_select');
create policy document_versions_select on public.document_versions
  for select to authenticated
  using (public.has_permission('documents.read'));

select public.__drop_policy_if_exists('document_versions', 'document_versions_insert');
create policy document_versions_insert on public.document_versions
  for insert to authenticated
  with check (
    (public.has_permission('documents.create') or public.has_permission('documents.update'))
    and created_by = auth.uid()
  );

select public.__drop_policy_if_exists('document_versions', 'document_versions_delete');
create policy document_versions_delete on public.document_versions
  for delete to authenticated
  using (public.has_permission('documents.delete'));

-- -----------------------------------------------------------------------------
-- tags / document_tags
-- -----------------------------------------------------------------------------
select public.__drop_policy_if_exists('tags', 'tags_select');
create policy tags_select on public.tags
  for select to authenticated
  using (public.is_active_user());

select public.__drop_policy_if_exists('tags', 'tags_insert');
create policy tags_insert on public.tags
  for insert to authenticated
  with check (public.has_permission('documents.create') or public.has_permission('documents.update'));

select public.__drop_policy_if_exists('tags', 'tags_update');
create policy tags_update on public.tags
  for update to authenticated
  using (public.has_permission('categories.manage'))
  with check (public.has_permission('categories.manage'));

select public.__drop_policy_if_exists('tags', 'tags_delete');
create policy tags_delete on public.tags
  for delete to authenticated
  using (public.has_permission('categories.manage'));

select public.__drop_policy_if_exists('document_tags', 'document_tags_select');
create policy document_tags_select on public.document_tags
  for select to authenticated
  using (public.has_permission('documents.read'));

select public.__drop_policy_if_exists('document_tags', 'document_tags_write');
create policy document_tags_write on public.document_tags
  for all to authenticated
  using (public.has_permission('documents.update') or public.has_permission('documents.create'))
  with check (public.has_permission('documents.update') or public.has_permission('documents.create'));

-- -----------------------------------------------------------------------------
-- favorites / recent_documents: estrictamente por usuario
-- -----------------------------------------------------------------------------
select public.__drop_policy_if_exists('favorites', 'favorites_own');
create policy favorites_own on public.favorites
  for all to authenticated
  using (user_id = auth.uid() and public.has_permission('documents.read'))
  with check (user_id = auth.uid() and public.has_permission('documents.read'));

select public.__drop_policy_if_exists('recent_documents', 'recent_documents_own');
create policy recent_documents_own on public.recent_documents
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- audit_logs
-- Lectura: audit.read ve todo; el resto ve su propia actividad y la actividad
-- documental (creaciones/actualizaciones), necesaria para el timeline.
-- Escritura: solo mediante log_audit() / triggers (security definer).
-- -----------------------------------------------------------------------------
select public.__drop_policy_if_exists('audit_logs', 'audit_logs_select');
create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using (
    public.has_permission('audit.read')
    or (
      public.is_active_user()
      and (
        user_id = auth.uid()
        or (entity_type = 'document' and public.has_permission('documents.read'))
      )
    )
  );

-- -----------------------------------------------------------------------------
-- app_settings
-- -----------------------------------------------------------------------------
select public.__drop_policy_if_exists('app_settings', 'app_settings_select');
create policy app_settings_select on public.app_settings
  for select to authenticated
  using (public.is_active_user());

select public.__drop_policy_if_exists('app_settings', 'app_settings_write');
create policy app_settings_write on public.app_settings
  for all to authenticated
  using (public.has_permission('settings.manage'))
  with check (public.has_permission('settings.manage'));

drop function if exists public.__drop_policy_if_exists(text, text);
