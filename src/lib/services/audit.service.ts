import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { AuditLogItem, PaginatedResult } from "@/types";

const AUDIT_SELECT = "*, user:profiles ( id, full_name, email, avatar_url )";

export interface AuditQuery {
  action?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
}

export async function listAuditLogs(
  supabase: TypedSupabaseClient,
  query: AuditQuery,
): Promise<PaginatedResult<AuditLogItem>> {
  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;

  let q = supabase.from("audit_logs").select(AUDIT_SELECT, { count: "exact" });

  if (query.action) q = q.eq("action", query.action);
  if (query.entityType) q = q.eq("entity_type", query.entityType);
  if (query.entityId) q = q.eq("entity_id", query.entityId);
  if (query.userId) q = q.eq("user_id", query.userId);
  if (query.dateFrom) q = q.gte("created_at", `${query.dateFrom}T00:00:00`);
  if (query.dateTo) q = q.lte("created_at", `${query.dateTo}T23:59:59.999`);

  q = q.order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to);

  const { data, error, count } = await q.overrideTypes<AuditLogItem[], { merge: false }>();
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

/** Actividad reciente (dashboard). */
export async function getRecentActivity(
  supabase: TypedSupabaseClient,
  limit = 10,
): Promise<AuditLogItem[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select(AUDIT_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit)
    .overrideTypes<AuditLogItem[], { merge: false }>();
  if (error) throw error;
  return data ?? [];
}

/** Historial de un documento concreto. */
export async function getDocumentActivity(
  supabase: TypedSupabaseClient,
  documentId: string,
  limit = 50,
): Promise<AuditLogItem[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select(AUDIT_SELECT)
    .eq("entity_type", "document")
    .eq("entity_id", documentId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .overrideTypes<AuditLogItem[], { merge: false }>();
  if (error) throw error;
  return data ?? [];
}
