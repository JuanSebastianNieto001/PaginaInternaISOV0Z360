import type { Metadata } from "next";
import { Suspense } from "react";

import { ActivityFilters } from "@/components/activity/activity-filters";
import { ActivityTimeline } from "@/components/documents/activity-timeline";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { listAuditLogs } from "@/lib/services/audit.service";
import { createClient } from "@/lib/supabase/server";
import { asDate, asInt, asUuid, first, type SearchParams } from "@/lib/utils/url";

export const metadata: Metadata = { title: "Auditoría" };

export default async function AdminActivityPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [{ allowed }, params] = await Promise.all([requirePermission(PERMISSIONS.AUDIT_READ), searchParams]);
  if (!allowed) return <ForbiddenState description="Tu rol no permite consultar la auditoría completa." />;

  const supabase = await createClient();
  const action = first(params.action);
  const entityType = first(params.entity);
  const query = {
    action: action && /^[a-z_]+\.[a-z_]+$/.test(action) ? action : undefined,
    entityType: entityType && /^[a-z_]+$/.test(entityType) ? entityType : undefined,
    userId: asUuid(params.user),
    entityId: asUuid(params.entityId),
    dateFrom: asDate(params.from),
    dateTo: asDate(params.to),
    page: asInt(params.page, 1, 1, 100_000),
    pageSize: 50,
  };

  let result;
  try {
    result = await listAuditLogs(supabase, query);
  } catch {
    return <ErrorState />;
  }

  return (
    <>
      <PageHeader title="Auditoría" description="Registro completo e inmutable de acciones: autenticación, documentos, usuarios, roles y configuración." />
      <div className="space-y-4">
        <Suspense>
          <ActivityFilters action={query.action} dateFrom={query.dateFrom} dateTo={query.dateTo} />
        </Suspense>
        <ActivityTimeline logs={result.items} emptyTitle="Sin registros" emptyDescription="No hay eventos que coincidan con los filtros." />
        <Suspense>
          <Pagination page={result.page} totalPages={result.totalPages} total={result.total} pageSize={result.pageSize} itemLabel="registros" />
        </Suspense>
      </div>
    </>
  );
}
