import { ArrowRight, FileText, ShieldCheck, Tags, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ActivityTimeline } from "@/components/documents/activity-timeline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { can, canAny } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { ADMIN_NAV } from "@/lib/constants/navigation";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getRecentActivity } from "@/lib/services/audit.service";
import { getDashboardStats } from "@/lib/services/dashboard.service";
import { listStandards } from "@/lib/services/taxonomy.service";
import { getUserStats } from "@/lib/services/users.service";
import { isAdminClientConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Administración" };

export default async function AdminOverviewPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const canUsers = can(user, PERMISSIONS.USERS_MANAGE);
  const canAudit = can(user, PERMISSIONS.AUDIT_READ);

  const [docStats, userStats, standards, activity] = await Promise.all([
    getDashboardStats(supabase).catch(() => null),
    canUsers ? getUserStats(supabase).catch(() => null) : Promise.resolve(null),
    listStandards(supabase, { includeInactive: true }).catch(() => []),
    canAudit ? getRecentActivity(supabase, 6).catch(() => []) : Promise.resolve([]),
  ]);

  const sections = ADMIN_NAV.filter((i) => !i.exact && canAny(user, i.anyPermission));

  return (
    <>
      <PageHeader title="Administración" description="Configuración del sistema, usuarios, taxonomía y auditoría." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary"><FileText className="size-5" /></span>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-fg">{formatNumber(docStats?.total ?? 0)}</p>
              <p className="text-sm text-fg-muted">Documentos</p>
            </div>
          </CardContent>
        </Card>
        {userStats ? (
          <Card>
            <CardContent className="flex items-center gap-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-success-soft text-success"><Users className="size-5" /></span>
              <div>
                <p className="text-2xl font-semibold tabular-nums text-fg">{formatNumber(userStats.active)}</p>
                <p className="text-sm text-fg-muted">Usuarios activos <span className="text-fg-subtle">/ {formatNumber(userStats.total)}</span></p>
              </div>
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardContent className="flex items-center gap-4">
            <span className="flex size-10 items-center justify-center rounded-lg bg-info-soft text-info"><Tags className="size-5" /></span>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-fg">{formatNumber(standards.filter((s) => s.active).length)}</p>
              <p className="text-sm text-fg-muted">Normas activas <span className="text-fg-subtle">/ {standards.length}</span></p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <span className="flex size-10 items-center justify-center rounded-lg bg-warning-soft text-warning"><ShieldCheck className="size-5" /></span>
            <div>
              <p className="text-sm font-semibold text-fg">{isAdminClientConfigured() ? "Alta de usuarios activa" : "Alta de usuarios no configurada"}</p>
              <p className="text-xs text-fg-muted">{isAdminClientConfigured() ? "SUPABASE_SERVICE_ROLE_KEY presente en el servidor." : "Define SUPABASE_SERVICE_ROLE_KEY para crear usuarios desde la app."}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Secciones" description="Accesos disponibles según tu rol." />
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <Link key={s.href} href={s.href} className="group flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-border-strong hover:bg-surface-2/60">
                  <span className="flex size-9 items-center justify-center rounded-md bg-surface-2 text-fg-muted group-hover:text-fg"><Icon className="size-4" /></span>
                  <span className="flex-1 text-sm font-medium text-fg">{s.label}</span>
                  <ArrowRight className="size-4 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {userStats ? (
          <Card>
            <CardHeader title="Usuarios por rol" />
            <CardContent className="space-y-2">
              {userStats.byRole.map((r) => (
                <div key={r.role.id} className="flex items-center justify-between text-sm">
                  <Badge tone="outline">{r.role.name}</Badge>
                  <span className="tabular-nums text-fg">{r.count}</span>
                </div>
              ))}
              {userStats.inactive > 0 ? <p className="pt-2 text-xs text-fg-subtle">{userStats.inactive} usuario(s) desactivado(s).</p> : null}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {canAudit ? (
        <Card className="mt-6">
          <CardHeader title="Última actividad" action={<Link href="/admin/activity" className="text-xs font-medium text-primary hover:underline">Ver auditoría</Link>} />
          <CardContent className="pt-2"><ActivityTimeline logs={activity} compact /></CardContent>
        </Card>
      ) : null}
    </>
  );
}
