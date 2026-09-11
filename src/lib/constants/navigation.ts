import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookMarked,
  Clock,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Layers,
  Settings,
  Settings2,
  Shield,
  ShieldCheck,
  Star,
  Tags,
  Users,
} from "lucide-react";

import type { PermissionCode } from "@/types";

import { ADMIN_AREA_PERMISSIONS, PERMISSIONS } from "./permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Si se define, basta con tener UNO de los permisos. */
  anyPermission?: PermissionCode[];
  /** Coincidencia exacta de ruta (por defecto: prefijo). */
  exact?: boolean;
}

export const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/documents", label: "Repositorio", icon: FileText },
  { href: "/recent", label: "Recientes", icon: Clock },
  { href: "/favorites", label: "Favoritos", icon: Star },
  { href: "/standards", label: "Normas", icon: BookMarked },
  { href: "/activity", label: "Actividad", icon: Activity },
];

export const SYSTEM_NAV: NavItem[] = [
  {
    href: "/admin",
    label: "Administración",
    icon: ShieldCheck,
    anyPermission: ADMIN_AREA_PERMISSIONS,
  },
  { href: "/settings", label: "Configuración", icon: Settings },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Usuarios", icon: Users, anyPermission: [PERMISSIONS.USERS_MANAGE] },
  { href: "/admin/roles", label: "Roles y permisos", icon: Shield, anyPermission: [PERMISSIONS.ROLES_MANAGE] },
  { href: "/admin/standards", label: "Normas", icon: BookMarked, anyPermission: [PERMISSIONS.STANDARDS_MANAGE] },
  { href: "/admin/categories", label: "Categorías", icon: Layers, anyPermission: [PERMISSIONS.CATEGORIES_MANAGE] },
  { href: "/admin/tags", label: "Etiquetas y tipos", icon: Tags, anyPermission: [PERMISSIONS.CATEGORIES_MANAGE] },
  { href: "/admin/documents", label: "Documentos", icon: FolderKanban, anyPermission: [PERMISSIONS.DOCUMENTS_UPDATE, PERMISSIONS.DOCUMENTS_DELETE] },
  { href: "/admin/activity", label: "Auditoría", icon: Activity, anyPermission: [PERMISSIONS.AUDIT_READ] },
  { href: "/admin/settings", label: "Ajustes del sistema", icon: Settings2, anyPermission: [PERMISSIONS.SETTINGS_MANAGE] },
];

export function isNavActive(pathname: string, item: Pick<NavItem, "href" | "exact">): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
