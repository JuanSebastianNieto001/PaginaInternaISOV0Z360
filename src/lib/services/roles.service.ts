import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Permission, Role, RoleWithPermissions } from "@/types";

export async function listPermissions(supabase: TypedSupabaseClient): Promise<Permission[]> {
  const { data, error } = await supabase.from("permissions").select("*").order("module").order("code");
  if (error) throw error;
  return data ?? [];
}

/** Roles con su lista de permisos (matriz). */
export async function listRolesWithPermissions(
  supabase: TypedSupabaseClient,
): Promise<RoleWithPermissions[]> {
  const { data, error } = await supabase
    .from("roles")
    .select("*, role_permissions ( permission:permissions ( * ) )")
    .order("level", { ascending: false })
    .overrideTypes<(Role & { role_permissions: { permission: Permission | null }[] })[], { merge: false }>();
  if (error) throw error;

  return (data ?? []).map(({ role_permissions, ...role }) => ({
    ...role,
    permissions: role_permissions
      .map((rp) => rp.permission)
      .filter((p): p is Permission => p !== null)
      .sort((a, b) => a.code.localeCompare(b.code)),
  }));
}

export const PERMISSION_MODULE_LABELS: Record<string, string> = {
  documents: "Documentos",
  taxonomy: "Normas y categorías",
  users: "Usuarios y roles",
  audit: "Auditoría",
  settings: "Configuración",
};
