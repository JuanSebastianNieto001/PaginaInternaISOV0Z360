import type { Metadata } from "next";

import { DocumentForm } from "@/components/documents/document-form";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getAppSettings } from "@/lib/services/settings.service";
import { listTags } from "@/lib/services/tags.service";
import { getDocumentFormOptions } from "@/lib/services/taxonomy.service";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/permissions";

export const metadata: Metadata = { title: "Subir documento" };

export default async function NewDocumentPage() {
  const { user, allowed } = await requirePermission(PERMISSIONS.DOCUMENTS_CREATE);
  if (!allowed) return <ForbiddenState description="Tu rol no permite subir documentos." />;

  const supabase = await createClient();
  let options, settings, tags;
  try {
    [options, settings, tags] = await Promise.all([getDocumentFormOptions(supabase), getAppSettings(supabase), listTags(supabase)]);
  } catch {
    return <ErrorState />;
  }

  const hasTaxonomy = options.tree.some((s) => s.categories.length > 0) && options.documentTypes.length > 0;

  return (
    <>
      <PageHeader
        title="Subir documento"
        description="Añade un nuevo documento al repositorio. El archivo se almacena de forma privada y queda registrado en auditoría."
        breadcrumbs={[{ label: "Repositorio", href: "/documents" }, { label: "Subir documento" }]}
      />
      {!hasTaxonomy ? (
        <EmptyState
          title="Falta configurar la clasificación"
          description="Antes de subir documentos debe existir al menos una norma con categorías y un tipo de documento."
          action={can(user, PERMISSIONS.CATEGORIES_MANAGE) ? <ButtonLink href="/admin/categories" size="sm">Ir a categorías</ButtonLink> : undefined}
        />
      ) : (
        <DocumentForm
          mode="create"
          tree={options.tree}
          documentTypes={options.documentTypes}
          areas={options.areas}
          tagSuggestions={tags.map((t) => t.name)}
          settings={{
            maxFileSizeMb: settings.max_file_size_mb,
            allowedExtensions: settings.allowed_extensions,
            defaultStatus: settings.default_status,
          }}
        />
      )}
    </>
  );
}
