import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { PaginatedResult, Role, UserListItem } from "@/types";

const USER_SELECT = "*, role:roles ( id, code, name, level )";

export interface UserQuery {
  q?: string;
  roleId?: string;
  active?: boolean;
  page: number;
  pageSize: number;
}

export async function listUsers(
  supabase: TypedSupabaseClient,
  query: UserQuery,
): Promise<PaginatedResult<UserListItem>> {
  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;

  let q = supabase.from("profiles").select(USER_SELECT, { count: "exact" });

  if (query.q) {
    const term = query.q.replace(/[%_,()]/g, " ").trim();
    if (term) q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  }
  if (query.roleId) q = q.eq("role_id", query.roleId);
  if (typeof query.active === "boolean") q = q.eq("is_active", query.active);

  q = q.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await q.overrideTypes<UserListItem[], { merge: false }>();
  if (error) throw error;

  const total = count ?? 0;
  return {
    items: data ?? [],
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getUserById(
  supabase: TypedSupabaseClient,
  id: string,
): Promise<UserListItem | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(USER_SELECT)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<UserListItem, { merge: false }>();
  if (error) throw error;
  return data ?? null;
}

export async function listRoles(supabase: TypedSupabaseClient): Promise<Role[]> {
  const { data, error } = await supabase.from("roles").select("*").order("level", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: { role: Pick<Role, "id" | "code" | "name">; count: number }[];
}

export async function getUserStats(supabase: TypedSupabaseClient): Promise<UserStats> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_active, role:roles ( id, code, name )")
    .overrideTypes<{ is_active: boolean; role: Pick<Role, "id" | "code" | "name"> | null }[], { merge: false }>();
  if (error) throw error;

  const rows = data ?? [];
  const byRoleMap = new Map<string, { role: Pick<Role, "id" | "code" | "name">; count: number }>();
  for (const r of rows) {
    if (!r.role) continue;
    const entry = byRoleMap.get(r.role.id) ?? { role: r.role, count: 0 };
    entry.count += 1;
    byRoleMap.set(r.role.id, entry);
  }

  return {
    total: rows.length,
    active: rows.filter((r) => r.is_active).length,
    inactive: rows.filter((r) => !r.is_active).length,
    byRole: Array.from(byRoleMap.values()).sort((a, b) => b.count - a.count),
  };
}
