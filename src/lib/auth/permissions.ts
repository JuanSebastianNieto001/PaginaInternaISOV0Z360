import type { CurrentUser, PermissionCode } from "@/types";

/** ¿El usuario posee el permiso indicado? */
export function can(user: CurrentUser | null | undefined, permission: PermissionCode): boolean {
  if (!user || !user.isActive) return false;
  return user.permissions.includes(permission);
}

/** ¿El usuario posee al menos uno de los permisos? */
export function canAny(
  user: CurrentUser | null | undefined,
  permissions: PermissionCode[] | undefined,
): boolean {
  if (!permissions || permissions.length === 0) return true;
  return permissions.some((p) => can(user, p));
}

/** ¿El usuario posee todos los permisos? */
export function canAll(user: CurrentUser | null | undefined, permissions: PermissionCode[]): boolean {
  return permissions.every((p) => can(user, p));
}

export function isSuperAdmin(user: CurrentUser | null | undefined): boolean {
  return user?.role.code === "SUPER_ADMIN";
}
