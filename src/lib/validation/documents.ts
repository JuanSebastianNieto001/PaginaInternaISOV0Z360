import { z } from "zod";

import { DOCUMENT_STATUSES, VERSION_REGEX } from "@/lib/constants/documents";

const uuid = z.string().uuid("Identificador inválido.");

export const documentStatusSchema = z.enum(DOCUMENT_STATUSES);

export const versionSchema = z
  .string()
  .trim()
  .regex(VERSION_REGEX, "Formato de versión inválido. Ejemplos: 1.0, 2.1, 1.0.3");

export const tagsSchema = z
  .array(z.string().trim().min(1).max(40))
  .max(15, "Máximo 15 etiquetas.")
  .default([]);

export const fileMetaSchema = z.object({
  path: z.string().min(3).max(300),
  name: z.string().trim().min(1).max(255),
  extension: z.string().trim().toLowerCase().min(1).max(10),
  size: z.number().int().nonnegative(),
  mimeType: z.string().max(120).nullable().optional(),
});

const documentBase = {
  name: z.string().trim().min(2, "El nombre es obligatorio.").max(200),
  code: z
    .string()
    .trim()
    .min(2, "El código es obligatorio.")
    .max(60)
    .regex(/^[A-Za-z0-9._\-\/ ]+$/, "El código solo admite letras, números, puntos, guiones y barras."),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  standardId: uuid,
  categoryId: uuid,
  subcategoryId: uuid.optional().or(z.literal("")),
  documentTypeId: uuid,
  areaId: uuid.optional().or(z.literal("")),
  status: documentStatusSchema,
  version: versionSchema,
  tags: tagsSchema,
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
};

export const createDocumentSchema = z.object({
  id: uuid, // generado en cliente para construir la ruta de Storage
  ...documentBase,
  file: fileMetaSchema,
});

export const updateDocumentSchema = z.object({
  id: uuid,
  ...documentBase,
});

export const createVersionSchema = z.object({
  documentId: uuid,
  version: versionSchema,
  status: documentStatusSchema,
  changeSummary: z.string().trim().min(3, "Describe brevemente el cambio.").max(1000),
  file: fileMetaSchema,
});

export const changeStatusSchema = z.object({
  id: uuid,
  status: documentStatusSchema,
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type CreateVersionInput = z.infer<typeof createVersionSchema>;
