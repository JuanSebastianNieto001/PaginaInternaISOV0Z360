import type { Metadata } from "next";

import { DocumentTable } from "@/components/documents/document-table";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getRecentlyAdded, getRecentlyModified } from "@/lib/services/documents.service";
import { getRecentlyViewed } from "@/lib/services/recent.service";
import { getAppSettings } from "@/lib/services/settings.service";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Recientes" };

export default async function RecentPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const canDownload = can(user, PERMISSIONS.DOCUMENTS_DOWNLOAD);

  let viewed, added, modified;
  try {
    const settings = await getAppSettings(supabase);
    [viewed, added, modified] = await Promise.all([
      getRecentlyViewed(supabase, user.id, settings.recent_limit),
      getRecentlyAdded(supabase, settings.recent_limit),
      getRecentlyModified(supabase, settings.recent_limit),
    ]);
  } catch {
    return <ErrorState />;
  }

  return (
    <>
      <PageHeader title="Recientes" description="Documentos que has consultado, junto con los últimos añadidos y modificados en el repositorio." />
      <Tabs defaultValue="viewed">
        <TabsList>
          <TabsTrigger value="viewed" count={viewed.length}>Vistos por ti</TabsTrigger>
          <TabsTrigger value="added" count={added.length}>Añadidos</TabsTrigger>
          <TabsTrigger value="modified" count={modified.length}>Modificados</TabsTrigger>
        </TabsList>
        <TabsContent value="viewed">
          {viewed.length === 0 ? (
            <EmptyState title="Aún no has consultado documentos" description="Los documentos que abras aparecerán aquí para que vuelvas a ellos rápidamente." />
          ) : (
            <DocumentTable documents={viewed.map((v) => v.document)} canDownload={canDownload} />
          )}
        </TabsContent>
        <TabsContent value="added">
          {added.length === 0 ? <EmptyState title="No hay documentos" description="Todavía no se ha añadido documentación." /> : <DocumentTable documents={added} canDownload={canDownload} />}
        </TabsContent>
        <TabsContent value="modified">
          {modified.length === 0 ? <EmptyState title="Sin modificaciones" description="Las actualizaciones aparecerán aquí." /> : <DocumentTable documents={modified} canDownload={canDownload} />}
        </TabsContent>
      </Tabs>
    </>
  );
}
