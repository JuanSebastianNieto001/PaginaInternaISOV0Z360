import { z } from "zod";

import { DOCUMENT_STATUSES } from "@/lib/constants/documents";

/** Techo duro del bucket de Storage (ver 003_storage.sql). */
export const HARD_MAX_FILE_SIZE_MB = 25;

export const appSettingsSchema = z.object({
  orgName: z.string().trim().min(2, "Introduce el nombre de la organización.").max(120),
  maxFileSizeMb: z.coerce
    .number()
    .int()
    .min(1, "Mínimo 1 MB.")
    .max(HARD_MAX_FILE_SIZE_MB, `Máximo ${HARD_MAX_FILE_SIZE_MB} MB (límite del bucket).`),
  allowedExtensions: z
    .string()
    .trim()
    .min(1, "Indica al menos una extensión.")
    .transform((s) =>
      Array.from(
        new Set(
          s
            .split(/[,\s]+/)
            .map((e) => e.replace(/^\./, "").toLowerCase().trim())
            .filter((e) => /^[a-z0-9]{1,10}$/.test(e)),
        ),
      ),
    )
    .refine((arr) => arr.length > 0, "Indica al menos una extensión válida."),
  defaultStatus: z.enum(DOCUMENT_STATUSES),
  recentLimit: z.coerce.number().int().min(5).max(100),
});

export type AppSettingsInput = z.input<typeof appSettingsSchema>;
