import type { Metadata } from "next";

import { DocumentForm } from "@/components/documents/document-form";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, ForbiddenState, NotFoundState } from "@/components/ui/states";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getDocumentById } from "@/lib/services/documents.service";
import { getAppSettings } from "@/lib/services/settings.service";
import { listTags } from "@/lib/services/tags.service";
import { getDocumentFormOptions } from "@/lib/services/taxonomy.service";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = { title: "Editar documento" };

export default async function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ allowed }, { id }] = await Promise.all([requirePermission(PERMISSIONS.DOCUMENTS_UPDATE), params]);
  if (!allowed) return <ForbiddenState description="Tu rol no permite editar documentos." />;
  if (!UUID_RE.test(id)) return <NotFoundState title="Documento no encontrado" />;

  const supabase = await createClient();
  let doc, options, settings, tags;
  try {
    [doc, options, settings, tags] = await Promise.all([
      getDocumentById(supabase, id),
      getDocumentFormOptions(supabase),
      getAppSettings(supabase),
      listTags(supabase),
    ]);
  } catch {
    return <ErrorState />;
  }
  if (!doc) return <NotFoundState title="Documento no encontrado" />;

  return (
    <>
      <PageHeader
        title="Editar documento"
        description="Modifica los metadatos. Para sustituir el archivo utiliza “Nueva versión”."
        breadcrumbs={[{ label: "Repositorio", href: "/documents" }, { label: doc.code, href: `/documents/${doc.id}` }, { label: "Editar" }]}
      />
      <DocumentForm
        mode="edit"
        initial={doc}
        tree={options.tree}
        documentTypes={options.documentTypes}
        tagSuggestions={tags.map((t) => t.name)}
        settings={{ maxFileSizeMb: settings.max_file_size_mb, allowedExtensions: settings.allowed_extensions, defaultStatus: settings.default_status }}
      />
    </>
  );
}
