-- =============================================================================
-- ISO DMS · 005 · Cambio de contraseña obligatorio
-- -----------------------------------------------------------------------------
-- Añade profiles.must_change_password. Solo puede modificarse con service_role
-- (auth.uid() es null): el usuario no puede quitarse la marca a sí mismo. La app
-- la desactiva en el servidor únicamente tras cambiar la contraseña con éxito.
-- =============================================================================

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

-- El trigger de alta toma la marca de app_metadata (fijada por un administrador).
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

  insert into public.profiles (id, email, full_name, avatar_url, role_id, must_change_password)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    v_role_id,
    coalesce((new.raw_app_meta_data ->> 'must_change_password')::boolean, false)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Protección: la marca solo la cambia el servidor (service role).
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

  if new.must_change_password is distinct from old.must_change_password then
    raise exception 'La marca de cambio de contraseña solo puede modificarla el sistema.'
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

-- La auditoría genérica ya registra cambios en profiles; añadimos la marca a los
-- campos ignorados no es necesario: queda trazado como user.updated con
-- changed = ['must_change_password'].
