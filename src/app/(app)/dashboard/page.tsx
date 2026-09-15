import { Building2, FileText, Plus, Search, Workflow } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ActivityList } from "@/components/dashboard/activity-list";
import { TaxonomyBoard, type TaxonomyBoardCard } from "@/components/dashboard/taxonomy-board";
import { StandardsBoard, type StandardCardData } from "@/components/dashboard/standards-board";
import { FileExtBox } from "@/components/documents/file-ext-box";
import { StatusBadge } from "@/components/documents/status-badge";
import { ButtonLink } from "@/components/ui/button";
import { FormSuccess } from "@/components/ui/field";
import { ErrorState } from "@/components/ui/states";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getRecentActivity } from "@/lib/services/audit.service";
import { getDashboardStats } from "@/lib/services/dashboard.service";
import { getRecentlyAdded } from "@/lib/services/documents.service";
import {
  getAreaCounts,
  getProcessCounts,
  listAreas,
  listProcesses,
  listStandards,
} from "@/lib/services/taxonomy.service";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";
import { formatNumber, formatRelative, greeting, longDateLabel } from "@/lib/utils/format";
import type { Area, AuditLogItem, DashboardStats, DocumentListItem, Process, Standard } from "@/types";

export const metadata: Metadata = { title: "Dashboard" };

/* ----------------------------------------------------------------------------
 * Indicadores
 * ------------------------------------------------------------------------- */
const STAT_CELLS = [
  { key: "approved", label: "Aprobados", href: "/documents?status=approved", dot: "bg-brand-900", bar: "bg-brand-900" },
  { key: "review", label: "En revisión", href: "/documents?status=review", dot: "bg-brand-600", bar: "bg-brand-600" },
  { key: "draft", label: "Pendientes", href: "/documents?status=draft", dot: "bg-brand-400", bar: "bg-brand-400" },
  { key: "obsolete", label: "Obsoletos", href: "/documents?status=obsolete", dot: "bg-brand-mute", bar: "bg-brand-mute" },
] as const;

function StatsCard({ stats }: { stats: DashboardStats }) {
  const percent = (value: number) => (stats.total > 0 ? Math.round((value / stats.total) * 100) : 0);

  return (
    <section
      aria-label="Indicadores"
      className="mb-8 grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-surface shadow-card min-[900px]:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))]"
    >
      <div className="col-span-2 bg-surface-2 p-[22px] min-[900px]:col-span-1">
        <p className="text-[11px] uppercase tracking-[.1em] text-fg-subtle">Total de documentos</p>
        <p className="my-2 text-[64px] font-extrabold leading-none tracking-[-0.04em] tabular-nums text-brand-900 dark:text-fg">
          {formatNumber(stats.total)}
        </p>
        <p className="text-[13px] text-fg-subtle">
          <span className="font-semibold text-brand-700 dark:text-primary">
            +{formatNumber(stats.added_last_30_days)}
          </span>{" "}
          añadidos en los últimos 30 días
        </p>
      </div>

      {STAT_CELLS.map((cell) => {
        const value = stats[cell.key];
        const pct = percent(value);
        return (
          <Link
            key={cell.key}
            href={cell.href}
            className="border-t border-border p-[22px] transition-colors hover:bg-surface-2 min-[900px]:border-l min-[900px]:border-t-0"
          >
            <span className="flex items-center gap-2 text-[11px] uppercase tracking-[.1em] text-fg-subtle">
              <span className={cn("size-2 shrink-0 rounded-full", cell.dot)} aria-hidden />
              {cell.label}
            </span>
            <span className="my-3 block text-4xl font-extrabold leading-none tracking-[-0.03em] tabular-nums text-fg">
              {formatNumber(value)}
            </span>
            <span className="block h-1 overflow-hidden rounded-full bg-surface-3">
              <span className={cn("block h-full rounded-full", cell.bar)} style={{ width: `${pct}%` }} />
            </span>
            <span className="mt-1.5 block text-xs text-fg-subtle">{pct}% del repositorio</span>
          </Link>
        );
      })}
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * Listas inferiores
 * ------------------------------------------------------------------------- */
function ListCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-surface px-4 py-1.5 shadow-card">{children}</div>;
}

function SectionHeading({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <h2 className="text-lg font-extrabold tracking-[-0.01em] text-fg">{title}</h2>
      <Link href={href} className="text-[13px] text-brand-700 hover:underline dark:text-primary">
        {linkLabel} →
      </Link>
    </div>
  );
}

function RecentDocuments({ documents }: { documents: DocumentListItem[] }) {
  if (documents.length === 0) {
    return <p className="py-6 text-sm text-fg-subtle">Todavía no hay documentos en el repositorio.</p>;
  }

  return (
    <ul>
      {documents.map((doc, index) => (
        <li key={doc.id}>
          <Link
            href={`/documents/${doc.id}`}
            className={cn(
              "grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 py-3 transition-colors hover:bg-surface-2",
              index < documents.length - 1 && "border-b border-border",
            )}
          >
            <FileExtBox extension={doc.file_extension} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-fg">{doc.name}</span>
              <span className="mt-0.5 block truncate text-xs tabular-nums text-fg-subtle">
                {doc.code}
                {doc.standard ? ` · ${doc.standard.code}` : ""} · v{doc.version}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <StatusBadge status={doc.status} size="sm" />
              <span className="text-[11px] text-fg-subtle">{formatRelative(doc.created_at)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ----------------------------------------------------------------------------
 * Página
 * ------------------------------------------------------------------------- */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const [user, { notice }] = await Promise.all([requireUser(), searchParams]);
  const supabase = await createClient();

  let stats: DashboardStats | undefined;
  let standards: Standard[] = [];
  let areas: Area[] = [];
  let areaCounts: { area_id: string; total: number }[] = [];
  let processes: Process[] = [];
  let processCounts: { process_id: string; total: number }[] = [];
  let added: DocumentListItem[] = [];
  let activity: AuditLogItem[] = [];
  let failed = false;

  try {
    [stats, standards, areas, areaCounts, processes, processCounts, added, activity] = await Promise.all([
      getDashboardStats(supabase),
      listStandards(supabase),
      listAreas(supabase),
      getAreaCounts(supabase),
      listProcesses(supabase),
      getProcessCounts(supabase),
      getRecentlyAdded(supabase, 5),
      getRecentActivity(supabase, 6),
    ]);
  } catch {
    failed = true;
  }

  const canCreate = can(user, PERMISSIONS.DOCUMENTS_CREATE);
  const firstName = user.fullName.split(" ")[0] || user.email;

  // Las tarjetas de norma combinan la taxonomía (descripción, orden) con el
  // recuento del RPC de estadísticas.
  const statsByStandard = new Map((stats?.by_standard ?? []).map((s) => [s.standard_id, s]));
  const standardCards: StandardCardData[] = standards.map((standard) => ({
    id: standard.id,
    code: standard.code,
    name: standard.name,
    description: standard.description,
    total: statsByStandard.get(standard.id)?.total ?? 0,
    approved: statsByStandard.get(standard.id)?.approved ?? 0,
  }));

  const documentsByArea = new Map(areaCounts.map((c) => [c.area_id, c.total]));
  const areaCards: TaxonomyBoardCard[] = areas.map((area) => ({
    id: area.id,
    name: area.name,
    total: documentsByArea.get(area.id) ?? 0,
  }));

  const documentsByProcess = new Map(processCounts.map((c) => [c.process_id, c.total]));
  const processCards: TaxonomyBoardCard[] = processes.map((process) => ({
    id: process.id,
    name: process.name,
    total: documentsByProcess.get(process.id) ?? 0,
  }));

  return (
    <>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="mb-2 text-[11px] uppercase tracking-[.12em] text-brand-700 dark:text-primary">
            {longDateLabel()}
          </p>
          <h1 className="mb-2 text-[clamp(28px,5vw,36px)] font-extrabold leading-tight tracking-[-0.025em] text-fg">
            {greeting()}, {firstName}
          </h1>
          {stats ? (
            <p className="max-w-[560px] text-pretty text-[15px] text-fg-subtle">
              {formatNumber(stats.total)} documentos bajo control.{" "}
              <strong className="font-semibold text-fg">{formatNumber(stats.review)} en revisión</strong> esperan
              aprobación y {formatNumber(stats.draft)} borradores siguen sin publicar.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {canCreate ? (
            <ButtonLink
              href="/documents/new"
              leftIcon={<Plus className="size-4" strokeWidth={2.4} />}
              className="h-10 rounded-[10px] bg-[linear-gradient(180deg,var(--brand-500),var(--brand-600))] font-semibold text-white shadow-[0_6px_16px_rgb(29_78_216/0.25)] hover:bg-brand-700 hover:bg-none"
            >
              Subir documento
            </ButtonLink>
          ) : null}
          <ButtonLink
            href="/documents?focus=search"
            variant="outline"
            leftIcon={<Search className="size-[15px]" />}
            className="h-10 rounded-[10px] border-border-strong"
          >
            Buscar
          </ButtonLink>
          <ButtonLink
            href="/documents"
            variant="outline"
            leftIcon={<FileText className="size-[15px]" />}
            className="h-10 rounded-[10px] border-border-strong"
          >
            Ver repositorio
          </ButtonLink>
        </div>
      </header>

      {notice === "password_updated" ? (
        <div className="mb-6">
          <FormSuccess message="Tu contraseña se ha actualizado correctamente." />
        </div>
      ) : null}

      {failed || !stats ? (
        <ErrorState />
      ) : (
        <>
          {standardCards.length > 0 ? <StandardsBoard standards={standardCards} /> : null}

          <TaxonomyBoard title="Procesos del SGI" icon={Workflow} param="process" items={processCards} />

          <TaxonomyBoard title="Cargos responsables" icon={Building2} param="area" items={areaCards} />

          <StatsCard stats={stats} />

          <div className="grid grid-cols-1 gap-8 min-[900px]:grid-cols-2">
            <section aria-label="Documentos recientes">
              <SectionHeading title="Documentos recientes" href="/recent" linkLabel="Ver todos" />
              <ListCard>
                <RecentDocuments documents={added} />
              </ListCard>
            </section>

            <section aria-label="Actividad reciente">
              <SectionHeading title="Actividad reciente" href="/activity" linkLabel="Ver actividad" />
              <ListCard>
                <ActivityList logs={activity} />
              </ListCard>
            </section>
          </div>
        </>
      )}
    </>
  );
}
