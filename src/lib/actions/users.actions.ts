"use server";

import { revalidatePath } from "next/cache";

import { isSuperAdmin } from "@/lib/auth/permissions";
import { AUDIT_ACTIONS } from "@/lib/constants/audit";
import { PERMISSIONS, ROLES } from "@/lib/constants/permissions";
import { publicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";
import {
  createUserSchema,
  deleteUserSchema,
  setUserActiveSchema,
  setUserPasswordSchema,
  updateUserSchema,
  type CreateUserInput,
  type SetUserPasswordInput,
  type UpdateUserInput,
} from "@/lib/validation/users";
import type { ActionResult } from "@/types";

import { authorize, fail, ok, runAction, zodFail } from "./helpers";

const ADMIN_REQUIRED =
  "Esta operación requiere configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.";

function revalidateUsers(id?: string) {
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  if (id) revalidatePath(`/admin/users/${id}`);
}

async function getRoleCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roleId: string,
): Promise<string | null> {
  const { data } = await supabase.from("roles").select("code").eq("id", roleId).maybeSingle();
  return data?.code ?? null;
}

/** Carga el perfil objetivo y verifica que el actor pueda administrarlo. */
async function loadTarget(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorIsSuperAdmin: boolean,
  id: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role_id, is_active, role:roles ( code )")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError("El usuario no existe.", "not_found");
  const roleCode = (data.role as { code: string } | null)?.code ?? "";
  if (roleCode === ROLES.SUPER_ADMIN && !actorIsSuperAdmin) {
    throw new AppError("Solo un SUPER_ADMIN puede administrar cuentas SUPER_ADMIN.", "forbidden");
  }
  return { ...data, roleCode };
}

function mapAuthAdminError(message: string): string {
  if (/already|registered|exists/i.test(message)) return "Ya existe un usuario con ese email.";
  if (/password/i.test(message)) return "La contraseña no cumple los requisitos.";
  return "No se pudo completar la operación en el servicio de autenticación.";
}

/* ----------------------------------------------------------------------------
 * Crear usuario
 * ------------------------------------------------------------------------- */
export async function createUser(
  input: CreateUserInput,
): Promise<ActionResult<{ id: string; invited: boolean }>> {
  return runAction(async () => {
    const actor = await authorize(PERMISSIONS.USERS_MANAGE);
    const parsed = createUserSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const d = parsed.data;

    const supabase = await createClient();
    const roleCode = await getRoleCode(supabase, d.roleId);
    if (!roleCode) return fail("El rol seleccionado no existe.");
    if (roleCode === ROLES.SUPER_ADMIN && !isSuperAdmin(actor)) {
      return fail("Solo un SUPER_ADMIN puede crear cuentas SUPER_ADMIN.");
    }

    const admin = createAdminClient();
    if (!admin) return fail(ADMIN_REQUIRED);

    const invite = d.mode === "invite";
    const requireChange = !invite && d.requirePasswordChange;
    let userId: string | undefined;

    if (!invite) {
      const { data, error } = await admin.auth.admin.createUser({
        email: d.email,
        password: d.password as string,
        email_confirm: true,
        app_metadata: { role_code: roleCode, must_change_password: requireChange },
        user_metadata: { full_name: d.fullName },
      });
      if (error) throw new AppError(mapAuthAdminError(error.message), "conflict");
      userId = data.user?.id;
    } else {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(d.email, {
        data: { full_name: d.fullName },
        redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/reset-password`,
      });
      if (error) throw new AppError(mapAuthAdminError(error.message), "conflict");
      userId = data.user?.id;
      if (userId) {
        await admin.auth.admin.updateUserById(userId, { app_metadata: { role_code: roleCode } });
      }
    }

    if (!userId) return fail("No se pudo crear el usuario.");

    // Garantiza rol, nombre y marca aunque el trigger no haya visto app_metadata.
    const { error: profileError } = await admin
      .from("profiles")
      .update({ role_id: d.roleId, full_name: d.fullName, must_change_password: requireChange })
      .eq("id", userId);
    if (profileError) throw profileError;

    await supabase.rpc("log_audit", {
      p_action: AUDIT_ACTIONS.USER_CREATED,
      p_entity_type: "user",
      p_entity_id: userId,
      p_metadata: {
        email: d.email,
        full_name: d.fullName,
        role: roleCode,
        invited: invite,
        require_password_change: requireChange,
      },
    });

    revalidateUsers();
    return ok({ id: userId, invited: invite });
  });
}

/* ----------------------------------------------------------------------------
 * Editar nombre y rol
 * ------------------------------------------------------------------------- */
export async function updateUser(input: UpdateUserInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await authorize(PERMISSIONS.USERS_MANAGE);
    const parsed = updateUserSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const d = parsed.data;

    const supabase = await createClient();
    const target = await loadTarget(supabase, isSuperAdmin(actor), d.id);

    const newRoleCode = await getRoleCode(supabase, d.roleId);
    if (!newRoleCode) return fail("El rol seleccionado no existe.");
    if (d.id === actor.id && d.roleId !== target.role_id) return fail("No puedes cambiar tu propio rol.");
    if (newRoleCode === ROLES.SUPER_ADMIN && !isSuperAdmin(actor)) {
      return fail("Solo un SUPER_ADMIN puede asignar el rol SUPER_ADMIN.");
    }

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: d.fullName, role_id: d.roleId })
      .eq("id", d.id);
    if (error) throw error;

    revalidateUsers(d.id);
    return ok({ id: d.id });
  });
}

/* ----------------------------------------------------------------------------
 * Activar / desactivar
 * ------------------------------------------------------------------------- */
export async function setUserActive(input: {
  id: string;
  isActive: boolean;
}): Promise<ActionResult<{ isActive: boolean }>> {
  return runAction(async () => {
    const actor = await authorize(PERMISSIONS.USERS_MANAGE);
    const parsed = setUserActiveSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const d = parsed.data;

    if (d.id === actor.id) return fail("No puedes cambiar el estado de tu propia cuenta.");

    const supabase = await createClient();
    await loadTarget(supabase, isSuperAdmin(actor), d.id);

    const { error } = await supabase.from("profiles").update({ is_active: d.isActive }).eq("id", d.id);
    if (error) throw error;

    revalidateUsers(d.id);
    return ok({ isActive: d.isActive });
  });
}

/* ----------------------------------------------------------------------------
 * Restablecer contraseña (asignada por el administrador)
 * ------------------------------------------------------------------------- */
export async function setUserPassword(
  input: SetUserPasswordInput,
): Promise<ActionResult<{ id: string; requirePasswordChange: boolean }>> {
  return runAction(async () => {
    const actor = await authorize(PERMISSIONS.USERS_MANAGE);
    const parsed = setUserPasswordSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const d = parsed.data;

    const supabase = await createClient();
    const target = await loadTarget(supabase, isSuperAdmin(actor), d.id);

    const admin = createAdminClient();
    if (!admin) return fail(ADMIN_REQUIRED);

    // Si el actor se cambia su propia contraseña, no debe quedar bloqueado.
    const requireChange = d.id === actor.id ? false : d.requirePasswordChange;

    const { error } = await admin.auth.admin.updateUserById(d.id, {
      password: d.password,
      app_metadata: { must_change_password: requireChange },
    });
    if (error) throw new AppError(mapAuthAdminError(error.message), "conflict");

    const { error: flagError } = await admin
      .from("profiles")
      .update({ must_change_password: requireChange })
      .eq("id", d.id);
    if (flagError) throw flagError;

    await supabase.rpc("log_audit", {
      p_action: AUDIT_ACTIONS.USER_PASSWORD_RESET,
      p_entity_type: "user",
      p_entity_id: d.id,
      p_metadata: { email: target.email, full_name: target.full_name, require_password_change: requireChange },
    });

    revalidateUsers(d.id);
    return ok({ id: d.id, requirePasswordChange: requireChange });
  });
}

/* ----------------------------------------------------------------------------
 * Eliminar usuario (Auth + perfil). Los documentos que creó se conservan con
 * autor "Usuario eliminado"; la auditoría conserva sus registros.
 * ------------------------------------------------------------------------- */
export async function deleteUser(input: { id: string }): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await authorize(PERMISSIONS.USERS_MANAGE);
    const parsed = deleteUserSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const d = parsed.data;

    if (d.id === actor.id) return fail("No puedes eliminar tu propia cuenta.");

    const supabase = await createClient();
    const target = await loadTarget(supabase, isSuperAdmin(actor), d.id);

    if (target.roleCode === ROLES.SUPER_ADMIN) {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role_id", target.role_id)
        .eq("is_active", true);
      if ((count ?? 0) <= 1) return fail("No se puede eliminar el único SUPER_ADMIN activo.");
    }

    const admin = createAdminClient();
    if (!admin) return fail(ADMIN_REQUIRED);

    // Registrar antes de borrar para conservar email/nombre en el metadato.
    await supabase.rpc("log_audit", {
      p_action: AUDIT_ACTIONS.USER_DELETED,
      p_entity_type: "user",
      p_entity_id: d.id,
      p_metadata: { email: target.email, full_name: target.full_name, role: target.roleCode },
    });

    const { error } = await admin.auth.admin.deleteUser(d.id);
    if (error) throw new AppError("No se pudo eliminar el usuario en el servicio de autenticación.", "unknown");

    revalidateUsers();
    return ok({ id: d.id });
  });
}
