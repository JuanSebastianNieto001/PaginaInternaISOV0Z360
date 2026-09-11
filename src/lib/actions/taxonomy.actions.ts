"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils/slug";
import {
  categorySchema,
  deleteByIdSchema,
  documentTypeSchema,
  standardSchema,
  subcategorySchema,
  tagSchema,
} from "@/lib/validation/taxonomy";
import type { ActionResult } from "@/types";

import { authorize, fail, ok, runAction, zodFail } from "./helpers";

function revalidateTaxonomy() {
  revalidatePath("/admin/standards");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/tags");
  revalidatePath("/standards");
  revalidatePath("/documents");
  revalidatePath("/dashboard");
}

/* ----------------------------------------------------------------------------
 * Normas
 * ------------------------------------------------------------------------- */
export async function upsertStandard(input: z.input<typeof standardSchema>): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    await authorize(PERMISSIONS.STANDARDS_MANAGE);
    const parsed = standardSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const d = parsed.data;

    const supabase = await createClient();
    const payload = {
      code: d.code.toUpperCase(),
      name: d.name,
      description: d.description || null,
      color: d.color || null,
      active: d.active,
      sort_order: d.sortOrder,
    };

    const { data, error } = d.id
      ? await supabase.from("standards").update(payload).eq("id", d.id).select("id").single()
      : await supabase.from("standards").insert(payload).select("id").single();
    if (error) throw error;

    revalidateTaxonomy();
    return ok({ id: data.id });
  });
}

export async function deleteStandard(input: { id: string }): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    await authorize(PERMISSIONS.STANDARDS_MANAGE);
    const parsed = deleteByIdSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);

    const supabase = await createClient();
    const { count } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("standard_id", parsed.data.id);
    if ((count ?? 0) > 0) {
      return fail("No se puede eliminar: hay documentos asociados. Desactívala en su lugar.");
    }

    const { error } = await supabase.from("standards").delete().eq("id", parsed.data.id);
    if (error) throw error;

    revalidateTaxonomy();
    return ok({ id: parsed.data.id });
  });
}

/* ----------------------------------------------------------------------------
 * Categorías
 * ------------------------------------------------------------------------- */
export async function upsertCategory(input: z.input<typeof categorySchema>): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    await authorize(PERMISSIONS.CATEGORIES_MANAGE);
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const d = parsed.data;

    const supabase = await createClient();
    const payload = {
      standard_id: d.standardId,
      code: d.code.toUpperCase(),
      name: d.name,
      description: d.description || null,
      active: d.active,
      sort_order: d.sortOrder,
    };

    const { data, error } = d.id
      ? await supabase.from("categories").update(payload).eq("id", d.id).select("id").single()
      : await supabase.from("categories").insert(payload).select("id").single();
    if (error) throw error;

    revalidateTaxonomy();
    return ok({ id: data.id });
  });
}

export async function deleteCategory(input: { id: string }): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    await authorize(PERMISSIONS.CATEGORIES_MANAGE);
    const parsed = deleteByIdSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);

    const supabase = await createClient();
    const { count } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("category_id", parsed.data.id);
    if ((count ?? 0) > 0) {
      return fail("No se puede eliminar: hay documentos asociados. Desactívala en su lugar.");
    }

    const { error } = await supabase.from("categories").delete().eq("id", parsed.data.id);
    if (error) throw error;

    revalidateTaxonomy();
    return ok({ id: parsed.data.id });
  });
}

/* ----------------------------------------------------------------------------
 * Subcategorías
 * ------------------------------------------------------------------------- */
export async function upsertSubcategory(
  input: z.input<typeof subcategorySchema>,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    await authorize(PERMISSIONS.CATEGORIES_MANAGE);
    const parsed = subcategorySchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const d = parsed.data;

    const supabase = await createClient();
    const payload = {
      category_id: d.categoryId,
      code: d.code.toUpperCase(),
      name: d.name,
      description: d.description || null,
      active: d.active,
      sort_order: d.sortOrder,
    };

    const { data, error } = d.id
      ? await supabase.from("subcategories").update(payload).eq("id", d.id).select("id").single()
      : await supabase.from("subcategories").insert(payload).select("id").single();
    if (error) throw error;

    revalidateTaxonomy();
    return ok({ id: data.id });
  });
}

export async function deleteSubcategory(input: { id: string }): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    await authorize(PERMISSIONS.CATEGORIES_MANAGE);
    const parsed = deleteByIdSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);

    const supabase = await createClient();
    const { count } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("subcategory_id", parsed.data.id);
    if ((count ?? 0) > 0) {
      return fail("No se puede eliminar: hay documentos asociados. Desactívala en su lugar.");
    }

    const { error } = await supabase.from("subcategories").delete().eq("id", parsed.data.id);
    if (error) throw error;

    revalidateTaxonomy();
    return ok({ id: parsed.data.id });
  });
}

/* ----------------------------------------------------------------------------
 * Tipos de documento
 * ------------------------------------------------------------------------- */
export async function upsertDocumentType(
  input: z.input<typeof documentTypeSchema>,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    await authorize(PERMISSIONS.CATEGORIES_MANAGE);
    const parsed = documentTypeSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const d = parsed.data;

    const supabase = await createClient();
    const payload = {
      code: d.code,
      name: d.name,
      description: d.description || null,
      active: d.active,
      sort_order: d.sortOrder,
    };

    const { data, error } = d.id
      ? await supabase.from("document_types").update(payload).eq("id", d.id).select("id").single()
      : await supabase.from("document_types").insert(payload).select("id").single();
    if (error) throw error;

    revalidateTaxonomy();
    return ok({ id: data.id });
  });
}

export async function deleteDocumentType(input: { id: string }): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    await authorize(PERMISSIONS.CATEGORIES_MANAGE);
    const parsed = deleteByIdSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);

    const supabase = await createClient();
    const { count } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("document_type_id", parsed.data.id);
    if ((count ?? 0) > 0) {
      return fail("No se puede eliminar: hay documentos de este tipo. Desactívalo en su lugar.");
    }

    const { error } = await supabase.from("document_types").delete().eq("id", parsed.data.id);
    if (error) throw error;

    revalidateTaxonomy();
    return ok({ id: parsed.data.id });
  });
}

/* ----------------------------------------------------------------------------
 * Etiquetas
 * ------------------------------------------------------------------------- */
export async function upsertTag(input: z.input<typeof tagSchema>): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.CATEGORIES_MANAGE);
    const parsed = tagSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const d = parsed.data;

    const slug = slugify(d.name);
    if (!slug) return fail("El nombre de la etiqueta no es válido.");

    const supabase = await createClient();
    const payload = { name: d.name, slug, color: d.color || null };

    const { data, error } = d.id
      ? await supabase.from("tags").update(payload).eq("id", d.id).select("id").single()
      : await supabase.from("tags").insert({ ...payload, created_by: user.id }).select("id").single();
    if (error) throw error;

    revalidateTaxonomy();
    return ok({ id: data.id });
  });
}

export async function deleteTag(input: { id: string }): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    await authorize(PERMISSIONS.CATEGORIES_MANAGE);
    const parsed = deleteByIdSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);

    const supabase = await createClient();
    const { error } = await supabase.from("tags").delete().eq("id", parsed.data.id);
    if (error) throw error;

    revalidateTaxonomy();
    return ok({ id: parsed.data.id });
  });
}
