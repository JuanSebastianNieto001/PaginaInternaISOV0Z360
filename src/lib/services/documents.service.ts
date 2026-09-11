import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { SEARCH_CONFIG, buildPrefixTsQuery } from "@/lib/utils/search";
import type {
  DocumentDetail,
  DocumentListItem,
  DocumentQuery,
  DocumentVersionItem,
  PaginatedResult,
  ProfileSummary,
  TagSummary,
} from "@/types";

/* ----------------------------------------------------------------------------
 * Selects reutilizables
 * ------------------------------------------------------------------------- */
const LIST_SELECT = `
  id, code, name, description, status, version,
  file_name, file_extension, file_size, mime_type,
  created_at, updated_at,
  standard:standards ( id, code, name, color ),
  category:categories ( id, code, name ),
  subcategory:subcategories ( id, code, name ),
  document_type:document_types ( id, code, name ),
  area:areas ( id, code, name ),
  creator:profiles!documents_created_by_fkey ( id, full_name, email, avatar_url ),
  updater:profiles!documents_updated_by_fkey ( id, full_name, email, avatar_url )
`;

const DETAIL_SELECT = `
  ${LIST_SELECT},
  standard_id, category_id, subcategory_id, document_type_id, area_id,
  file_path, approved_at, effective_date, review_date, created_by, updated_by
`;

type RawListRow = Omit<DocumentListItem, "tags">;
type RawDetailRow = Omit<DocumentDetail, "tags">;

interface RawTagRow {
  document_id: string;
  tag: TagSummary | null;
}

/* ----------------------------------------------------------------------------
 * Etiquetas por documento (segunda consulta ligera para la página actual)
 * ------------------------------------------------------------------------- */
async function fetchTagsByDocument(
  supabase: TypedSupabaseClient,
  documentIds: string[],
): Promise<Map<string, TagSummary[]>> {
  const map = new Map<string, TagSummary[]>();
  if (documentIds.length === 0) return map;

  const { data, error } = await supabase
    .from("document_tags")
    .select("document_id, tag:tags ( id, name, slug, color )")
    .in("document_id", documentIds)
    .overrideTypes<RawTagRow[], { merge: false }>();

  if (error) throw error;

  for (const row of data ?? []) {
    if (!row.tag) continue;
    const list = map.get(row.document_id) ?? [];
    list.push(row.tag);
    map.set(row.document_id, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
  return map;
}

function attachTags<T extends { id: string }>(rows: T[], tags: Map<string, TagSummary[]>) {
  return rows.map((row) => ({ ...row, tags: tags.get(row.id) ?? [] }));
}

/* ----------------------------------------------------------------------------
 * Repositorio: listado paginado con búsqueda y filtros combinables
 * ------------------------------------------------------------------------- */
export async function listDocuments(
  supabase: TypedSupabaseClient,
  query: DocumentQuery,
): Promise<PaginatedResult<DocumentListItem>> {
  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;

  const hasTagFilter = (query.tagIds?.length ?? 0) > 0;
  const select = hasTagFilter ? `${LIST_SELECT}, document_tags!inner ( tag_id )` : LIST_SELECT;

  let q = supabase.from("documents").select(select, { count: "exact" });

  const tsq = buildPrefixTsQuery(query.q);
  if (tsq) q = q.textSearch("search_vector", tsq, { config: SEARCH_CONFIG });

  if (query.standardId) q = q.eq("standard_id", query.standardId);
  if (query.categoryId) q = q.eq("category_id", query.categoryId);
  if (query.subcategoryId) q = q.eq("subcategory_id", query.subcategoryId);
  if (query.documentTypeId) q = q.eq("document_type_id", query.documentTypeId);
  if (query.areaId) q = q.eq("area_id", query.areaId);
  if (query.status) q = q.eq("status", query.status);
  if (query.version) q = q.eq("version", query.version);
  if (query.createdBy) q = q.eq("created_by", query.createdBy);
  if (query.dateFrom) q = q.gte("updated_at", `${query.dateFrom}T00:00:00`);
  if (query.dateTo) q = q.lte("updated_at", `${query.dateTo}T23:59:59.999`);
  if (hasTagFilter) q = q.in("document_tags.tag_id", query.tagIds ?? []);

  q = q.order(query.sort, { ascending: query.direction === "asc" }).order("id", { ascending: true });
  q = q.range(from, to);

  const { data, error, count } = await q.overrideTypes<RawListRow[], { merge: false }>();
  if (error) throw error;

  const rows = data ?? [];
  const tags = await fetchTagsByDocument(
    supabase,
    rows.map((r) => r.id),
  );

  const total = count ?? 0;
  return {
    items: attachTags(rows, tags),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/* ----------------------------------------------------------------------------
 * Detalle
 * ------------------------------------------------------------------------- */
export async function getDocumentById(
  supabase: TypedSupabaseClient,
  id: string,
): Promise<DocumentDetail | null> {
  const { data, error } = await supabase
    .from("documents")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<RawDetailRow, { merge: false }>();

  if (error) throw error;
  if (!data) return null;

  const tags = await fetchTagsByDocument(supabase, [data.id]);
  return { ...data, tags: tags.get(data.id) ?? [] };
}

export async function getDocumentVersions(
  supabase: TypedSupabaseClient,
  documentId: string,
): Promise<DocumentVersionItem[]> {
  const { data, error } = await supabase
    .from("document_versions")
    .select("*, creator:profiles!document_versions_created_by_fkey ( id, full_name, email, avatar_url )")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .overrideTypes<DocumentVersionItem[], { merge: false }>();

  if (error) throw error;
  return data ?? [];
}

export async function getDocumentVersion(
  supabase: TypedSupabaseClient,
  documentId: string,
  versionId: string,
): Promise<DocumentVersionItem | null> {
  const { data, error } = await supabase
    .from("document_versions")
    .select("*, creator:profiles!document_versions_created_by_fkey ( id, full_name, email, avatar_url )")
    .eq("document_id", documentId)
    .eq("id", versionId)
    .maybeSingle()
    .overrideTypes<DocumentVersionItem, { merge: false }>();

  if (error) throw error;
  return data ?? null;
}

/* ----------------------------------------------------------------------------
 * Colecciones por ids (favoritos, recientes) conservando el orden dado
 * ------------------------------------------------------------------------- */
export async function getDocumentsByIds(
  supabase: TypedSupabaseClient,
  ids: string[],
): Promise<DocumentListItem[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("documents")
    .select(LIST_SELECT)
    .in("id", ids)
    .overrideTypes<RawListRow[], { merge: false }>();

  if (error) throw error;

  const rows = data ?? [];
  const tags = await fetchTagsByDocument(
    supabase,
    rows.map((r) => r.id),
  );
  const byId = new Map(attachTags(rows, tags).map((d) => [d.id, d]));
  return ids.map((id) => byId.get(id)).filter((d): d is DocumentListItem => Boolean(d));
}

/* ----------------------------------------------------------------------------
 * Listas cortas para dashboard / recientes
 * ------------------------------------------------------------------------- */
export async function getRecentlyAdded(
  supabase: TypedSupabaseClient,
  limit = 6,
): Promise<DocumentListItem[]> {
  const { data, error } = await supabase
    .from("documents")
    .select(LIST_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit)
    .overrideTypes<RawListRow[], { merge: false }>();

  if (error) throw error;
  const rows = data ?? [];
  const tags = await fetchTagsByDocument(
    supabase,
    rows.map((r) => r.id),
  );
  return attachTags(rows, tags);
}

export async function getRecentlyModified(
  supabase: TypedSupabaseClient,
  limit = 6,
): Promise<DocumentListItem[]> {
  const { data, error } = await supabase
    .from("documents")
    .select(LIST_SELECT)
    .order("updated_at", { ascending: false })
    .limit(limit)
    .overrideTypes<RawListRow[], { merge: false }>();

  if (error) throw error;
  const rows = data ?? [];
  const tags = await fetchTagsByDocument(
    supabase,
    rows.map((r) => r.id),
  );
  return attachTags(rows, tags);
}

/* ----------------------------------------------------------------------------
 * Autores (para el filtro "Usuario")
 * ------------------------------------------------------------------------- */
export async function getDocumentAuthors(supabase: TypedSupabaseClient): Promise<ProfileSummary[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .eq("is_active", true)
    .order("full_name");
  if (error) throw error;
  return data ?? [];
}

/** Versiones distintas existentes (para el filtro "Versión"). */
export async function getDistinctVersions(supabase: TypedSupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_document_versions_list");
  if (error) throw error;
  return (data ?? []) as string[];
}
