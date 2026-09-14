"use client";

import { Award, HeartPulse, Leaf, Lock, ShieldCheck, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useState, useTransition } from "react";

import { loadStandardOverview } from "@/lib/actions/dashboard.actions";
import { cn } from "@/lib/utils/cn";
import { formatNumber, formatRelative, initials } from "@/lib/utils/format";
import type { StandardOverview } from "@/types";

import { FileExtBox } from "../documents/file-ext-box";
import { StatusBadge } from "../documents/status-badge";
import { Skeleton } from "../ui/skeleton";

export interface StandardCardData {
  id: string;
  code: string;
  name: string;
  description: string | null;
  total: number;
  approved: number;
}

/* ----------------------------------------------------------------------------
 * Estilos de tarjeta: azul marino, blanca y azul, en ese orden cíclico.
 * ------------------------------------------------------------------------- */
interface CardTheme {
  card: string;
  chip: string;
  icon: string;
  meta: string;
}

const THEMES: CardTheme[] = [
  {
    card: "bg-brand-900 text-white",
    chip: "bg-white/15 text-white",
    icon: "bg-white/10 text-brand-400",
    meta: "text-white/70",
  },
  {
    card: "bg-surface text-fg",
    chip: "bg-brand-100 text-brand-800",
    icon: "bg-primary-soft text-primary",
    meta: "text-fg-subtle",
  },
  {
    card: "bg-brand-600 text-white",
    chip: "bg-white/20 text-white",
    icon: "bg-white/15 text-white",
    meta: "text-white/70",
  },
];

const ICON_BY_CODE: { match: RegExp; icon: LucideIcon }[] = [
  { match: /9001/, icon: Award },
  { match: /45001/, icon: HeartPulse },
  { match: /27001/, icon: Lock },
  { match: /14001/, icon: Leaf },
];

function iconFor(code: string, index: number): LucideIcon {
  const found = ICON_BY_CODE.find((entry) => entry.match.test(code));
  if (found) return found.icon;
  return [Award, HeartPulse, Lock][index % 3] ?? ShieldCheck;
}

/* ----------------------------------------------------------------------------
 * Bloque de normas + panel desplegable
 * ------------------------------------------------------------------------- */
export function StandardsBoard({ standards }: { standards: StandardCardData[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, StandardOverview>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const select = useCallback(
    (id: string) => {
      setError(null);
      if (selectedId === id) {
        setSelectedId(null);
        return;
      }
      setSelectedId(id);
      if (cache[id]) return;
      startTransition(async () => {
        const result = await loadStandardOverview(id);
        if (result.ok) {
          setCache((prev) => ({ ...prev, [id]: result.data }));
        } else {
          setError(result.error);
        }
      });
    },
    [cache, selectedId],
  );

  const selected = standards.find((s) => s.id === selectedId) ?? null;
  const overview = selectedId ? cache[selectedId] : undefined;

  return (
    <section aria-label="Marco normativo" className="mb-8">
      <h2 className="mb-3.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.1em] text-fg-muted">
        <ShieldCheck className="size-4 text-primary" aria-hidden />
        Marco normativo y cumplimiento
      </h2>

      <div className="grid grid-cols-1 gap-4 min-[1200px]:grid-cols-3">
        {standards.map((standard, index) => {
          const theme = THEMES[index % THEMES.length] as CardTheme;
          const Icon = iconFor(standard.code, index);
          const isSelected = standard.id === selectedId;
          return (
            <button
              key={standard.id}
              type="button"
              onClick={() => select(standard.id)}
              aria-pressed={isSelected}
              className={cn(
                "flex items-center justify-between gap-4 rounded-2xl border-2 p-[22px] text-left shadow-card transition-[transform,box-shadow] duration-150",
                "hover:-translate-y-0.5 hover:shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                theme.card,
                isSelected ? "border-brand-400" : index % THEMES.length === 1 ? "border-border" : "border-transparent",
              )}
            >
              <span className="min-w-0">
                <span
                  className={cn(
                    "mb-3 inline-block whitespace-nowrap rounded-full px-2.5 py-[5px] text-[10px] font-bold uppercase tracking-[.1em]",
                    theme.chip,
                  )}
                >
                  {standard.code}
                </span>
                <span className="block text-[28px] font-extrabold leading-none tracking-[-0.03em]">
                  {standard.name}
                </span>
                {standard.description ? (
                  <span className="mt-2 block text-[13px] leading-[1.4] opacity-75">{standard.description}</span>
                ) : null}
                <span className={cn("mt-3 block text-xs tabular-nums", theme.meta)}>
                  {formatNumber(standard.total)} documentos · {formatNumber(standard.approved)} aprobados
                </span>
              </span>
              <span className={cn("grid size-14 shrink-0 place-items-center rounded-full", theme.icon)} aria-hidden>
                <Icon className="size-7" />
              </span>
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface shadow-pop animate-fade-in-up">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-2 px-[22px] py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-lg font-extrabold tracking-[-0.02em] text-fg">{selected.code}</span>
              <span className="truncate text-[13px] text-fg-subtle">{selected.name}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/documents?standard=${selected.id}&status=approved`}
                title="Documentos vigentes y de uso oficial de esta norma"
                className="inline-flex h-[34px] items-center rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-fg transition-colors hover:bg-primary-hover"
              >
                Sólo aprobados
              </Link>
              <Link
                href={`/documents?standard=${selected.id}`}
                className="inline-flex h-[34px] items-center rounded-lg border border-border-strong px-3 text-[13px] font-medium text-fg transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
              >
                Ver todos
              </Link>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Cerrar panel de la norma"
                className="grid size-[34px] place-items-center rounded-lg border border-border-strong text-fg-muted transition-colors hover:bg-primary-soft hover:text-primary"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {error ? (
            <p className="px-[22px] py-6 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : (
            <div className="grid grid-cols-1 min-[1200px]:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
              <div className="border-b border-border px-[22px] py-[18px] min-[1200px]:border-b-0 min-[1200px]:border-r">
                <h3 className="mb-3 text-[11px] uppercase tracking-[.1em] text-fg-subtle">Usuarios más implicados</h3>
                {!overview ? (
                  <ContributorSkeleton />
                ) : overview.contributors.length === 0 ? (
                  <p className="text-[13px] text-fg-subtle">Todavía no hay actividad registrada en esta norma.</p>
                ) : (
                  <ul>
                    {overview.contributors.map((c) => (
                      <li key={c.id} className="flex items-center gap-2.5 py-2">
                        <span
                          className="grid size-[34px] shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-extrabold text-brand-800"
                          aria-hidden
                        >
                          {initials(c.fullName)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-fg">{c.fullName}</span>
                          <span className="block truncate text-[11px] text-fg-subtle">{c.roleName ?? c.email}</span>
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-fg-muted">
                          {formatNumber(c.actions)} acciones
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="px-[22px] py-[18px]">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <h3 className="text-[11px] uppercase tracking-[.1em] text-fg-subtle">Documentos de la norma</h3>
                  {overview ? (
                    <span className="text-xs text-fg-subtle">{formatNumber(overview.totalDocuments)} resultados</span>
                  ) : null}
                </div>
                {!overview ? (
                  <DocumentSkeleton />
                ) : overview.documents.length === 0 ? (
                  <p className="text-[13px] text-fg-subtle">Esta norma todavía no tiene documentos.</p>
                ) : (
                  <ul>
                    {overview.documents.map((doc, index) => (
                      <li key={doc.id}>
                        <Link
                          href={`/documents/${doc.id}`}
                          className={cn(
                            "grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 transition-colors hover:bg-surface-2 sm:grid-cols-[32px_minmax(0,1fr)_auto_auto]",
                            index < overview.documents.length - 1 && "border-b border-border",
                          )}
                        >
                          <FileExtBox extension={doc.file_extension} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-fg">{doc.name}</span>
                            <span className="block truncate text-xs tabular-nums text-fg-subtle">
                              {doc.code} · v{doc.version}
                            </span>
                          </span>
                          <StatusBadge status={doc.status} size="sm" />
                          <span className="hidden whitespace-nowrap text-[11px] text-fg-subtle sm:block">
                            {formatRelative(doc.updated_at)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <span className="sr-only" role="status">
            {pending ? "Cargando datos de la norma" : ""}
          </span>
        </div>
      ) : null}
    </section>
  );
}

function ContributorSkeleton() {
  return (
    <ul className="space-y-3" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex items-center gap-2.5">
          <Skeleton className="size-[34px] rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DocumentSkeleton() {
  return (
    <ul className="space-y-3.5" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-4 w-16 rounded-full" />
        </li>
      ))}
    </ul>
  );
}
