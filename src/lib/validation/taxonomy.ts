import { z } from "zod";

const uuid = z.string().uuid("Identificador inválido.");

const codeSchema = z
  .string()
  .trim()
  .min(2, "El código es obligatorio.")
  .max(30)
  .regex(/^[A-Za-z0-9._\-]+$/, "Solo letras, números, puntos, guiones y guiones bajos.");

const nameSchema = z.string().trim().min(2, "El nombre es obligatorio.").max(120);
const descriptionSchema = z.string().trim().max(500).optional().or(z.literal(""));

export const standardSchema = z.object({
  id: uuid.optional(),
  code: codeSchema,
  name: nameSchema,
  description: descriptionSchema,
  color: z.string().trim().max(20).optional().or(z.literal("")),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const categorySchema = z.object({
  id: uuid.optional(),
  standardId: uuid,
  code: codeSchema,
  name: nameSchema,
  description: descriptionSchema,
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const subcategorySchema = z.object({
  id: uuid.optional(),
  categoryId: uuid,
  code: codeSchema,
  name: nameSchema,
  description: descriptionSchema,
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const documentTypeSchema = z.object({
  id: uuid.optional(),
  code: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .regex(/^[a-z0-9_\-]+$/, "Usa minúsculas, números, guiones o guiones bajos."),
  name: nameSchema,
  description: descriptionSchema,
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const processSchema = z.object({
  id: uuid.optional(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2)
    .max(40)
    .regex(/^[A-Z0-9_]+$/, "Usa mayúsculas, números o guiones bajos."),
  name: nameSchema,
  description: descriptionSchema,
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const areaSchema = z.object({
  id: uuid.optional(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2)
    .max(40)
    .regex(/^[A-Z0-9_]+$/, "Usa mayúsculas, números o guiones bajos."),
  name: nameSchema,
  description: descriptionSchema,
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const tagSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(40),
  color: z.string().trim().max(20).optional().or(z.literal("")),
});

export const deleteByIdSchema = z.object({ id: uuid });

export const STANDARD_COLORS = [
  "blue",
  "emerald",
  "amber",
  "violet",
  "rose",
  "cyan",
  "slate",
  "orange",
] as const;
