"use server";

import { createClient } from "@/lib/supabase/server";

/** Registra la visualización de un documento por el usuario actual. */
export async function trackDocumentView(documentId: string): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.rpc("touch_recent_document", { p_document_id: documentId });
  } catch {
    // Silencioso: el seguimiento de recientes nunca debe romper la navegación.
  }
}
