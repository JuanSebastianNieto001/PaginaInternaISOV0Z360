import type { Metadata } from "next";

import { StandardsManager } from "@/components/admin/standards-manager";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getTaxonomyCounts, listStandards } from "@/lib/services/taxonomy.service";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Normas" };

export default async function AdminStandardsPage() {
  const { allowed } = await requirePermission(PERMISSIONS.STANDARDS_MANAGE);
  if (!allowed) return <ForbiddenState description="La gestión de normas está reservada a SUPER_ADMIN." />;

  const supabase = await createClient();
  let standards, counts;
  try {
    [standards, counts] = await Promise.all([listStandards(supabase, { includeInactive: true }), getTaxonomyCounts(supabase)]);
  } catch {
    return <ErrorState />;
  }

  const countByStandard: Record<string, number> = {};
  for (const c of counts) countByStandard[c.standard_id] = (countByStandard[c.standard_id] ?? 0) + c.total;

  return (
    <>
      <PageHeader title="Normas" description="Crea, edita, activa o desactiva las normas del sistema. Las normas inactivas no aparecen en filtros ni formularios, pero sus documentos se conservan." />
      <StandardsManager standards={standards} counts={countByStandard} />
    </>
  );
}
