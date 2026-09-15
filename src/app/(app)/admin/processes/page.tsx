import type { Metadata } from "next";

import { ProcessesManager, type ProcessWithCount } from "@/components/admin/processes-manager";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getProcessCounts, listProcesses } from "@/lib/services/taxonomy.service";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Procesos" };

export default async function AdminProcessesPage() {
  const { allowed } = await requirePermission(PERMISSIONS.CATEGORIES_MANAGE);
  if (!allowed) return <ForbiddenState description="Tu rol no permite gestionar los procesos del SGI." />;

  const supabase = await createClient();
  let processes: ProcessWithCount[];
  try {
    const [rows, counts] = await Promise.all([
      listProcesses(supabase, { includeInactive: true }),
      getProcessCounts(supabase),
    ]);
    const byProcess = new Map(counts.map((c) => [c.process_id, c.total]));
    processes = rows.map((p) => ({ ...p, document_count: byProcess.get(p.id) ?? 0 }));
  } catch {
    return <ErrorState />;
  }

  return (
    <>
      <PageHeader
        title="Procesos del SGI"
        description="La columna “Proceso / Área” del listado maestro: de qué proceso trata cada documento. Es distinto del cargo responsable, que dice quién lo custodia."
      />
      <ProcessesManager processes={processes} />
    </>
  );
}
