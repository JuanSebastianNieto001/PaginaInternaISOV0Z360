import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils/slug";
import type { Tag, TagSummary } from "@/types";

export async function listTags(supabase: TypedSupabaseClient): Promise<Tag[]> {
  const { data, error } = await supabase.from("tags").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export interface TagWithCount extends Tag {
  document_count: number;
}

export async function listTagsWithCounts(supabase: TypedSupabaseClient): Promise<TagWithCount[]> {
  const { data, error } = await supabase
    .from("tags")
    .select("*, document_tags ( count )")
    .order("name")
    .overrideTypes<(Tag & { document_tags: { count: number }[] })[], { merge: false }>();
  if (error) throw error;
  return (data ?? []).map(({ document_tags, ...tag }) => ({
    ...tag,
    document_count: document_tags?.[0]?.count ?? 0,
  }));
}

/**
 * Garantiza que existan las etiquetas indicadas (por nombre) y devuelve sus ids.
 * Crea las que falten. Requiere permiso documents.create/update (RLS).
 */
export async function ensureTags(
  supabase: TypedSupabaseClient,
  names: string[],
  userId: string,
): Promise<TagSummary[]> {
  const unique = Array.from(
    new Map(names.map((n) => n.trim()).filter(Boolean).map((n) => [slugify(n), n])).entries(),
  ).filter(([slug]) => slug.length > 0);

  if (unique.length === 0) return [];

  const slugs = unique.map(([slug]) => slug);
  const { data: existing, error } = await supabase
    .from("tags")
    .select("id, name, slug, color")
    .in("slug", slugs);
  if (error) throw error;

  const existingSlugs = new Set((existing ?? []).map((t) => t.slug));
  const toCreate = unique
    .filter(([slug]) => !existingSlugs.has(slug))
    .map(([slug, name]) => ({ slug, name, created_by: userId }));

  let created: TagSummary[] = [];
  if (toCreate.length > 0) {
    const { data, error: insertError } = await supabase
      .from("tags")
      .insert(toCreate)
      .select("id, name, slug, color");
    if (insertError) throw insertError;
    created = data ?? [];
  }

  return [...(existing ?? []), ...created];
}

/** Reemplaza el conjunto de etiquetas de un documento. */
export async function setDocumentTags(
  supabase: TypedSupabaseClient,
  documentId: string,
  tagIds: string[],
): Promise<void> {
  const { data: current, error } = await supabase
    .from("document_tags")
    .select("tag_id")
    .eq("document_id", documentId);
  if (error) throw error;

  const currentIds = new Set((current ?? []).map((r) => r.tag_id));
  const nextIds = new Set(tagIds);

  const toRemove = Array.from(currentIds).filter((id) => !nextIds.has(id));
  const toAdd = Array.from(nextIds).filter((id) => !currentIds.has(id));

  if (toRemove.length > 0) {
    const { error: delError } = await supabase
      .from("document_tags")
      .delete()
      .eq("document_id", documentId)
      .in("tag_id", toRemove);
    if (delError) throw delError;
  }

  if (toAdd.length > 0) {
    const { error: insError } = await supabase
      .from("document_tags")
      .insert(toAdd.map((tag_id) => ({ document_id: documentId, tag_id })));
    if (insError) throw insError;
  }
}
