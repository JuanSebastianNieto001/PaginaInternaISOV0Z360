import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { DocumentListItem } from "@/types";

import { getDocumentsByIds } from "./documents.service";

export interface RecentlyViewedItem {
  document: DocumentListItem;
  viewedAt: string;
  viewCount: number;
}

/** Documentos vistos recientemente por el usuario actual. */
export async function getRecentlyViewed(
  supabase: TypedSupabaseClient,
  userId: string,
  limit = 20,
): Promise<RecentlyViewedItem[]> {
  const { data, error } = await supabase
    .from("recent_documents")
    .select("document_id, viewed_at, view_count")
    .eq("user_id", userId)
    .order("viewed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = data ?? [];
  const docs = await getDocumentsByIds(
    supabase,
    rows.map((r) => r.document_id),
  );
  const byId = new Map(docs.map((d) => [d.id, d]));

  return rows
    .map((r) => {
      const document = byId.get(r.document_id);
      return document ? { document, viewedAt: r.viewed_at, viewCount: r.view_count } : null;
    })
    .filter((r): r is RecentlyViewedItem => r !== null);
}
