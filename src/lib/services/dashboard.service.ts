import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { DashboardStats, StandardContributor, StandardStat } from "@/types";

const EMPTY: DashboardStats = {
  total: 0,
  draft: 0,
  review: 0,
  approved: 0,
  obsolete: 0,
  by_standard: [],
  added_last_30_days: 0,
  updated_last_30_days: 0,
};

function toNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Estadísticas agregadas en una única llamada RPC (security invoker → RLS).
 */
export async function getDashboardStats(supabase: TypedSupabaseClient): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc("get_dashboard_stats");
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) return EMPTY;

  const raw = data as Record<string, unknown>;
  const byStandardRaw = Array.isArray(raw.by_standard) ? raw.by_standard : [];

  const by_standard: StandardStat[] = byStandardRaw
    .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
    .map((s) => ({
      standard_id: String(s.standard_id ?? ""),
      code: String(s.code ?? ""),
      name: String(s.name ?? ""),
      color: typeof s.color === "string" ? s.color : null,
      total: toNumber(s.total),
      approved: toNumber(s.approved),
    }));

  return {
    total: toNumber(raw.total),
    draft: toNumber(raw.draft),
    review: toNumber(raw.review),
    approved: toNumber(raw.approved),
    obsolete: toNumber(raw.obsolete),
    by_standard,
    added_last_30_days: toNumber(raw.added_last_30_days),
    updated_last_30_days: toNumber(raw.updated_last_30_days),
  };
}

/* ----------------------------------------------------------------------------
 * Usuarios más implicados en una norma
 * Solo lectura: se agregan los registros de auditoría de tipo `document`
 * correspondientes a los documentos de la norma. La RLS sigue aplicando (un
 * usuario sin `audit.read` solo ve actividad documental, que es la que aquí
 * se agrega).
 * ------------------------------------------------------------------------- */

/** Documentos de la norma que se tienen en cuenta (acota la longitud de la consulta). */
const CONTRIBUTOR_DOCUMENT_LIMIT = 100;
/** Registros de auditoría leídos para la agregación. */
const CONTRIBUTOR_LOG_LIMIT = 600;

interface RawContributorRow {
  user_id: string | null;
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    role: { name: string } | null;
  } | null;
}

export async function getStandardContributors(
  supabase: TypedSupabaseClient,
  standardId: string,
  limit = 4,
): Promise<StandardContributor[]> {
  const { data: docs, error: docsError } = await supabase
    .from("documents")
    .select("id")
    .eq("standard_id", standardId)
    .order("updated_at", { ascending: false })
    .limit(CONTRIBUTOR_DOCUMENT_LIMIT);
  if (docsError) throw docsError;

  const documentIds = (docs ?? []).map((d) => d.id);
  if (documentIds.length === 0) return [];

  const { data, error } = await supabase
    .from("audit_logs")
    .select("user_id, user:profiles ( id, full_name, email, avatar_url, role:roles ( name ) )")
    .eq("entity_type", "document")
    .in("entity_id", documentIds)
    .order("created_at", { ascending: false })
    .limit(CONTRIBUTOR_LOG_LIMIT)
    .overrideTypes<RawContributorRow[], { merge: false }>();
  if (error) throw error;

  const byUser = new Map<string, StandardContributor>();
  for (const row of data ?? []) {
    const profile = row.user;
    if (!profile) continue;
    const current = byUser.get(profile.id);
    if (current) {
      current.actions += 1;
      continue;
    }
    byUser.set(profile.id, {
      id: profile.id,
      fullName: profile.full_name || profile.email,
      email: profile.email,
      avatarUrl: profile.avatar_url,
      roleName: profile.role?.name ?? null,
      actions: 1,
    });
  }

  return Array.from(byUser.values())
    .sort((a, b) => b.actions - a.actions || a.fullName.localeCompare(b.fullName))
    .slice(0, limit);
}
