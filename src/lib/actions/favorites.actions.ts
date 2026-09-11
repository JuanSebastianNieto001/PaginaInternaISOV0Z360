"use server";

import { revalidatePath } from "next/cache";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

import { authorize, ok, runAction } from "./helpers";

/** Alterna el estado de favorito del documento para el usuario actual. */
export async function toggleFavorite(documentId: string): Promise<ActionResult<{ favorite: boolean }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.DOCUMENTS_READ);
    const supabase = await createClient();

    const { data: existing, error } = await supabase
      .from("favorites")
      .select("document_id")
      .eq("user_id", user.id)
      .eq("document_id", documentId)
      .maybeSingle();
    if (error) throw error;

    if (existing) {
      const { error: delError } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("document_id", documentId);
      if (delError) throw delError;
    } else {
      const { error: insError } = await supabase
        .from("favorites")
        .insert({ user_id: user.id, document_id: documentId });
      if (insError) throw insError;
    }

    revalidatePath("/favorites");
    revalidatePath(`/documents/${documentId}`);
    return ok({ favorite: !existing });
  });
}
