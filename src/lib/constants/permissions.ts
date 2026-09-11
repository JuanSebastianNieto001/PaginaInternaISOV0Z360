import type { PermissionCode, RoleCode } from "@/types";

export const PERMISSIONS = {
  DOCUMENTS_READ: "documents.read",
  DOCUMENTS_DOWNLOAD: "documents.download",
  DOCUMENTS_CREATE: "documents.create",
  DOCUMENTS_UPDATE: "documents.update",
  DOCUMENTS_DELETE: "documents.delete",
  CATEGORIES_MANAGE: "categories.manage",
  STANDARDS_MANAGE: "standards.manage",
  USERS_MANAGE: "users.manage",
  ROLES_MANAGE: "roles.manage",
  AUDIT_READ: "audit.read",
  SETTINGS_MANAGE: "settings.manage",
} as const satisfies Record<string, PermissionCode>;

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  CONSULTOR: "CONSULTOR",
  VISUALIZADOR: "VISUALIZADOR",
} as const satisfies Record<string, RoleCode>;

/** Permisos que habilitan el acceso a la sección /admin (cualquiera de ellos). */
export const ADMIN_AREA_PERMISSIONS: PermissionCode[] = [
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.ROLES_MANAGE,
  PERMISSIONS.STANDARDS_MANAGE,
  PERMISSIONS.CATEGORIES_MANAGE,
  PERMISSIONS.AUDIT_READ,
  PERMISSIONS.SETTINGS_MANAGE,
  PERMISSIONS.DOCUMENTS_DELETE,
];
