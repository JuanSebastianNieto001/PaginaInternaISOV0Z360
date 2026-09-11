import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { DocumentFilters } from "@/components/documents/document-filters";
import { DocumentTable } from "@/components/documents/document-table";
import { StatusBadge } from "@/components/documents/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, ForbiddenState, NoResultsState } from "@/components/ui/states";
import { can } from "@/lib/auth/permissions";
import { requireAnyPermission } from "@/lib/auth/session";
import { DOCUMENT_STATUSES } from "@/lib/constants/documents";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getDashboardStats } from "@/lib/services/dashboard.service";
import { getDistinctVersions, getDocumentAuthors, listDocuments } from "@/lib/services/documents.service";
import { listTags } from "@/lib/services/tags.service";
import { getDocumentFormOptions } from "@/lib/services/taxonomy.service";
import { createClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils/format";
import { parseDocumentQuery, type SearchParams } from "@/lib/utils/url";

export const metadata: Metadata = { title: "Gestión de documentos" };

export default async function AdminDocumentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [{ user, allowed }, params] = await Promise.all([
    requireAnyPermission([PERMISSIONS.DOCUMENTS_UPDATE, PERMISSIONS.DOCUMENTS_DELETE]),
    searchParams,
  ]);
  if (!allowed) return <ForbiddenState description="Tu rol no permite administrar documentos." />;

  const supabase = await createClient();
  const query = parseDocumentQuery(params);

  let result, options, tags, authors, versions, stats;
  try {
    [result, options, tags, authors, versions, stats] = await Promise.all([
      listDocuments(supabase, query),
      getDocumentFormOptions(supabase),
      listTags(supabase),
      getDocumentAuthors(supabase),
      getDistinctVersions(supabase),
      getDashboardStats(supabase),
    ]);
  } catch {
    return <ErrorState />;
  }

  const hasFilters = Boolean(query.q || query.standardId || query.categoryId || query.status || query.documentTypeId || query.createdBy || query.version || query.dateFrom || query.dateTo || (query.tagIds && query.tagIds.length > 0));

  return (
    <>
      <PageHeader title="Gestión de documentos" description="Vista de control del repositorio. Desde el detalle de cada documento puedes editar, cambiar estado, publicar versiones o eliminar." />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DOCUMENT_STATUSES.map((s) => (
          <Link key={s} href={`/admin/documents?status=${s}`}>
            <Card className="transition-colors hover:border-border-strong">
              <CardContent className="flex items-center justify-between py-4">
                <StatusBadge status={s} />
                <span className="text-xl font-semibold tabular-nums text-fg">{formatNumber(stats[s])}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="space-y-4">
        <Suspense>
          <DocumentFilters tree={options.tree} documentTypes={options.documentTypes} areas={options.areas} tags={tags} authors={authors} versions={versions} query={query} basePath="/admin/documents" />
        </Suspense>
        <p className="text-sm text-fg-muted"><span className="font-medium text-fg">{formatNumber(result.total)}</span> documentos</p>
        {result.items.length === 0 ? (
          hasFilters ? <NoResultsState onResetHref="/admin/documents" /> : <EmptyState title="No hay documentos" description="El repositorio está vacío." />
        ) : (
          <>
            <DocumentTable documents={result.items} query={query} canDownload={can(user, PERMISSIONS.DOCUMENTS_DOWNLOAD)} basePath="/admin/documents" />
            <Suspense>
              <Pagination page={result.page} totalPages={result.totalPages} total={result.total} pageSize={result.pageSize} itemLabel="documentos" />
            </Suspense>
          </>
        )}
      </div>
    </>
  );
}
