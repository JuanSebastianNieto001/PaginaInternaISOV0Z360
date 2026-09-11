import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { DashboardStats, StandardStat } from "@/types";

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
