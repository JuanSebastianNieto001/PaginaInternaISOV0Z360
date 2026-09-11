import { ArrowRight, CheckCircle2, CircleDashed, Clock3, FileText, Plus, Search, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ActivityTimeline } from "@/components/documents/activity-timeline";
import { FileIcon } from "@/components/documents/file-icon";
import { StatusBadge } from "@/components/documents/status-badge";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormSuccess } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getRecentActivity } from "@/lib/services/audit.service";
import { getDashboardStats } from "@/lib/services/dashboard.service";
import { getRecentlyAdded, getRecentlyModified } from "@/lib/services/documents.service";
import { createClient } from "@/lib/supabase/server";
import { formatNumber, formatRelative } from "@/lib/utils/format";
import type { DocumentListItem } from "@/types";

export const metadata: Metadata = { title: "Dashboard" };

function StatTile({
  label,
  value,
  icon: Icon,
  href,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "primary";
  hint?: string;
}) {
  const tones = {
    neutral: "bg-surface-2 text-fg-muted",
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
  };
  return (
    <Link href={href} className="group rounded-xl border border-border bg-surface p-4 shadow-card transition-colors hover:border-border-strong">
      <div className="flex items-center justify-between">
        <span className={`flex size-9 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="size-4.5" />
        </span>
        <ArrowRight className="size-4 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-fg">{formatNumber(value)}</p>
      <p className="text-sm text-fg-muted">{label}</p>
      {hint ? <p className="mt-1 text-xs text-fg-subtle">{hint}</p> : null}
    </Link>
  );
}

function DocRow({ doc, dateField }: { doc: DocumentListItem; dateField: "created_at" | "updated_at" }) {
  return (
    <li>
      <Link href={`/documents/${doc.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2">
        <FileIcon extension={doc.file_extension} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fg">{doc.name}</p>
          <p className="truncate text-xs text-fg-subtle">
            <span className="font-mono">{doc.code}</span>
            {doc.standard ? ` · ${doc.standard.code}` : ""} · v{doc.version}
          </p>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
          <StatusBadge status={doc.status} size="sm" />
          <span className="text-[11px] text-fg-subtle">{formatRelative(doc[dateField])}</span>
        </div>
      </Link>
    </li>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const [user, { notice }] = await Promise.all([requireUser(), searchParams]);
  const supabase = await createClient();

  let stats, added: DocumentListItem[] = [], modified: DocumentListItem[] = [], activity = [] as Awaited<ReturnType<typeof getRecentActivity>>;
  let failed = false;
  try {
    [stats, added, modified, activity] = await Promise.all([
      getDashboardStats(supabase),
      getRecentlyAdded(supabase, 5),
      getRecentlyModified(supabase, 5),
      getRecentActivity(supabase, 8),
    ]);
  } catch {
    failed = true;
  }

  const canCreate = can(user, PERMISSIONS.DOCUMENTS_CREATE);
  const firstName = user.fullName.split(" ")[0] || user.email;

  return (
    <>
      <PageHeader
        title={`Hola, ${firstName}`}
        description="Estado general del repositorio documental y actividad reciente."
        actions={
          <>
            {canCreate ? (
              <ButtonLink href="/documents/new" leftIcon={<Plus className="size-4" />}>
                Subir documento
              </ButtonLink>
            ) : null}
            <ButtonLink href="/documents?focus=search" variant="outline" leftIcon={<Search className="size-4" />}>
              Buscar
            </ButtonLink>
            <ButtonLink href="/documents" variant="outline" leftIcon={<FileText className="size-4" />}>
              Ver repositorio
            </ButtonLink>
          </>
        }
      />

      {notice === "password_updated" ? <FormSuccess message="Tu contraseña se ha actualizado correctamente." /> : null}

      {failed || !stats ? (
        <ErrorState className="mt-4" />
      ) : (
        <div className="mt-4 space-y-6">
          <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatTile label="Documentos" value={stats.total} icon={FileText} href="/documents" tone="primary" hint={`${formatNumber(stats.added_last_30_days)} nuevos en 30 días`} />
            <StatTile label="Aprobados" value={stats.approved} icon={CheckCircle2} href="/documents?status=approved" tone="success" />
            <StatTile label="En revisión" value={stats.review} icon={Clock3} href="/documents?status=review" tone="warning" />
            <StatTile label="Borradores" value={stats.draft} icon={CircleDashed} href="/documents?status=draft" />
            <StatTile label="Obsoletos" value={stats.obsolete} icon={Trash2} href="/documents?status=obsolete" tone="danger" />
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader title="Documentos por norma" description="Distribución del repositorio y porcentaje aprobado." action={<Link href="/standards" className="text-xs font-medium text-primary hover:underline">Ver normas</Link>} />
              <CardContent className="space-y-4">
                {stats.by_standard.length === 0 ? (
                  <EmptyState compact title="Sin normas activas" description="Crea normas en Administración para empezar a clasificar." />
                ) : (
                  stats.by_standard.map((s) => {
                    const pct = stats.total > 0 ? Math.round((s.total / stats.total) * 100) : 0;
                    const approvedPct = s.total > 0 ? Math.round((s.approved / s.total) * 100) : 0;
                    return (
                      <Link key={s.standard_id} href={`/documents?standard=${s.standard_id}`} className="block rounded-lg p-1 -m-1 hover:bg-surface-2">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="flex items-center gap-2 font-medium text-fg">
                            <Badge color={s.color} size="sm">{s.code}</Badge>
                            <span className="truncate text-fg-muted">{s.name}</span>
                          </span>
                          <span className="tabular-nums text-fg">{formatNumber(s.total)}</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
                          <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1 text-[11px] text-fg-subtle">{pct}% del total · {approvedPct}% aprobados</p>
                      </Link>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Añadidos recientemente" action={<Link href="/recent" className="text-xs font-medium text-primary hover:underline">Ver todo</Link>} />
              <CardContent className="px-3 pt-3">
                {added.length === 0 ? (
                  <EmptyState compact title="No hay documentos todavía" description={canCreate ? "Sube el primer documento para comenzar." : "Aún no se ha publicado documentación."} action={canCreate ? <ButtonLink href="/documents/new" size="sm">Subir documento</ButtonLink> : undefined} />
                ) : (
                  <ul className="space-y-0.5">
                    {added.map((d) => <DocRow key={d.id} doc={d} dateField="created_at" />)}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Modificados recientemente" action={<Link href="/documents?sort=updated_at&dir=desc" className="text-xs font-medium text-primary hover:underline">Ver todo</Link>} />
              <CardContent className="px-3 pt-3">
                {modified.length === 0 ? (
                  <EmptyState compact title="Sin modificaciones" description="Las actualizaciones aparecerán aquí." />
                ) : (
                  <ul className="space-y-0.5">
                    {modified.map((d) => <DocRow key={d.id} doc={d} dateField="updated_at" />)}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader title="Actividad reciente" description="Últimas acciones registradas en el sistema." action={<Link href="/activity" className="text-xs font-medium text-primary hover:underline">Ver actividad</Link>} />
            <CardContent className="pt-2">
              <ActivityTimeline logs={activity} compact />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
