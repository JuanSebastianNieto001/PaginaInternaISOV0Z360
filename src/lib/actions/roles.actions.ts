"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTIONS } from "@/lib/constants/audit";
import { PERMISSIONS, ROLES } from "@/lib/constants/permissions";
import { createClient } from "@/lib/supabase/server";
import { setRolePermissionsSchema } from "@/lib/validation/users";
import type { ActionResult } from "@/types";

import { authorize, fail, ok, runAction, zodFail } from "./helpers";

/** Reemplaza el conjunto de permisos de un rol (excepto SUPER_ADMIN). */
export async function setRolePermissions(input: {
  roleId: string;
  permissionIds: string[];
}): Promise<ActionResult<{ roleId: string }>> {
  return runAction(async () => {
    await authorize(PERMISSIONS.ROLES_MANAGE);
    const parsed = setRolePermissionsSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const d = parsed.data;

    const supabase = await createClient();
    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id, code, name")
      .eq("id", d.roleId)
      .maybeSingle();
    if (roleError) throw roleError;
    if (!role) return fail("El rol no existe.");
    if (role.code === ROLES.SUPER_ADMIN) return fail("Los permisos de SUPER_ADMIN no se pueden modificar.");

    // El permiso base de lectura es obligatorio para cualquier rol operativo.
    const { data: readPerm } = await supabase
      .from("permissions")
      .select("id")
      .eq("code", PERMISSIONS.DOCUMENTS_READ)
      .maybeSingle();
    const nextIds = new Set(d.permissionIds);
    if (readPerm) nextIds.add(readPerm.id);

    const { data: current, error: currentError } = await supabase
      .from("role_permissions")
      .select("permission_id")
      .eq("role_id", d.roleId);
    if (currentError) throw currentError;

    const currentIds = new Set((current ?? []).map((r) => r.permission_id));
    const toAdd = Array.from(nextIds).filter((id) => !currentIds.has(id));
    const toRemove = Array.from(currentIds).filter((id) => !nextIds.has(id));

    if (toRemove.length > 0) {
      const { error } = await supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", d.roleId)
        .in("permission_id", toRemove);
      if (error) throw error;
    }
    if (toAdd.length > 0) {
      const { error } = await supabase
        .from("role_permissions")
        .insert(toAdd.map((permission_id) => ({ role_id: d.roleId, permission_id })));
      if (error) throw error;
    }

    await supabase.rpc("log_audit", {
      p_action: AUDIT_ACTIONS.ROLE_PERMISSIONS_UPDATED,
      p_entity_type: "role",
      p_entity_id: d.roleId,
      p_metadata: { role: role.code, added: toAdd.length, removed: toRemove.length },
    });

    revalidatePath("/admin/roles");
    return ok({ roleId: d.roleId });
  });
}
