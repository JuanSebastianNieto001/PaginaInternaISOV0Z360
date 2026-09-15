import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { DocumentFilters } from "@/components/documents/document-filters";
import { DocumentList } from "@/components/documents/document-list";
import { SortSelect } from "@/components/documents/sort-select";
import { ViewToggle, type ViewMode } from "@/components/documents/view-toggle";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, NoResultsState } from "@/components/ui/states";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getDistinctVersions, getDocumentAuthors, listDocuments } from "@/lib/services/documents.service";
import { listTags } from "@/lib/services/tags.service";
import { getAreaCounts, getDocumentFormOptions } from "@/lib/services/taxonomy.service";
import { createClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils/format";
import { first, parseDocumentQuery, type SearchParams } from "@/lib/utils/url";

export const metadata: Metadata = { title: "Repositorio" };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const query = parseDocumentQuery(params);
  const view: ViewMode = first(params.view) === "grid" ? "grid" : "list";
  const supabase = await createClient();

  const canCreate = can(user, PERMISSIONS.DOCUMENTS_CREATE);
  const canDownload = can(user, PERMISSIONS.DOCUMENTS_DOWNLOAD);

  let result, options, tags, authors, versions, areaCounts;
  let failed = false;
  try {
    [result, options, tags, authors, versions, areaCounts] = await Promise.all([
      listDocuments(supabase, query),
      getDocumentFormOptions(supabase),
      listTags(supabase),
      getDocumentAuthors(supabase),
      getDistinctVersions(supabase),
      getAreaCounts(supabase),
    ]);
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    failed = true;
  }

  // Las áreas sin documentos se muestran sólo al pulsar "Ver todas".
  const areaTotals = Object.fromEntries((areaCounts ?? []).map((c) => [c.area_id, c.total]));

  const hasFilters = Boolean(
    query.q || query.standardId || query.categoryId || query.subcategoryId || query.documentTypeId || query.areaId || query.processId || query.classification || query.status || query.version || query.dateFrom || query.dateTo || query.createdBy || (query.tagIds && query.tagIds.length > 0),
  );

  return (
    <>
      <PageHeader
        title="Repositorio documental"
        description="Escribe el nombre del documento o marca la norma, el área y el estado para llegar a él en un clic."
        actions={canCreate ? <ButtonLink href="/documents/new" leftIcon={<Plus className="size-4" />}>Subir documento</ButtonLink> : undefined}
      />

      {failed || !result || !options ? (
        <ErrorState />
      ) : (
        <div className="space-y-4">
          <Suspense>
            <DocumentFilters
              tree={options.tree}
              documentTypes={options.documentTypes}
              areas={options.areas}
              processes={options.processes}
              tags={tags ?? []}
              authors={authors ?? []}
              versions={versions ?? []}
              query={query}
              areaCounts={areaTotals}
            />
          </Suspense>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-fg-muted">
              <span className="font-medium text-fg">{formatNumber(result.total)}</span> {result.total === 1 ? "documento" : "documentos"}
              {hasFilters ? " coinciden con los criterios" : " en el repositorio"}
            </p>
            <Suspense>
              <div className="flex items-center gap-2">
                <SortSelect sort={query.sort} direction={query.direction} />
                <ViewToggle view={view} />
              </div>
            </Suspense>
          </div>

          {result.items.length === 0 ? (
            hasFilters ? (
              <NoResultsState />
            ) : (
              <EmptyState
                title="No hay documentos todavía"
                description={canCreate ? "Sube el primer documento para comenzar a construir el repositorio." : "Aún no se ha publicado documentación. Vuelve más tarde."}
                action={canCreate ? <ButtonLink href="/documents/new" leftIcon={<Plus className="size-4" />}>Subir el primer documento</ButtonLink> : undefined}
              />
            )
          ) : (
            <>
              <DocumentList documents={result.items} view={view} query={query} canDownload={canDownload} />
              <Suspense>
                <Pagination page={result.page} totalPages={result.totalPages} total={result.total} pageSize={result.pageSize} itemLabel="documentos" />
              </Suspense>
            </>
          )}
        </div>
      )}
    </>
  );
}
