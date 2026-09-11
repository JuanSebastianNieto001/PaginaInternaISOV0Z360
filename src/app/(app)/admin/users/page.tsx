import type { Metadata } from "next";
import { Suspense } from "react";

import { UsersManager } from "@/components/admin/users-manager";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { listRoles, listUsers } from "@/lib/services/users.service";
import { isAdminClientConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { asInt, asUuid, first, type SearchParams } from "@/lib/utils/url";

export const metadata: Metadata = { title: "Usuarios" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [{ user, allowed }, params] = await Promise.all([requirePermission(PERMISSIONS.USERS_MANAGE), searchParams]);
  if (!allowed) return <ForbiddenState description="Solo los administradores del sistema pueden gestionar usuarios." />;

  const supabase = await createClient();
  const activeParam = first(params.active);
  const query = {
    q: first(params.q)?.trim().slice(0, 80) || undefined,
    roleId: asUuid(params.role),
    active: activeParam === "true" ? true : activeParam === "false" ? false : undefined,
    page: asInt(params.page, 1, 1, 10_000),
    pageSize: 20,
  };

  let result, roles;
  try {
    [result, roles] = await Promise.all([listUsers(supabase, query), listRoles(supabase)]);
  } catch {
    return <ErrorState />;
  }

  return (
    <>
      <PageHeader title="Usuarios" description="Alta, edición, activación y asignación de roles. Cada cambio queda auditado." />
      <Suspense>
        <UsersManager
          users={result.items}
          roles={roles}
          currentUser={user}
          adminConfigured={isAdminClientConfigured()}
          filters={{ q: query.q ?? "", roleId: query.roleId ?? "", active: activeParam ?? "" }}
        />
        <div className="mt-4">
          <Pagination page={result.page} totalPages={result.totalPages} total={result.total} pageSize={result.pageSize} itemLabel="usuarios" />
        </div>
      </Suspense>
    </>
  );
}
