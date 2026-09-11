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
  setUserActiveSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/lib/validation/users";
import type { ActionResult } from "@/types";

import { authorize, fail, ok, runAction, zodFail } from "./helpers";

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

/* ----------------------------------------------------------------------------
 * Crear usuario (Supabase Auth Admin API, solo servidor)
 * ------------------------------------------------------------------------- */
export async function createUser(input: CreateUserInput): Promise<ActionResult<{ id: string; invited: boolean }>> {
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
    if (!admin) {
      return fail(
        "La creación de usuarios requiere configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.",
      );
    }

    const usePassword = Boolean(d.password && d.password.length > 0);
    let userId: string | undefined;

    if (usePassword) {
      const { data, error } = await admin.auth.admin.createUser({
        email: d.email,
        password: d.password as string,
        email_confirm: true,
        app_metadata: { role_code: roleCode },
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
      // inviteUserByEmail no admite app_metadata: fijarla después.
      if (userId) {
        await admin.auth.admin.updateUserById(userId, { app_metadata: { role_code: roleCode } });
      }
    }

    if (!userId) return fail("No se pudo crear el usuario.");

    // El trigger handle_new_user crea el perfil con VISUALIZADOR por defecto si
    // app_metadata aún no estaba disponible: aseguramos rol y nombre.
    const { error: profileError } = await admin
      .from("profiles")
      .update({ role_id: d.roleId, full_name: d.fullName })
      .eq("id", userId);
    if (profileError) throw profileError;

    await supabase.rpc("log_audit", {
      p_action: AUDIT_ACTIONS.USER_CREATED,
      p_entity_type: "user",
      p_entity_id: userId,
      p_metadata: { email: d.email, full_name: d.fullName, role: roleCode, invited: !usePassword },
    });

    revalidateUsers();
    return ok({ id: userId, invited: !usePassword });
  });
}

function mapAuthAdminError(message: string): string {
  if (/already|registered|exists/i.test(message)) return "Ya existe un usuario con ese email.";
  if (/password/i.test(message)) return "La contraseña no cumple los requisitos.";
  return "No se pudo crear el usuario en el servicio de autenticación.";
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

    const { data: target, error: fetchError } = await supabase
      .from("profiles")
      .select("id, role_id, role:roles ( code )")
      .eq("id", d.id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!target) return fail("El usuario no existe.");

    const targetRoleCode = (target.role as { code: string } | null)?.code;
    const newRoleCode = await getRoleCode(supabase, d.roleId);
    if (!newRoleCode) return fail("El rol seleccionado no existe.");

    if (d.id === actor.id && d.roleId !== target.role_id) {
      return fail("No puedes cambiar tu propio rol.");
    }
    if ((targetRoleCode === ROLES.SUPER_ADMIN || newRoleCode === ROLES.SUPER_ADMIN) && !isSuperAdmin(actor)) {
      return fail("Solo un SUPER_ADMIN puede administrar cuentas SUPER_ADMIN.");
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
export async function setUserActive(input: { id: string; isActive: boolean }): Promise<ActionResult<{ isActive: boolean }>> {
  return runAction(async () => {
    const actor = await authorize(PERMISSIONS.USERS_MANAGE);
    const parsed = setUserActiveSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const d = parsed.data;

    if (d.id === actor.id) return fail("No puedes cambiar el estado de tu propia cuenta.");

    const supabase = await createClient();
    const { error } = await supabase.from("profiles").update({ is_active: d.isActive }).eq("id", d.id);
    if (error) throw error;

    revalidateUsers(d.id);
    return ok({ isActive: d.isActive });
  });
}
