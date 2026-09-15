"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  DOCUMENT_STATUSES,
  DOCUMENT_STATUS_DESCRIPTIONS,
  DOCUMENT_STATUS_PLURALS,
  INFO_CLASSIFICATIONS,
  INFO_CLASSIFICATION_DESCRIPTIONS,
  INFO_CLASSIFICATION_LABELS,
} from "@/lib/constants/documents";
import { cn } from "@/lib/utils/cn";
import { buildQueryString } from "@/lib/utils/url";
import type {
  Area,
  DocumentQuery,
  DocumentType,
  Process,
  ProfileSummary,
  StandardWithCategories,
  TagSummary,
} from "@/types";

import { Button } from "../ui/button";
import { Field } from "../ui/field";
import { Input } from "../ui/input";
import { Select } from "../ui/select";

export interface DocumentFiltersProps {
  tree: StandardWithCategories[];
  documentTypes: DocumentType[];
  areas: Area[];
  processes: Process[];
  tags: TagSummary[];
  authors: ProfileSummary[];
  versions: string[];
  query: DocumentQuery;
  basePath?: string;
  /** Documentos por área. Sirve para no mostrar áreas vacías de primeras. */
  areaCounts?: Record<string, number>;
}

type Draft = {
  q: string;
  standardId: string;
  categoryId: string;
  subcategoryId: string;
  documentTypeId: string;
  areaId: string;
  processId: string;
  classification: string;
  status: string;
  version: string;
  dateFrom: string;
  dateTo: string;
  createdBy: string;
  tagIds: string[];
};

/** Áreas visibles antes de pulsar "Ver todas". */
const VISIBLE_AREAS = 12;

function toDraft(q: DocumentQuery): Draft {
  return {
    q: q.q ?? "",
    standardId: q.standardId ?? "",
    categoryId: q.categoryId ?? "",
    subcategoryId: q.subcategoryId ?? "",
    documentTypeId: q.documentTypeId ?? "",
    areaId: q.areaId ?? "",
    processId: q.processId ?? "",
    classification: q.classification ?? "",
    status: q.status ?? "",
    version: q.version ?? "",
    dateFrom: q.dateFrom ?? "",
    dateTo: q.dateTo ?? "",
    createdBy: q.createdBy ?? "",
    tagIds: q.tagIds ?? [],
  };
}

/** Filtros que no tienen píldora propia y por tanto necesitan resumen. */
function countAdvanced(d: Draft): number {
  return [d.documentTypeId, d.version, d.dateFrom, d.dateTo, d.createdBy].filter(Boolean).length + d.tagIds.length;
}

function hasAnyFilter(d: Draft): boolean {
  return Boolean(
    d.q ||
      d.standardId ||
      d.categoryId ||
      d.subcategoryId ||
      d.areaId ||
      d.processId ||
      d.classification ||
      d.status ||
      countAdvanced(d) > 0,
  );
}

/* ----------------------------------------------------------------------------
 * Píldoras: la opción se ve sin abrir nada y se aplica con un solo clic.
 * ------------------------------------------------------------------------- */
function Chip({
  selected,
  onClick,
  title,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      title={title}
      className={cn(
        "inline-flex h-8 max-w-full items-center rounded-full border px-3 text-[13px] font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        selected
          ? "border-primary bg-primary text-primary-fg"
          : "border-border bg-surface text-fg-muted hover:border-primary hover:bg-primary-soft hover:text-primary",
      )}
    >
      <span className="truncate">{children}</span>
    </button>
  );
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 min-[720px]:flex-row min-[720px]:gap-3">
      <span className="shrink-0 pt-0.5 text-[11px] font-semibold uppercase tracking-[.1em] text-fg-subtle min-[720px]:w-[86px] min-[720px]:pt-2 min-[720px]:text-right">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Filtros del repositorio
 * ------------------------------------------------------------------------- */
export function DocumentFilters({
  tree,
  documentTypes,
  areas,
  processes,
  tags,
  authors,
  versions,
  query,
  basePath = "/documents",
  areaCounts,
}: DocumentFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [draft, setDraft] = useState<Draft>(() => toDraft(query));
  const [moreOpen, setMoreOpen] = useState(false);
  const [allAreas, setAllAreas] = useState(false);

  // Sincroniza el borrador cuando la URL cambia desde fuera (chips, reset, navegación).
  // Patrón "derived state": se ajusta durante el render, sin efectos.
  const serialized = JSON.stringify(toDraft(query));
  const [prevSerialized, setPrevSerialized] = useState(serialized);
  if (prevSerialized !== serialized) {
    setPrevSerialized(serialized);
    setDraft(JSON.parse(serialized) as Draft);
  }

  const commit = (next: Draft) => {
    const qs = buildQueryString({
      q: next.q || undefined,
      standard: next.standardId || undefined,
      category: next.categoryId || undefined,
      subcategory: next.subcategoryId || undefined,
      type: next.documentTypeId || undefined,
      area: next.areaId || undefined,
      process: next.processId || undefined,
      class: next.classification || undefined,
      status: next.status || undefined,
      version: next.version || undefined,
      from: next.dateFrom || undefined,
      to: next.dateTo || undefined,
      user: next.createdBy || undefined,
      tags: next.tagIds,
      sort: query.sort !== "updated_at" ? query.sort : undefined,
      dir: query.direction !== "desc" ? query.direction : undefined,
      size: query.pageSize !== 20 ? query.pageSize : undefined,
    });
    const view = new URLSearchParams(window.location.search).get("view");
    const withView = view ? `${qs ? `${qs}&` : "?"}view=${view}` : qs;
    router.replace(`${pathname || basePath}${withView}`, { scroll: false });
  };

  // Búsqueda con debounce; Enter aplica de inmediato.
  useEffect(() => {
    if (draft.q === (query.q ?? "")) return;
    const t = window.setTimeout(() => commit(draft), 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.q]);

  const change = (patch: Partial<Draft>) => {
    const next: Draft = { ...draft, ...patch };
    // Coherencia jerárquica
    if ("standardId" in patch) {
      next.categoryId = "";
      next.subcategoryId = "";
    }
    if ("categoryId" in patch) next.subcategoryId = "";
    setDraft(next);
    commit(next);
  };

  /** Alterna una píldora: si ya estaba puesta, vuelve a "todas". */
  const toggle = (
    key: "standardId" | "categoryId" | "subcategoryId" | "areaId" | "processId" | "classification" | "status",
    value: string,
  ) => {
    change({ [key]: draft[key] === value ? "" : value } as Partial<Draft>);
  };

  const reset = () => {
    const empty = toDraft({
      ...query,
      q: undefined,
      standardId: undefined,
      categoryId: undefined,
      subcategoryId: undefined,
      documentTypeId: undefined,
      areaId: undefined,
      processId: undefined,
      classification: undefined,
      status: undefined,
      version: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      createdBy: undefined,
      tagIds: [],
    });
    setDraft(empty);
    commit(empty);
  };

  const categories = useMemo(
    () => (draft.standardId ? tree.find((s) => s.id === draft.standardId)?.categories ?? [] : []),
    [tree, draft.standardId],
  );
  const subcategories = useMemo(
    () => categories.find((c) => c.id === draft.categoryId)?.subcategories ?? [],
    [categories, draft.categoryId],
  );

  // Las áreas sin documentos se guardan detrás de "Ver todas": en plena
  // auditoría estorban más de lo que ayudan.
  const { primaryAreas, restAreas } = useMemo(() => {
    const withDocs = areaCounts ? areas.filter((a) => (areaCounts[a.id] ?? 0) > 0) : [];
    // Sin conteos, o mientras ningún documento tenga área asignada, se
    // muestran las primeras por orden de organigrama.
    if (withDocs.length === 0) {
      return { primaryAreas: areas.slice(0, VISIBLE_AREAS), restAreas: areas.slice(VISIBLE_AREAS) };
    }
    const withoutDocs = areas.filter((a) => (areaCounts?.[a.id] ?? 0) === 0);
    return {
      primaryAreas: withDocs.slice(0, VISIBLE_AREAS),
      restAreas: [...withDocs.slice(VISIBLE_AREAS), ...withoutDocs],
    };
  }, [areas, areaCounts]);

  const visibleAreas = allAreas ? [...primaryAreas, ...restAreas] : primaryAreas;
  // El área seleccionada siempre debe verse, aunque esté en el grupo oculto.
  const selectedHiddenArea =
    draft.areaId && !visibleAreas.some((a) => a.id === draft.areaId)
      ? areas.find((a) => a.id === draft.areaId)
      : undefined;

  const advanced = countAdvanced(draft);
  const anyFilter = hasAnyFilter(draft);

  const advancedChips = useMemo(() => {
    const chips: { key: keyof Draft; label: string; value?: string }[] = [];
    const type = documentTypes.find((t) => t.id === draft.documentTypeId);
    const author = authors.find((a) => a.id === draft.createdBy);
    if (type) chips.push({ key: "documentTypeId", label: type.name });
    if (draft.version) chips.push({ key: "version", label: `v${draft.version}` });
    if (draft.dateFrom) chips.push({ key: "dateFrom", label: `Desde ${draft.dateFrom}` });
    if (draft.dateTo) chips.push({ key: "dateTo", label: `Hasta ${draft.dateTo}` });
    if (author) chips.push({ key: "createdBy", label: author.full_name || author.email });
    for (const id of draft.tagIds) {
      const t = tags.find((x) => x.id === id);
      if (t) chips.push({ key: "tagIds", label: `#${t.name}`, value: id });
    }
    return chips;
  }, [draft, documentTypes, authors, tags]);

  const removeChip = (chip: { key: keyof Draft; value?: string }) => {
    if (chip.key === "tagIds") change({ tagIds: draft.tagIds.filter((t) => t !== chip.value) });
    else change({ [chip.key]: "" } as Partial<Draft>);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-3 shadow-card sm:p-4">
      {/* Búsqueda */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-fg-subtle" />
          <Input
            type="search"
            value={draft.q}
            onChange={(e) => setDraft({ ...draft, q: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && commit(draft)}
            placeholder="Escribe el nombre o el código del documento…"
            aria-label="Buscar documentos"
            className="h-11 rounded-xl pl-11 text-[15px]"
          />
        </div>
        {anyFilter ? (
          <Button variant="ghost" onClick={reset} className="shrink-0" leftIcon={<X className="size-4" />}>
            <span className="hidden sm:inline">Limpiar</span>
          </Button>
        ) : null}
      </div>

      {/* Píldoras: norma → capítulo → detalle → área → estado */}
      <div className="mt-3 space-y-2.5 border-t border-border pt-3">
        <ChipRow label="Norma">
          <Chip selected={!draft.standardId} onClick={() => change({ standardId: "" })}>
            Todas
          </Chip>
          {tree.map((s) => (
            <Chip
              key={s.id}
              selected={draft.standardId === s.id}
              onClick={() => toggle("standardId", s.id)}
              title={s.description ?? undefined}
            >
              {s.name}
            </Chip>
          ))}
        </ChipRow>

        {categories.length > 0 ? (
          <ChipRow label="Capítulo">
            <Chip selected={!draft.categoryId} onClick={() => change({ categoryId: "" })}>
              Todos
            </Chip>
            {categories.map((c) => (
              <Chip
                key={c.id}
                selected={draft.categoryId === c.id}
                onClick={() => toggle("categoryId", c.id)}
                title={c.description ?? undefined}
              >
                {c.name}
              </Chip>
            ))}
          </ChipRow>
        ) : null}

        {subcategories.length > 0 ? (
          <ChipRow label="Detalle">
            <Chip selected={!draft.subcategoryId} onClick={() => change({ subcategoryId: "" })}>
              Todos
            </Chip>
            {subcategories.map((s) => (
              <Chip key={s.id} selected={draft.subcategoryId === s.id} onClick={() => toggle("subcategoryId", s.id)}>
                {s.name}
              </Chip>
            ))}
          </ChipRow>
        ) : null}

        {processes.length > 0 ? (
          <ChipRow label="Proceso">
            <Chip selected={!draft.processId} onClick={() => change({ processId: "" })}>
              Todos
            </Chip>
            {processes.map((p) => (
              <Chip
                key={p.id}
                selected={draft.processId === p.id}
                onClick={() => toggle("processId", p.id)}
                title={p.description ?? undefined}
              >
                {p.code}
              </Chip>
            ))}
          </ChipRow>
        ) : null}

        {areas.length > 0 ? (
          <ChipRow label="Cargo">
            <Chip selected={!draft.areaId} onClick={() => change({ areaId: "" })}>
              Todas
            </Chip>
            {visibleAreas.map((a) => (
              <Chip key={a.id} selected={draft.areaId === a.id} onClick={() => toggle("areaId", a.id)}>
                {a.name}
              </Chip>
            ))}
            {selectedHiddenArea ? (
              <Chip selected onClick={() => change({ areaId: "" })}>
                {selectedHiddenArea.name}
              </Chip>
            ) : null}
            {restAreas.length > 0 ? (
              <button
                type="button"
                onClick={() => setAllAreas((v) => !v)}
                aria-expanded={allAreas}
                className="h-8 rounded-full px-2 text-[13px] font-medium text-primary hover:underline"
              >
                {allAreas ? "Ver menos" : `Ver todas (${areas.length})`}
              </button>
            ) : null}
          </ChipRow>
        ) : null}

        <ChipRow label="Estado">
          <Chip selected={!draft.status} onClick={() => change({ status: "" })}>
            Todos
          </Chip>
          {DOCUMENT_STATUSES.map((s) => (
            <Chip
              key={s}
              selected={draft.status === s}
              onClick={() => toggle("status", s)}
              title={DOCUMENT_STATUS_DESCRIPTIONS[s]}
            >
              {DOCUMENT_STATUS_PLURALS[s]}
            </Chip>
          ))}
        </ChipRow>

        <ChipRow label="Acceso">
          <Chip selected={!draft.classification} onClick={() => change({ classification: "" })}>
            Todos
          </Chip>
          {INFO_CLASSIFICATIONS.map((c) => (
            <Chip
              key={c}
              selected={draft.classification === c}
              onClick={() => toggle("classification", c)}
              title={INFO_CLASSIFICATION_DESCRIPTIONS[c]}
            >
              {INFO_CLASSIFICATION_LABELS[c]}
            </Chip>
          ))}
        </ChipRow>
      </div>

      {/* Filtros poco frecuentes, plegados */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button
          variant={moreOpen ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setMoreOpen((v) => !v)}
          leftIcon={<SlidersHorizontal className="size-4" />}
          aria-expanded={moreOpen}
        >
          Más filtros
          {advanced > 0 ? <span className="ml-1.5 tabular-nums">({advanced})</span> : null}
        </Button>
        {advancedChips.map((chip) => (
          <button
            key={`${chip.key}-${chip.value ?? chip.label}`}
            type="button"
            onClick={() => removeChip(chip)}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-fg hover:border-border-strong"
            aria-label={`Quitar filtro ${chip.label}`}
          >
            {chip.label}
            <X className="size-3 text-fg-subtle" />
          </button>
        ))}
      </div>

      {moreOpen ? (
        <div className="mt-3 grid gap-3 rounded-xl border border-border bg-surface-2/50 p-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
          <Field label="Tipo de documento">
            <Select
              value={draft.documentTypeId}
              onChange={(e) => change({ documentTypeId: e.target.value })}
              placeholder="Todos"
              options={documentTypes.map((t) => ({ value: t.id, label: t.name }))}
            />
          </Field>
          <Field label="Versión">
            <Select
              value={draft.version}
              onChange={(e) => change({ version: e.target.value })}
              placeholder="Todas"
              options={versions.map((v) => ({ value: v, label: `v${v}` }))}
            />
          </Field>
          <Field label="Modificado desde">
            <Input
              type="date"
              value={draft.dateFrom}
              max={draft.dateTo || undefined}
              onChange={(e) => change({ dateFrom: e.target.value })}
            />
          </Field>
          <Field label="Modificado hasta">
            <Input
              type="date"
              value={draft.dateTo}
              min={draft.dateFrom || undefined}
              onChange={(e) => change({ dateTo: e.target.value })}
            />
          </Field>
          <Field label="Quién lo subió">
            <Select
              value={draft.createdBy}
              onChange={(e) => change({ createdBy: e.target.value })}
              placeholder="Cualquiera"
              options={authors.map((a) => ({ value: a.id, label: a.full_name || a.email }))}
            />
          </Field>
          <Field label="Etiquetas" className="sm:col-span-2 lg:col-span-3">
            <div className="flex flex-wrap gap-1.5">
              {tags.length === 0 ? <span className="text-xs text-fg-subtle">No hay etiquetas.</span> : null}
              {tags.map((t) => {
                const selected = draft.tagIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      change({
                        tagIds: selected ? draft.tagIds.filter((x) => x !== t.id) : [...draft.tagIds, t.id],
                      })
                    }
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      selected
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg",
                    )}
                  >
                    #{t.name}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      ) : null}
    </div>
  );
}
