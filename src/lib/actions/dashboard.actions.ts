"use server";

import { z } from "zod";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { getStandardContributors } from "@/lib/services/dashboard.service";
import { listDocuments } from "@/lib/services/documents.service";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, StandardOverview } from "@/types";

import { authorize, ok, runAction, zodFail } from "./helpers";

const standardIdSchema = z.string().uuid("Norma no válida.");

/** Documentos mostrados en el panel de la norma. */
const PANEL_DOCUMENT_LIMIT = 10;

/**
 * Datos del panel desplegable de una norma en el dashboard: usuarios más
 * implicados y últimos documentos. Solo lectura; usa el cliente de la sesión,
 * por lo que la RLS decide qué puede verse.
 */
export async function loadStandardOverview(standardId: string): Promise<ActionResult<StandardOverview>> {
  return runAction(async () => {
    await authorize(PERMISSIONS.DOCUMENTS_READ);

    const parsed = standardIdSchema.safeParse(standardId);
    if (!parsed.success) return zodFail(parsed.error);

    const supabase = await createClient();
    const [contributors, documents] = await Promise.all([
      getStandardContributors(supabase, parsed.data, 4),
      listDocuments(supabase, {
        standardId: parsed.data,
        page: 1,
        pageSize: PANEL_DOCUMENT_LIMIT,
        sort: "updated_at",
        direction: "desc",
      }),
    ]);

    return ok({
      standardId: parsed.data,
      contributors,
      documents: documents.items,
      totalDocuments: documents.total,
    });
  });
}
