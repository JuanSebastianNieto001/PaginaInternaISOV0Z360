import type { DocumentStatus, Json, Tables } from "@/lib/supabase/database.types";

export type { DocumentStatus, Json };

/* ----------------------------------------------------------------------------
 * Filas base
 * ------------------------------------------------------------------------- */
export type Role = Tables<"roles">;
export type Permission = Tables<"permissions">;
export type RolePermission = Tables<"role_permissions">;
export type Profile = Tables<"profiles">;
export type Standard = Tables<"standards">;
export type Category = Tables<"categories">;
export type Subcategory = Tables<"subcategories">;
export type DocumentType = Tables<"document_types">;
export type DocumentRow = Tables<"documents">;
export type DocumentVersion = Tables<"document_versions">;
export type Tag = Tables<"tags">;
export type Favorite = Tables<"favorites">;
export type RecentDocument = Tables<"recent_documents">;
export type AuditLog = Tables<"audit_logs">;
export type AppSetting = Tables<"app_settings">;

/* ----------------------------------------------------------------------------
 * Códigos de permiso y rol
 * ------------------------------------------------------------------------- */
export type PermissionCode =
  | "documents.read"
  | "documents.download"
  | "documents.create"
  | "documents.update"
  | "documents.delete"
  | "categories.manage"
  | "standards.manage"
  | "users.manage"
  | "roles.manage"
  | "audit.read"
  | "settings.manage";

export type RoleCode = "SUPER_ADMIN" | "ADMIN" | "CONSULTOR" | "VISUALIZADOR";

/* ----------------------------------------------------------------------------
 * Usuario actual (sesión + perfil + permisos)
 * ------------------------------------------------------------------------- */
export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  isActive: boolean;
  role: Pick<Role, "id" | "code" | "name" | "level">;
  permissions: PermissionCode[];
}

/* ----------------------------------------------------------------------------
 * Proyecciones utilizadas por la UI
 * ------------------------------------------------------------------------- */
export interface ProfileSummary {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

export interface TagSummary {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

export interface DocumentListItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: DocumentStatus;
  version: string;
  file_name: string;
  file_extension: string;
  file_size: number;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
  standard: Pick<Standard, "id" | "code" | "name" | "color"> | null;
  category: Pick<Category, "id" | "code" | "name"> | null;
  subcategory: Pick<Subcategory, "id" | "code" | "name"> | null;
  document_type: Pick<DocumentType, "id" | "code" | "name"> | null;
  creator: ProfileSummary | null;
  updater: ProfileSummary | null;
  tags: TagSummary[];
}

export interface DocumentDetail extends DocumentListItem {
  standard_id: string;
  category_id: string;
  subcategory_id: string | null;
  document_type_id: string;
  file_path: string;
  approved_at: string | null;
  effective_date: string | null;
  review_date: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface DocumentVersionItem extends DocumentVersion {
  creator: ProfileSummary | null;
}

export interface AuditLogItem extends AuditLog {
  user: ProfileSummary | null;
}

export interface UserListItem extends Profile {
  role: Pick<Role, "id" | "code" | "name" | "level">;
}

export interface CategoryWithSubcategories extends Category {
  subcategories: Subcategory[];
}

export interface StandardWithCategories extends Standard {
  categories: CategoryWithSubcategories[];
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

/* ----------------------------------------------------------------------------
 * Consultas del repositorio
 * ------------------------------------------------------------------------- */
export type DocumentSortField =
  | "name"
  | "code"
  | "status"
  | "version"
  | "created_at"
  | "updated_at";

export type SortDirection = "asc" | "desc";

export interface DocumentFilters {
  q?: string;
  standardId?: string;
  categoryId?: string;
  subcategoryId?: string;
  documentTypeId?: string;
  status?: DocumentStatus;
  version?: string;
  dateFrom?: string;
  dateTo?: string;
  createdBy?: string;
  tagIds?: string[];
}

export interface DocumentQuery extends DocumentFilters {
  page: number;
  pageSize: number;
  sort: DocumentSortField;
  direction: SortDirection;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* ----------------------------------------------------------------------------
 * Dashboard
 * ------------------------------------------------------------------------- */
export interface StandardStat {
  standard_id: string;
  code: string;
  name: string;
  color: string | null;
  total: number;
  approved: number;
}

export interface DashboardStats {
  total: number;
  draft: number;
  review: number;
  approved: number;
  obsolete: number;
  by_standard: StandardStat[];
  added_last_30_days: number;
  updated_last_30_days: number;
}

/* ----------------------------------------------------------------------------
 * Configuración de la app
 * ------------------------------------------------------------------------- */
export interface AppSettings {
  org_name: string;
  max_file_size_mb: number;
  allowed_extensions: string[];
  default_status: DocumentStatus;
  recent_limit: number;
}

/* ----------------------------------------------------------------------------
 * Resultado estándar de Server Actions
 * ------------------------------------------------------------------------- */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
