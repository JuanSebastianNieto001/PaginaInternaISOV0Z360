import type { ReactNode } from "react";

import { AdminNav } from "@/components/layout/admin-nav";
import { ForbiddenState } from "@/components/ui/states";
import { requireAnyPermission } from "@/lib/auth/session";
import { ADMIN_AREA_PERMISSIONS } from "@/lib/constants/permissions";

/**
 * Guarda del área /admin. Cada página vuelve a comprobar su permiso concreto;
 * RLS protege los datos aunque alguien llegue a la URL directamente.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user, allowed } = await requireAnyPermission(ADMIN_AREA_PERMISSIONS);

  if (!allowed) {
    return <ForbiddenState description="El área de administración está reservada a gestores y administradores." />;
  }

  return (
    <>
      <AdminNav user={user} />
      {children}
    </>
  );
}
