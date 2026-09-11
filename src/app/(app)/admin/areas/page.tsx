import type { Metadata } from "next";

import { AreasManager, type AreaWithCount } from "@/components/admin/areas-manager";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getAreaCounts, listAreas } from "@/lib/services/taxonomy.service";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Áreas" };

export default async function AdminAreasPage() {
  const { allowed } = await requirePermission(PERMISSIONS.CATEGORIES_MANAGE);
  if (!allowed) return <ForbiddenState description="Tu rol no permite gestionar las áreas responsables." />;

  const supabase = await createClient();
  let areas: AreaWithCount[];
  try {
    const [rows, counts] = await Promise.all([
      listAreas(supabase, { includeInactive: true }),
      getAreaCounts(supabase),
    ]);
    const byArea = new Map(counts.map((c) => [c.area_id, c.total]));
    areas = rows.map((a) => ({ ...a, document_count: byArea.get(a.id) ?? 0 }));
  } catch {
    return <ErrorState />;
  }

  return (
    <>
      <PageHeader
        title="Áreas responsables"
        description="Cargos y áreas dueñas de la documentación. Son transversales a las tres normas: un documento de Contabilidad puede ser de ISO 9001 o de ISO 27001 sin cambiar de área."
      />
      <AreasManager areas={areas} />
    </>
  );
}
