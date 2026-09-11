import type { Metadata } from "next";

import { TagsTypesManager } from "@/components/admin/tags-types-manager";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { listTagsWithCounts } from "@/lib/services/tags.service";
import { listDocumentTypes } from "@/lib/services/taxonomy.service";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Etiquetas y tipos" };

export default async function AdminTagsPage() {
  const { allowed } = await requirePermission(PERMISSIONS.CATEGORIES_MANAGE);
  if (!allowed) return <ForbiddenState description="Tu rol no permite gestionar etiquetas ni tipos de documento." />;

  const supabase = await createClient();
  let tags, types;
  try {
    [tags, types] = await Promise.all([listTagsWithCounts(supabase), listDocumentTypes(supabase, { includeInactive: true })]);
  } catch {
    return <ErrorState />;
  }

  return (
    <>
      <PageHeader title="Etiquetas y tipos de documento" description="Vocabulario transversal del repositorio. Las etiquetas también pueden crearse al subir documentos." />
      <TagsTypesManager tags={tags} documentTypes={types} />
    </>
  );
}
