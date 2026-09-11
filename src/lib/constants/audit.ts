import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookMarked,
  Download,
  FileEdit,
  FilePlus2,
  FileX2,
  GitBranch,
  Layers,
  LogIn,
  LogOut,
  RefreshCw,
  Shield,
  UserCheck,
  UserCog,
  UserPlus,
  UserX,
} from "lucide-react";

export const AUDIT_ACTIONS = {
  AUTH_LOGIN: "auth.login",
  AUTH_LOGOUT: "auth.logout",
  AUTH_PASSWORD_RESET: "auth.password_reset",
  DOCUMENT_CREATED: "document.created",
  DOCUMENT_UPDATED: "document.updated",
  DOCUMENT_STATUS_CHANGED: "document.status_changed",
  DOCUMENT_DELETED: "document.deleted",
  DOCUMENT_DOWNLOADED: "document.downloaded",
  DOCUMENT_VERSION_CREATED: "document.version_created",
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  USER_ROLE_CHANGED: "user.role_changed",
  USER_ACTIVATED: "user.activated",
  USER_DEACTIVATED: "user.deactivated",
  STANDARD_CREATED: "standard.created",
  STANDARD_UPDATED: "standard.updated",
  STANDARD_DELETED: "standard.deleted",
  CATEGORY_CREATED: "category.created",
  CATEGORY_UPDATED: "category.updated",
  CATEGORY_DELETED: "category.deleted",
  SUBCATEGORY_CREATED: "subcategory.created",
  SUBCATEGORY_UPDATED: "subcategory.updated",
  SUBCATEGORY_DELETED: "subcategory.deleted",
  ROLE_PERMISSIONS_UPDATED: "role.permissions_updated",
  SETTINGS_UPDATED: "settings.updated",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

interface AuditPresentation {
  label: string;
  icon: LucideIcon;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
}

const PRESENTATION: Record<string, AuditPresentation> = {
  "auth.login": { label: "Inició sesión", icon: LogIn, tone: "neutral" },
  "auth.logout": { label: "Cerró sesión", icon: LogOut, tone: "neutral" },
  "auth.password_reset": { label: "Restableció su contraseña", icon: RefreshCw, tone: "info" },
  "document.created": { label: "Creó el documento", icon: FilePlus2, tone: "success" },
  "document.updated": { label: "Actualizó el documento", icon: FileEdit, tone: "info" },
  "document.status_changed": { label: "Cambió el estado del documento", icon: RefreshCw, tone: "info" },
  "document.deleted": { label: "Eliminó el documento", icon: FileX2, tone: "danger" },
  "document.downloaded": { label: "Descargó el documento", icon: Download, tone: "neutral" },
  "document.version_created": { label: "Publicó una nueva versión de", icon: GitBranch, tone: "success" },
  "user.created": { label: "Creó el usuario", icon: UserPlus, tone: "success" },
  "user.updated": { label: "Actualizó el usuario", icon: UserCog, tone: "info" },
  "user.role_changed": { label: "Cambió el rol de", icon: Shield, tone: "warning" },
  "user.activated": { label: "Activó al usuario", icon: UserCheck, tone: "success" },
  "user.deactivated": { label: "Desactivó al usuario", icon: UserX, tone: "danger" },
  "standard.created": { label: "Creó la norma", icon: BookMarked, tone: "success" },
  "standard.updated": { label: "Actualizó la norma", icon: BookMarked, tone: "info" },
  "standard.deleted": { label: "Eliminó la norma", icon: BookMarked, tone: "danger" },
  "category.created": { label: "Creó la categoría", icon: Layers, tone: "success" },
  "category.updated": { label: "Actualizó la categoría", icon: Layers, tone: "info" },
  "category.deleted": { label: "Eliminó la categoría", icon: Layers, tone: "danger" },
  "subcategory.created": { label: "Creó la subcategoría", icon: Layers, tone: "success" },
  "subcategory.updated": { label: "Actualizó la subcategoría", icon: Layers, tone: "info" },
  "subcategory.deleted": { label: "Eliminó la subcategoría", icon: Layers, tone: "danger" },
  "role.permissions_updated": { label: "Modificó los permisos del rol", icon: Shield, tone: "warning" },
  "settings.updated": { label: "Actualizó la configuración", icon: Activity, tone: "info" },
};

export function describeAuditAction(action: string): AuditPresentation {
  return PRESENTATION[action] ?? { label: action, icon: Activity, tone: "neutral" };
}

export const AUDIT_ACTION_OPTIONS = Object.entries(PRESENTATION).map(([value, p]) => ({
  value,
  label: p.label,
}));
