-- =============================================================================
-- ISO DMS · 001 · Initial schema
-- Sistema de Gestión Documental (Document Management System)
-- -----------------------------------------------------------------------------
-- Ejecutar en el SQL Editor de Supabase o con `supabase db push`.
-- Todas las tablas viven en el esquema `public`. RLS se activa en 002_rls.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensiones
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto"  with schema extensions;
create extension if not exists "unaccent"  with schema extensions;
create extension if not exists "pg_trgm"   with schema extensions;

-- Configuración de búsqueda en español sin acentos (política ≈ politica).
do $$
begin
  if not exists (
    select 1 from pg_ts_config where cfgname = 'spanish_unaccent'
  ) then
    create text search configuration public.spanish_unaccent (copy = pg_catalog.spanish);
    alter text search configuration public.spanish_unaccent
      alter mapping for hword, hword_part, word, asciiword, asciihword, hword_asciipart
      with extensions.unaccent, spanish_stem;
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'document_status') then
    create type public.document_status as enum ('draft', 'review', 'approved', 'obsolete');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Roles y permisos
-- -----------------------------------------------------------------------------
create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  description text,
  level       integer not null default 0,          -- jerarquía: mayor = más privilegios
  is_system   boolean not null default false,      -- roles del sistema no se eliminan
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint roles_code_format check (code ~ '^[A-Z_]{3,40}$')
);

create table if not exists public.permissions (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,                -- p.ej. documents.create
  name        text not null,
  description text,
  module      text not null,                        -- documents, users, taxonomy, audit, settings
  created_at  timestamptz not null default now(),
  constraint permissions_code_format check (code ~ '^[a-z_]+\.[a-z_]+$')
);

create table if not exists public.role_permissions (
  role_id       uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create index if not exists role_permissions_permission_idx on public.role_permissions(permission_id);

-- -----------------------------------------------------------------------------
-- Perfiles (1:1 con auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text not null unique,
  full_name        text not null default '',
  avatar_url       text,
  role_id          uuid not null references public.roles(id) on delete restrict,
  is_active        boolean not null default true,
  last_sign_in_at  timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role_id);
create index if not exists profiles_is_active_idx on public.profiles(is_active);

-- -----------------------------------------------------------------------------
-- Taxonomía: normas → categorías → subcategorías; tipos de documento
-- -----------------------------------------------------------------------------
create table if not exists public.standards (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,                -- ISO-27001
  name        text not null,                       -- ISO/IEC 27001:2022
  description text,
  color       text,                                 -- token de color para la UI (opcional)
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  standard_id uuid not null references public.standards(id) on delete cascade,
  code        text not null,
  name        text not null,
  description text,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (standard_id, code)
);

create index if not exists categories_standard_idx on public.categories(standard_id);

create table if not exists public.subcategories (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  code        text not null,
  name        text not null,
  description text,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (category_id, code)
);

create index if not exists subcategories_category_idx on public.subcategories(category_id);

create table if not exists public.document_types (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,                -- policy, procedure, ...
  name        text not null,
  description text,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Documentos
-- -----------------------------------------------------------------------------
create table if not exists public.documents (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  name             text not null,
  description      text,
  standard_id      uuid not null references public.standards(id) on delete restrict,
  category_id      uuid not null references public.categories(id) on delete restrict,
  subcategory_id   uuid references public.subcategories(id) on delete set null,
  document_type_id uuid not null references public.document_types(id) on delete restrict,
  status           public.document_status not null default 'draft',
  version          text not null default '1.0',
  -- Archivo actual (la copia histórica vive en document_versions)
  file_path        text not null,
  file_name        text not null,
  file_extension   text not null,
  file_size        bigint not null check (file_size >= 0),
  mime_type        text,
  -- Ciclo de vida
  approved_at      timestamptz,
  effective_date   date,
  review_date      date,                            -- próxima revisión (para vencimientos futuros)
  -- Trazabilidad
  created_by       uuid references public.profiles(id) on delete set null,
  updated_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- Búsqueda
  search_vector    tsvector,
  constraint documents_code_format check (char_length(code) between 2 and 60),
  constraint documents_name_length check (char_length(name) between 2 and 200),
  constraint documents_version_format check (version ~ '^[0-9]+(\.[0-9]+){0,2}$')
);

create index if not exists documents_standard_idx    on public.documents(standard_id);
create index if not exists documents_category_idx    on public.documents(category_id);
create index if not exists documents_subcategory_idx on public.documents(subcategory_id);
create index if not exists documents_type_idx        on public.documents(document_type_id);
create index if not exists documents_status_idx      on public.documents(status);
create index if not exists documents_created_by_idx  on public.documents(created_by);
create index if not exists documents_updated_at_idx  on public.documents(updated_at desc);
create index if not exists documents_created_at_idx  on public.documents(created_at desc);
create index if not exists documents_search_idx      on public.documents using gin(search_vector);
create index if not exists documents_name_trgm_idx   on public.documents using gin(name extensions.gin_trgm_ops);
create index if not exists documents_code_trgm_idx   on public.documents using gin(code extensions.gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- Versiones
-- -----------------------------------------------------------------------------
create table if not exists public.document_versions (
  id             uuid primary key default gen_random_uuid(),
  document_id    uuid not null references public.documents(id) on delete cascade,
  version        text not null,
  status         public.document_status not null default 'draft',
  file_path      text not null,
  file_name      text not null,
  file_extension text not null,
  file_size      bigint not null check (file_size >= 0),
  mime_type      text,
  change_summary text,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (document_id, version),
  constraint document_versions_version_format check (version ~ '^[0-9]+(\.[0-9]+){0,2}$')
);

create index if not exists document_versions_document_idx on public.document_versions(document_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Etiquetas
-- -----------------------------------------------------------------------------
create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  color      text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint tags_name_length check (char_length(name) between 1 and 40)
);

create table if not exists public.document_tags (
  document_id uuid not null references public.documents(id) on delete cascade,
  tag_id      uuid not null references public.tags(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (document_id, tag_id)
);

create index if not exists document_tags_tag_idx on public.document_tags(tag_id);

-- -----------------------------------------------------------------------------
-- Favoritos y recientes (por usuario)
-- -----------------------------------------------------------------------------
create table if not exists public.favorites (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, document_id)
);

create index if not exists favorites_document_idx on public.favorites(document_id);

create table if not exists public.recent_documents (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  viewed_at   timestamptz not null default now(),
  view_count  integer not null default 1,
  primary key (user_id, document_id)
);

create index if not exists recent_documents_user_viewed_idx on public.recent_documents(user_id, viewed_at desc);

-- -----------------------------------------------------------------------------
-- Auditoría
-- -----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.profiles(id) on delete set null,
  action      text not null,                       -- document.created, auth.login, ...
  entity_type text not null,                       -- document, user, standard, auth, ...
  entity_id   uuid,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_user_idx       on public.audit_logs(user_id, created_at desc);
create index if not exists audit_logs_entity_idx     on public.audit_logs(entity_type, entity_id, created_at desc);
create index if not exists audit_logs_action_idx     on public.audit_logs(action);

-- -----------------------------------------------------------------------------
-- Configuración de la aplicación (clave/valor)
-- -----------------------------------------------------------------------------
create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Triggers updated_at
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['roles','profiles','standards','categories','subcategories','document_types','documents']
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- Funciones de autorización (usadas por RLS y por la app)
-- -----------------------------------------------------------------------------
create or replace function public.current_role_code()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.code
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = auth.uid() and p.is_active
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role_code() = 'SUPER_ADMIN', false)
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_active
  )
$$;

create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role_id = p.role_id
    join public.permissions pe on pe.id = rp.permission_id
    where p.id = auth.uid()
      and p.is_active
      and pe.code = p_permission
  )
$$;

create or replace function public.current_permissions()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select pe.code
  from public.profiles p
  join public.role_permissions rp on rp.role_id = p.role_id
  join public.permissions pe on pe.id = rp.permission_id
  where p.id = auth.uid() and p.is_active
$$;

revoke all on function public.current_role_code() from public;
revoke all on function public.is_super_admin() from public;
revoke all on function public.is_active_user() from public;
revoke all on function public.has_permission(text) from public;
revoke all on function public.current_permissions() from public;
grant execute on function public.current_role_code() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.current_permissions() to authenticated;

-- -----------------------------------------------------------------------------
-- Alta automática de perfil al crear usuario en auth.users
-- El rol se toma de app_metadata.role_code (asignado por un administrador vía
-- service role) o, por defecto, VISUALIZADOR.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_code text;
  v_role_id   uuid;
begin
  v_role_code := coalesce(new.raw_app_meta_data ->> 'role_code', 'VISUALIZADOR');

  select id into v_role_id from public.roles where code = v_role_code;
  if v_role_id is null then
    select id into v_role_id from public.roles where code = 'VISUALIZADOR';
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, role_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    v_role_id
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Sincroniza el email si cambia en auth.users
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- -----------------------------------------------------------------------------
-- Protección de campos sensibles en profiles
-- - Un usuario solo puede editar su nombre/avatar.
-- - Cambiar rol/estado requiere users.manage.
-- - Nadie cambia su propio rol ni se desactiva a sí mismo.
-- - Solo SUPER_ADMIN puede asignar/retirar SUPER_ADMIN o tocar a un SUPER_ADMIN.
-- -----------------------------------------------------------------------------
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_role_code text;
  v_new_role_code text;
begin
  -- Llamadas con service role (auth.uid() es null) se consideran administrativas.
  if auth.uid() is null then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'No está permitido modificar el identificador del perfil.'
      using errcode = '42501';
  end if;

  if new.email is distinct from old.email then
    raise exception 'El email se gestiona desde la autenticación, no desde el perfil.'
      using errcode = '42501';
  end if;

  if new.role_id is distinct from old.role_id or new.is_active is distinct from old.is_active then
    if not public.has_permission('users.manage') then
      raise exception 'No tienes permiso para cambiar el rol o el estado de un usuario.'
        using errcode = '42501';
    end if;

    if new.id = auth.uid() then
      raise exception 'No puedes cambiar tu propio rol ni tu propio estado.'
        using errcode = '42501';
    end if;

    select code into v_old_role_code from public.roles where id = old.role_id;
    select code into v_new_role_code from public.roles where id = new.role_id;

    if (v_old_role_code = 'SUPER_ADMIN' or v_new_role_code = 'SUPER_ADMIN')
       and not public.is_super_admin() then
      raise exception 'Solo un SUPER_ADMIN puede administrar cuentas SUPER_ADMIN.'
        using errcode = '42501';
    end if;
  end if;

  if new.id <> auth.uid() and not public.has_permission('users.manage') then
    raise exception 'No tienes permiso para editar otros perfiles.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_fields on public.profiles;
create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- -----------------------------------------------------------------------------
-- Búsqueda: mantenimiento de documents.search_vector
-- Incluye: código, nombre, descripción, versión, norma, categoría, subcategoría,
-- tipo, estado y etiquetas.
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
      coalesce((select string_agg(t.name, ' ') from public.document_tags dtg join public.tags t on t.id = dtg.tag_id where dtg.document_id = p_doc.id), '')), 'B')
$$;

create or replace function public.documents_search_vector_trigger()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_vector := public.build_document_search_vector(new);
  return new;
end;
$$;

drop trigger if exists documents_search_vector on public.documents;
create trigger documents_search_vector
  before insert or update of code, name, description, version, status, file_name,
    standard_id, category_id, subcategory_id, document_type_id
  on public.documents
  for each row execute function public.documents_search_vector_trigger();

create or replace function public.refresh_document_search_vector(p_document_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.documents d
  set search_vector = public.build_document_search_vector(d)
  where d.id = p_document_id;
end;
$$;

create or replace function public.document_tags_search_refresh()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_document_search_vector(old.document_id);
  else
    perform public.refresh_document_search_vector(new.document_id);
  end if;
  return null;
end;
$$;

drop trigger if exists document_tags_search_refresh on public.document_tags;
create trigger document_tags_search_refresh
  after insert or delete on public.document_tags
  for each row execute function public.document_tags_search_refresh();

-- Si cambia el nombre de una norma/categoría/subcategoría/tipo, refrescar sus documentos.
create or replace function public.taxonomy_search_refresh()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.name is distinct from old.name or (tg_table_name = 'standards' and new.code is distinct from old.code) then
    if tg_table_name = 'standards' then
      update public.documents d set search_vector = public.build_document_search_vector(d) where d.standard_id = new.id;
    elsif tg_table_name = 'categories' then
      update public.documents d set search_vector = public.build_document_search_vector(d) where d.category_id = new.id;
    elsif tg_table_name = 'subcategories' then
      update public.documents d set search_vector = public.build_document_search_vector(d) where d.subcategory_id = new.id;
    elsif tg_table_name = 'document_types' then
      update public.documents d set search_vector = public.build_document_search_vector(d) where d.document_type_id = new.id;
    end if;
  end if;
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['standards','categories','subcategories','document_types']
  loop
    execute format('drop trigger if exists %I_search_refresh on public.%I', t, t);
    execute format('create trigger %I_search_refresh after update on public.%I for each row execute function public.taxonomy_search_refresh()', t, t);
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- Auditoría: función RPC para la app + trigger genérico de cambios
-- -----------------------------------------------------------------------------
create or replace function public.log_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  if auth.uid() is null then
    raise exception 'Se requiere un usuario autenticado para registrar auditoría.'
      using errcode = '42501';
  end if;

  insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb))
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.log_audit(text, text, uuid, jsonb) from public;
grant execute on function public.log_audit(text, text, uuid, jsonb) to authenticated;

-- Trigger genérico: TG_ARGV[0] = entity_type (document, standard, category, ...)
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity    text := tg_argv[0];
  v_action    text;
  v_entity_id uuid;
  v_meta      jsonb := '{}'::jsonb;
  v_old       jsonb;
  v_new       jsonb;
  v_changed   text[];
  v_ignored   text[] := array['search_vector', 'updated_at', 'updated_by', 'last_sign_in_at'];
  k           text;
begin
  if tg_op = 'INSERT' then
    v_action := v_entity || '.created';
    v_new := to_jsonb(new);
    v_entity_id := (v_new ->> 'id')::uuid;
    v_meta := jsonb_strip_nulls(jsonb_build_object(
      'name', v_new ->> 'name',
      'code', v_new ->> 'code',
      'version', v_new ->> 'version',
      'status', v_new ->> 'status',
      'email', v_new ->> 'email',
      'full_name', v_new ->> 'full_name'
    ));
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_entity_id := (v_new ->> 'id')::uuid;

    select coalesce(array_agg(key), '{}') into v_changed
    from (
      select key from jsonb_each(v_new)
      where not (key = any (v_ignored))
        and (v_old -> key) is distinct from (v_new -> key)
    ) c;

    if coalesce(array_length(v_changed, 1), 0) = 0 then
      return null; -- cambio irrelevante (p.ej. sólo search_vector)
    end if;

    v_action := v_entity || '.updated';
    if v_entity = 'user' then
      if 'role_id' = any (v_changed) then v_action := 'user.role_changed'; end if;
      if 'is_active' = any (v_changed) then
        v_action := case when (v_new ->> 'is_active')::boolean then 'user.activated' else 'user.deactivated' end;
      end if;
    elsif v_entity = 'document' and 'status' = any (v_changed) and array_length(v_changed, 1) = 1 then
      v_action := 'document.status_changed';
    end if;

    v_meta := jsonb_build_object('changed', to_jsonb(v_changed));
    v_meta := v_meta || jsonb_strip_nulls(jsonb_build_object(
      'name', v_new ->> 'name',
      'code', v_new ->> 'code',
      'version', v_new ->> 'version',
      'status', v_new ->> 'status',
      'email', v_new ->> 'email',
      'full_name', v_new ->> 'full_name'
    ));
    foreach k in array v_changed loop
      if k in ('status', 'version', 'name', 'code', 'role_id', 'is_active', 'active') then
        v_meta := v_meta || jsonb_build_object('previous_' || k, v_old -> k);
      end if;
    end loop;
  else
    v_action := v_entity || '.deleted';
    v_old := to_jsonb(old);
    v_entity_id := (v_old ->> 'id')::uuid;
    v_meta := jsonb_strip_nulls(jsonb_build_object(
      'name', v_old ->> 'name',
      'code', v_old ->> 'code',
      'version', v_old ->> 'version',
      'status', v_old ->> 'status',
      'email', v_old ->> 'email',
      'full_name', v_old ->> 'full_name'
    ));
  end if;

  insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), v_action, v_entity, v_entity_id, v_meta);

  return null;
end;
$$;

drop trigger if exists documents_audit on public.documents;
create trigger documents_audit
  after insert or update or delete on public.documents
  for each row execute function public.audit_row_change('document');

drop trigger if exists profiles_audit on public.profiles;
create trigger profiles_audit
  after update on public.profiles
  for each row execute function public.audit_row_change('user');

drop trigger if exists standards_audit on public.standards;
create trigger standards_audit
  after insert or update or delete on public.standards
  for each row execute function public.audit_row_change('standard');

drop trigger if exists categories_audit on public.categories;
create trigger categories_audit
  after insert or update or delete on public.categories
  for each row execute function public.audit_row_change('category');

drop trigger if exists subcategories_audit on public.subcategories;
create trigger subcategories_audit
  after insert or update or delete on public.subcategories
  for each row execute function public.audit_row_change('subcategory');

-- -----------------------------------------------------------------------------
-- RPC: registrar acceso reciente (upsert por usuario/documento)
-- -----------------------------------------------------------------------------
create or replace function public.touch_recent_document(p_document_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  if not public.has_permission('documents.read') then
    return;
  end if;
  if not exists (select 1 from public.documents where id = p_document_id) then
    return;
  end if;

  insert into public.recent_documents (user_id, document_id, viewed_at, view_count)
  values (auth.uid(), p_document_id, now(), 1)
  on conflict (user_id, document_id)
  do update set viewed_at = now(), view_count = public.recent_documents.view_count + 1;
end;
$$;

revoke all on function public.touch_recent_document(uuid) from public;
grant execute on function public.touch_recent_document(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- RPC: marca el último acceso del usuario actual
-- -----------------------------------------------------------------------------
create or replace function public.touch_last_sign_in()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set last_sign_in_at = now() where id = auth.uid();
$$;

revoke all on function public.touch_last_sign_in() from public;
grant execute on function public.touch_last_sign_in() to authenticated;

-- -----------------------------------------------------------------------------
-- RPC: estadísticas del dashboard (respeta RLS: security invoker)
-- -----------------------------------------------------------------------------
create or replace function public.get_dashboard_stats()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'total',    (select count(*) from public.documents),
    'draft',    (select count(*) from public.documents where status = 'draft'),
    'review',   (select count(*) from public.documents where status = 'review'),
    'approved', (select count(*) from public.documents where status = 'approved'),
    'obsolete', (select count(*) from public.documents where status = 'obsolete'),
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
        select standard_id,
               count(*) as total,
               count(*) filter (where status = 'approved') as approved
        from public.documents
        group by standard_id
      ) d on d.standard_id = s.id
      where s.active
    ), '[]'::jsonb),
    'added_last_30_days', (select count(*) from public.documents where created_at >= now() - interval '30 days'),
    'updated_last_30_days', (select count(*) from public.documents where updated_at >= now() - interval '30 days' and updated_at <> created_at)
  );
$$;

revoke all on function public.get_dashboard_stats() from public;
grant execute on function public.get_dashboard_stats() to authenticated;

-- -----------------------------------------------------------------------------
-- RPC: valores de versión distintos (para el filtro de versión)
-- -----------------------------------------------------------------------------
create or replace function public.get_document_versions_list()
returns setof text
language sql
stable
security invoker
set search_path = public
as $$
  select distinct version from public.documents order by version;
$$;

revoke all on function public.get_document_versions_list() from public;
grant execute on function public.get_document_versions_list() to authenticated;

-- -----------------------------------------------------------------------------
-- RPC: conteo de documentos por categoría/subcategoría (vista de normas)
-- -----------------------------------------------------------------------------
create or replace function public.get_taxonomy_counts()
returns table (standard_id uuid, category_id uuid, subcategory_id uuid, total bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select standard_id, category_id, subcategory_id, count(*)::bigint
  from public.documents
  group by standard_id, category_id, subcategory_id;
$$;

revoke all on function public.get_taxonomy_counts() from public;
grant execute on function public.get_taxonomy_counts() to authenticated;

-- -----------------------------------------------------------------------------
-- Permisos de esquema para roles de PostgREST
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
-- anon no necesita acceso a datos: todo requiere sesión.
revoke all on all tables in schema public from anon;
