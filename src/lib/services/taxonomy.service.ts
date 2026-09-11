import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type {
  Area,
  Category,
  CategoryWithSubcategories,
  DocumentType,
  Standard,
  StandardWithCategories,
  Subcategory,
} from "@/types";

interface TaxonomyOptions {
  /** Incluir registros inactivos (solo administración). */
  includeInactive?: boolean;
}

export async function listStandards(
  supabase: TypedSupabaseClient,
  { includeInactive = false }: TaxonomyOptions = {},
): Promise<Standard[]> {
  let q = supabase.from("standards").select("*").order("sort_order").order("name");
  if (!includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getStandardById(
  supabase: TypedSupabaseClient,
  id: string,
): Promise<Standard | null> {
  const { data, error } = await supabase.from("standards").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listCategories(
  supabase: TypedSupabaseClient,
  { includeInactive = false, standardId }: TaxonomyOptions & { standardId?: string } = {},
): Promise<Category[]> {
  let q = supabase.from("categories").select("*").order("sort_order").order("name");
  if (!includeInactive) q = q.eq("active", true);
  if (standardId) q = q.eq("standard_id", standardId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function listSubcategories(
  supabase: TypedSupabaseClient,
  { includeInactive = false, categoryId }: TaxonomyOptions & { categoryId?: string } = {},
): Promise<Subcategory[]> {
  let q = supabase.from("subcategories").select("*").order("sort_order").order("name");
  if (!includeInactive) q = q.eq("active", true);
  if (categoryId) q = q.eq("category_id", categoryId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function listDocumentTypes(
  supabase: TypedSupabaseClient,
  { includeInactive = false }: TaxonomyOptions = {},
): Promise<DocumentType[]> {
  let q = supabase.from("document_types").select("*").order("sort_order").order("name");
  if (!includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/**
 * Árbol completo Norma → Categoría → Subcategoría en tres consultas
 * (evita N+1) y lo ensambla en memoria.
 */
export async function getTaxonomyTree(
  supabase: TypedSupabaseClient,
  options: TaxonomyOptions = {},
): Promise<StandardWithCategories[]> {
  const [standards, categories, subcategories] = await Promise.all([
    listStandards(supabase, options),
    listCategories(supabase, options),
    listSubcategories(supabase, options),
  ]);

  const subsByCategory = new Map<string, Subcategory[]>();
  for (const s of subcategories) {
    const list = subsByCategory.get(s.category_id) ?? [];
    list.push(s);
    subsByCategory.set(s.category_id, list);
  }

  const catsByStandard = new Map<string, CategoryWithSubcategories[]>();
  for (const c of categories) {
    const list = catsByStandard.get(c.standard_id) ?? [];
    list.push({ ...c, subcategories: subsByCategory.get(c.id) ?? [] });
    catsByStandard.set(c.standard_id, list);
  }

  return standards.map((s) => ({ ...s, categories: catsByStandard.get(s.id) ?? [] }));
}

/** Áreas o cargos responsables. Dimensión global, no cuelga de una norma. */
export async function listAreas(
  supabase: TypedSupabaseClient,
  { includeInactive = false }: TaxonomyOptions = {},
): Promise<Area[]> {
  let q = supabase.from("areas").select("*").order("sort_order").order("name");
  if (!includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export interface AreaCount {
  area_id: string;
  total: number;
}

/** Conteo de documentos por área (dashboard). */
export async function getAreaCounts(supabase: TypedSupabaseClient): Promise<AreaCount[]> {
  const { data, error } = await supabase.rpc("get_area_counts");
  if (error) throw error;
  return (data ?? []).map((r) => ({ area_id: r.area_id, total: Number(r.total) }));
}

export interface TaxonomyCount {
  standard_id: string;
  category_id: string;
  subcategory_id: string | null;
  total: number;
}

/** Conteo de documentos agrupado por norma/categoría/subcategoría. */
export async function getTaxonomyCounts(supabase: TypedSupabaseClient): Promise<TaxonomyCount[]> {
  const { data, error } = await supabase.rpc("get_taxonomy_counts");
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, total: Number(r.total) }));
}

/** Datos necesarios para los formularios de documento y los filtros. */
export async function getDocumentFormOptions(supabase: TypedSupabaseClient) {
  const [tree, documentTypes, areas] = await Promise.all([
    getTaxonomyTree(supabase),
    listDocumentTypes(supabase),
    listAreas(supabase),
  ]);
  return { tree, documentTypes, areas };
}
