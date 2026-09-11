import type { Metadata } from "next";

import { RolesMatrix } from "@/components/admin/roles-matrix";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { listPermissions, listRolesWithPermissions } from "@/lib/services/roles.service";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Roles y permisos" };

export default async function AdminRolesPage() {
  const { allowed } = await requirePermission(PERMISSIONS.ROLES_MANAGE);
  if (!allowed) return <ForbiddenState description="Solo SUPER_ADMIN puede modificar la matriz de permisos." />;

  const supabase = await createClient();
  let roles, permissions;
  try {
    [roles, permissions] = await Promise.all([listRolesWithPermissions(supabase), listPermissions(supabase)]);
  } catch {
    return <ErrorState />;
  }

  return (
    <>
      <PageHeader title="Roles y permisos" description="Matriz de permisos por rol. Los cambios se aplican de inmediato en la base de datos (RLS) y en la interfaz." />
      <RolesMatrix roles={roles} permissions={permissions} />
    </>
  );
}
