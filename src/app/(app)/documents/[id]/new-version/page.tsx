import type { Metadata } from "next";

import { NewVersionForm } from "@/components/documents/new-version-form";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, ForbiddenState, NotFoundState } from "@/components/ui/states";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getDocumentById } from "@/lib/services/documents.service";
import { getAppSettings } from "@/lib/services/settings.service";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = { title: "Nueva versión" };

export default async function NewVersionPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ allowed }, { id }] = await Promise.all([requirePermission(PERMISSIONS.DOCUMENTS_UPDATE), params]);
  if (!allowed) return <ForbiddenState description="Tu rol no permite publicar nuevas versiones." />;
  if (!UUID_RE.test(id)) return <NotFoundState title="Documento no encontrado" />;

  const supabase = await createClient();
  let doc, settings;
  try {
    [doc, settings] = await Promise.all([getDocumentById(supabase, id), getAppSettings(supabase)]);
  } catch {
    return <ErrorState />;
  }
  if (!doc) return <NotFoundState title="Documento no encontrado" />;

  return (
    <>
      <PageHeader
        title="Publicar nueva versión"
        description={`${doc.code} · ${doc.name}`}
        breadcrumbs={[{ label: "Repositorio", href: "/documents" }, { label: doc.code, href: `/documents/${doc.id}` }, { label: "Nueva versión" }]}
      />
      <NewVersionForm
        document={{ id: doc.id, name: doc.name, code: doc.code, version: doc.version, status: doc.status }}
        settings={{ maxFileSizeMb: settings.max_file_size_mb, allowedExtensions: settings.allowed_extensions }}
      />
    </>
  );
}
