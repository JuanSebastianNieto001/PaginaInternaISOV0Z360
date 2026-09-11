import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { AppSetting, AppSettings, DocumentStatus, Json } from "@/types";

export const DEFAULT_SETTINGS: AppSettings = {
  org_name: "Mi Organización",
  max_file_size_mb: 20,
  allowed_extensions: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "png", "jpg", "jpeg", "zip"],
  default_status: "draft",
  recent_limit: 20,
};

function asString(v: Json | undefined, fallback: string): string {
  return typeof v === "string" && v.trim() ? v : fallback;
}
function asNumber(v: Json | undefined, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function asStringArray(v: Json | undefined, fallback: string[]): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : fallback;
}
function asStatus(v: Json | undefined, fallback: DocumentStatus): DocumentStatus {
  return v === "draft" || v === "review" || v === "approved" || v === "obsolete" ? v : fallback;
}

/** Lee toda la configuración y la tipa con valores por defecto seguros. */
export async function getAppSettings(supabase: TypedSupabaseClient): Promise<AppSettings> {
  const { data, error } = await supabase.from("app_settings").select("key, value");
  if (error) throw error;

  const map = new Map<string, Json>((data ?? []).map((r) => [r.key, r.value]));
  return {
    org_name: asString(map.get("org_name"), DEFAULT_SETTINGS.org_name),
    max_file_size_mb: asNumber(map.get("max_file_size_mb"), DEFAULT_SETTINGS.max_file_size_mb),
    allowed_extensions: asStringArray(map.get("allowed_extensions"), DEFAULT_SETTINGS.allowed_extensions),
    default_status: asStatus(map.get("default_status"), DEFAULT_SETTINGS.default_status),
    recent_limit: asNumber(map.get("recent_limit"), DEFAULT_SETTINGS.recent_limit),
  };
}

export async function listSettingRows(supabase: TypedSupabaseClient): Promise<AppSetting[]> {
  const { data, error } = await supabase.from("app_settings").select("*").order("key");
  if (error) throw error;
  return data ?? [];
}
