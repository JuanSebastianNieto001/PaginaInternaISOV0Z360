"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ACTIONS } from "@/lib/constants/audit";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { compareVersions } from "@/lib/constants/documents";
import { getAppSettings } from "@/lib/services/settings.service";
import { ensureTags, setDocumentTags } from "@/lib/services/tags.service";
import { removeFiles } from "@/lib/storage/server";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/utils/errors";
import {
  changeStatusSchema,
  createDocumentSchema,
  createVersionSchema,
  updateDocumentSchema,
  type CreateDocumentInput,
  type CreateVersionInput,
  type UpdateDocumentInput,
} from "@/lib/validation/documents";
import type { ActionResult, DocumentStatus } from "@/types";

import { authorize, fail, ok, runAction, zodFail } from "./helpers";

function revalidateDocumentPaths(id?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/documents");
  revalidatePath("/recent");
  revalidatePath("/favorites");
  revalidatePath("/standards");
  revalidatePath("/activity");
  revalidatePath("/admin/documents");
  if (id) revalidatePath(`/documents/${id}`);
}

/**
 * Deja en `document_standards` exactamente las normas recibidas. La primera de
 * la lista es además la norma principal del documento.
 */
async function setDocumentStandards(
  supabase: Awaited<ReturnType<typeof createClient>>,
  documentId: string,
  standardIds: string[],
) {
  const { error: deleteError } = await supabase
    .from("document_standards")
    .delete()
    .eq("document_id", documentId)
    .not("standard_id", "in", `(${standardIds.join(",")})`);
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase
    .from("document_standards")
    .upsert(
      standardIds.map((standard_id) => ({ document_id: documentId, standard_id })),
      { onConflict: "document_id,standard_id", ignoreDuplicates: true },
    );
  if (insertError) throw insertError;
}

async function assertFileAllowed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  file: { extension: string; size: number },
) {
  const settings = await getAppSettings(supabase);
  if (!settings.allowed_extensions.includes(file.extension.toLowerCase())) {
    throw new AppError(
      `Tipo de archivo no permitido (.${file.extension}). Permitidos: ${settings.allowed_extensions.join(", ")}.`,
      "validation",
    );
  }
  if (file.size > settings.max_file_size_mb * 1024 * 1024) {
    throw new AppError(`El archivo supera el máximo de ${settings.max_file_size_mb} MB.`, "validation");
  }
}

/* ----------------------------------------------------------------------------
 * Crear documento (el archivo ya fue subido a Storage desde el cliente)
 * ------------------------------------------------------------------------- */
export async function createDocument(input: CreateDocumentInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.DOCUMENTS_CREATE);
    const parsed = createDocumentSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const d = parsed.data;

    const supabase = await createClient();

    try {
      await assertFileAllowed(supabase, d.file);

      const now = new Date().toISOString();
      const { error: insertError } = await supabase.from("documents").insert({
        id: d.id,
        code: d.code.trim().toUpperCase(),
        name: d.name,
        description: d.description || null,
        standard_id: d.standardIds[0] as string,
        category_id: d.categoryId || null,
        subcategory_id: d.subcategoryId || null,
        document_type_id: d.documentTypeId,
        area_id: d.areaId || null,
        process_id: d.processId,
        classification: d.classification,
        retention: d.retention || null,
        status: d.status,
        version: d.version,
        file_path: d.file.path,
        file_name: d.file.name,
        file_extension: d.file.extension,
        file_size: d.file.size,
        mime_type: d.file.mimeType ?? null,
        approved_at: d.status === "approved" ? now : null,
        effective_date: d.effectiveDate || null,
        review_date: d.reviewDate || null,
        created_by: user.id,
        updated_by: user.id,
      });
      if (insertError) throw insertError;

      const { error: versionError } = await supabase.from("document_versions").insert({
        document_id: d.id,
        version: d.version,
        status: d.status,
        file_path: d.file.path,
        file_name: d.file.name,
        file_extension: d.file.extension,
        file_size: d.file.size,
        mime_type: d.file.mimeType ?? null,
        change_summary: "Versión inicial",
        created_by: user.id,
      });
      if (versionError) throw versionError;

      await setDocumentStandards(supabase, d.id, d.standardIds);

      if (d.tags.length > 0) {
        const tags = await ensureTags(supabase, d.tags, user.id);
        await setDocumentTags(
          supabase,
          d.id,
          tags.map((t) => t.id),
        );
      }
    } catch (error) {
      // Limpieza: si falla la metadata, no dejar archivos huérfanos.
      await removeFiles(supabase, [d.file.path]);
      // Si el documento llegó a crearse parcialmente, eliminarlo.
      await supabase.from("documents").delete().eq("id", d.id);
      throw error;
    }

    revalidateDocumentPaths(d.id);
    return ok({ id: d.id });
  });
}

/* ----------------------------------------------------------------------------
 * Actualizar metadatos
 * ------------------------------------------------------------------------- */
export async function updateDocument(input: UpdateDocumentInput): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.DOCUMENTS_UPDATE);
    const parsed = updateDocumentSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const d = parsed.data;

    const supabase = await createClient();

    const { data: current, error: fetchError } = await supabase
      .from("documents")
      .select("id, status, approved_at, version")
      .eq("id", d.id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!current) return fail("El documento no existe.");

    const approvedAt =
      d.status === "approved"
        ? current.approved_at ?? new Date().toISOString()
        : d.status === "obsolete"
          ? current.approved_at
          : null;

    const { error } = await supabase
      .from("documents")
      .update({
        code: d.code.trim().toUpperCase(),
        name: d.name,
        description: d.description || null,
        standard_id: d.standardIds[0] as string,
        category_id: d.categoryId || null,
        subcategory_id: d.subcategoryId || null,
        document_type_id: d.documentTypeId,
        area_id: d.areaId || null,
        process_id: d.processId,
        classification: d.classification,
        retention: d.retention || null,
        status: d.status,
        version: d.version,
        approved_at: approvedAt,
        effective_date: d.effectiveDate || null,
        review_date: d.reviewDate || null,
        updated_by: user.id,
      })
      .eq("id", d.id);
    if (error) throw error;

    // Mantener coherente la versión actual en el historial si cambió el número.
    if (d.version !== current.version) {
      await supabase
        .from("document_versions")
        .update({ version: d.version })
        .eq("document_id", d.id)
        .eq("version", current.version);
    }

    await setDocumentStandards(supabase, d.id, d.standardIds);

    const tags = await ensureTags(supabase, d.tags, user.id);
    await setDocumentTags(
      supabase,
      d.id,
      tags.map((t) => t.id),
    );

    revalidateDocumentPaths(d.id);
    return ok({ id: d.id });
  });
}

/* ----------------------------------------------------------------------------
 * Nueva versión (archivo ya subido)
 * ------------------------------------------------------------------------- */
export async function createDocumentVersion(
  input: CreateVersionInput,
): Promise<ActionResult<{ id: string; version: string }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.DOCUMENTS_UPDATE);
    const parsed = createVersionSchema.safeParse(input);
    if (!parsed.success) return zodFail(parsed.error);
    const d = parsed.data;

    const supabase = await createClient();

    try {
      await assertFileAllowed(supabase, d.file);

      const { data: current, error: fetchError } = await supabase
        .from("documents")
        .select("id, version, name, code, approved_at")
        .eq("id", d.documentId)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (!current) return fail("El documento no existe.");

      if (compareVersions(d.version, current.version) <= 0) {
        return fail(`La nueva versión debe ser mayor que la actual (${current.version}).`, {
          version: [`Debe ser mayor que ${current.version}.`],
        });
      }

      const { error: versionError } = await supabase.from("document_versions").insert({
        document_id: d.documentId,
        version: d.version,
        status: d.status,
        file_path: d.file.path,
        file_name: d.file.name,
        file_extension: d.file.extension,
        file_size: d.file.size,
        mime_type: d.file.mimeType ?? null,
        change_summary: d.changeSummary,
        created_by: user.id,
      });
      if (versionError) throw versionError;

      const { error: updateError } = await supabase
        .from("documents")
        .update({
          version: d.version,
          status: d.status,
          file_path: d.file.path,
          file_name: d.file.name,
          file_extension: d.file.extension,
          file_size: d.file.size,
          mime_type: d.file.mimeType ?? null,
          approved_at: d.status === "approved" ? new Date().toISOString() : current.approved_at,
          updated_by: user.id,
        })
        .eq("id", d.documentId);
      if (updateError) throw updateError;

      await supabase.rpc("log_audit", {
        p_action: AUDIT_ACTIONS.DOCUMENT_VERSION_CREATED,
        p_entity_type: "document",
        p_entity_id: d.documentId,
        p_metadata: {
          name: current.name,
          code: current.code,
          version: d.version,
          previous_version: current.version,
          change_summary: d.changeSummary,
        },
      });
    } catch (error) {
      await removeFiles(supabase, [d.file.path]);
      throw error;
    }

    revalidateDocumentPaths(d.documentId);
    return ok({ id: d.documentId, version: d.version });
  });
}

/* ----------------------------------------------------------------------------
 * Cambio rápido de estado
 * ------------------------------------------------------------------------- */
export async function changeDocumentStatus(
  id: string,
  status: DocumentStatus,
): Promise<ActionResult<{ status: DocumentStatus }>> {
  return runAction(async () => {
    const user = await authorize(PERMISSIONS.DOCUMENTS_UPDATE);
    const parsed = changeStatusSchema.safeParse({ id, status });
    if (!parsed.success) return zodFail(parsed.error);

    const supabase = await createClient();
    const { error } = await supabase
      .from("documents")
      .update({
        status: parsed.data.status,
        approved_at: parsed.data.status === "approved" ? new Date().toISOString() : undefined,
        updated_by: user.id,
      })
      .eq("id", parsed.data.id);
    if (error) throw error;

    revalidateDocumentPaths(parsed.data.id);
    return ok({ status: parsed.data.status });
  });
}

/* ----------------------------------------------------------------------------
 * Eliminar documento (metadatos + versiones + archivos)
 * ------------------------------------------------------------------------- */
export async function deleteDocument(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    await authorize(PERMISSIONS.DOCUMENTS_DELETE);
    const supabase = await createClient();

    const { data: doc, error: fetchError } = await supabase
      .from("documents")
      .select("id, file_path")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!doc) return fail("El documento no existe.");

    const { data: versions } = await supabase
      .from("document_versions")
      .select("file_path")
      .eq("document_id", id);

    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) throw error;

    await removeFiles(supabase, [doc.file_path, ...(versions ?? []).map((v) => v.file_path)]);

    revalidateDocumentPaths(id);
    return ok({ id });
  });
}
