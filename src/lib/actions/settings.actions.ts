"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTIONS } from "@/lib/constants/audit";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createClient } from "@/lib/supabase/server";
import { appSettingsSchema, type AppSettingsInput } from "@/lib/validation/settings";
import type { ActionResult, Json } from "@/types";

import { authorize, ok, runAction, zodFail } from "./helpers";

export async function updateAppSettings(input: AppSettingsInput): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.SETTINGS_MANAGE);
    const parsed = appSettingsSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const d = parsed.data;

    const supabase = await createClient();
    const rows: { key: string; value: Json }[] = [
      { key: "org_name", value: d.orgName },
      { key: "max_file_size_mb", value: d.maxFileSizeMb },
      { key: "allowed_extensions", value: d.allowedExtensions },
      { key: "default_status", value: d.defaultStatus },
      { key: "recent_limit", value: d.recentLimit },
    ];

    const { error } = await supabase.from("app_settings").upsert(
      rows.map((r) => ({ ...r, updated_by: user.id, updated_at: new Date().toISOString() })),
      { onConflict: "key" },
    );
    if (error) throw error;

    await supabase.rpc("log_audit", {
      p_action: AUDIT_ACTIONS.SETTINGS_UPDATED,
      p_entity_type: "settings",
      p_entity_id: null,
      p_metadata: { keys: rows.map((r) => r.key) },
    });

    revalidatePath("/", "layout");
    return ok(undefined);
  });
}
