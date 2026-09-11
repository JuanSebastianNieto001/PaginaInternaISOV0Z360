import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { DocumentListItem } from "@/types";

import { getDocumentsByIds } from "./documents.service";

/** Ids de documentos favoritos del usuario actual (RLS limita a sus filas). */
export async function getFavoriteIds(supabase: TypedSupabaseClient, userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select("document_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((f) => f.document_id);
}

export async function getFavoriteDocuments(
  supabase: TypedSupabaseClient,
  userId: string,
): Promise<DocumentListItem[]> {
  const ids = await getFavoriteIds(supabase, userId);
  return getDocumentsByIds(supabase, ids);
}

export async function isFavorite(
  supabase: TypedSupabaseClient,
  userId: string,
  documentId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("favorites")
    .select("document_id")
    .eq("user_id", userId)
    .eq("document_id", documentId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
