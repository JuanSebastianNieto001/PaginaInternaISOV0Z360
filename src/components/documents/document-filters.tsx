"use client";

import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { DOCUMENT_STATUSES, DOCUMENT_STATUS_LABELS } from "@/lib/constants/documents";
import { cn } from "@/lib/utils/cn";
import { buildQueryString } from "@/lib/utils/url";
import type {
  Area,
  DocumentQuery,
  DocumentStatus,
  DocumentType,
  ProfileSummary,
  StandardWithCategories,
  TagSummary,
} from "@/types";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Field } from "../ui/field";
import { Input } from "../ui/input";
import { Select } from "../ui/select";

export interface DocumentFiltersProps {
  tree: StandardWithCategories[];
  documentTypes: DocumentType[];
  areas: Area[];
  tags: TagSummary[];
  authors: ProfileSummary[];
  versions: string[];
  query: DocumentQuery;
  basePath?: string;
}

type Draft = {
  q: string;
  standardId: string;
  categoryId: string;
  subcategoryId: string;
  documentTypeId: string;
  areaId: string;
  status: string;
  version: string;
  dateFrom: string;
  dateTo: string;
  createdBy: string;
  tagIds: string[];
};

function toDraft(q: DocumentQuery): Draft {
  return {
    q: q.q ?? "",
    standardId: q.standardId ?? "",
    categoryId: q.categoryId ?? "",
    subcategoryId: q.subcategoryId ?? "",
    documentTypeId: q.documentTypeId ?? "",
    areaId: q.areaId ?? "",
    status: q.status ?? "",
    version: q.version ?? "",
    dateFrom: q.dateFrom ?? "",
    dateTo: q.dateTo ?? "",
    createdBy: q.createdBy ?? "",
    tagIds: q.tagIds ?? [],
  };
}

function countActive(d: Draft): number {
  return [
    d.standardId,
    d.categoryId,
    d.subcategoryId,
    d.documentTypeId,
    d.areaId,
    d.status,
    d.version,
    d.dateFrom,
    d.dateTo,
    d.createdBy,
  ].filter(Boolean).length + (d.tagIds.length > 0 ? 1 : 0);
}

export function DocumentFilters({ tree, documentTypes, areas, tags, authors, versions, query, basePath = "/documents" }: DocumentFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [draft, setDraft] = useState<Draft>(() => toDraft(query));
  const [moreOpen, setMoreOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

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

  // Búsqueda con debounce (solo escritorio; en móvil se aplica con el botón)
  useEffect(() => {
    if (draft.q === (query.q ?? "")) return;
    const t = window.setTimeout(() => commit(draft), 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.q]);

  const change = (patch: Partial<Draft>, immediate = true) => {
    const next: Draft = { ...draft, ...patch };
    // Coherencia jerárquica
    if ("standardId" in patch) {
      next.categoryId = "";
      next.subcategoryId = "";
    }
    if ("categoryId" in patch) next.subcategoryId = "";
    setDraft(next);
    if (immediate) commit(next);
  };

  const reset = () => {
    const empty = toDraft({ ...query, q: undefined, standardId: undefined, categoryId: undefined, subcategoryId: undefined, documentTypeId: undefined, areaId: undefined, status: undefined, version: undefined, dateFrom: undefined, dateTo: undefined, createdBy: undefined, tagIds: [] });
    setDraft(empty);
    commit(empty);
    setSheetOpen(false);
  };

  const categories = useMemo(
    () => (draft.standardId ? tree.find((s) => s.id === draft.standardId)?.categories ?? [] : tree.flatMap((s) => s.categories)),
    [tree, draft.standardId],
  );
  const subcategories = useMemo(
    () => categories.find((c) => c.id === draft.categoryId)?.subcategories ?? [],
    [categories, draft.categoryId],
  );

  const active = countActive(draft);
  const activeChips = useMemo(() => {
    const chips: { key: keyof Draft; label: string; value?: string }[] = [];
    const std = tree.find((s) => s.id === draft.standardId);
    const cat = categories.find((c) => c.id === draft.categoryId);
    const sub = subcategories.find((s) => s.id === draft.subcategoryId);
    const type = documentTypes.find((t) => t.id === draft.documentTypeId);
    const area = areas.find((a) => a.id === draft.areaId);
    const author = authors.find((a) => a.id === draft.createdBy);
    if (std) chips.push({ key: "standardId", label: std.code });
    if (cat) chips.push({ key: "categoryId", label: cat.name });
    if (sub) chips.push({ key: "subcategoryId", label: sub.name });
    if (type) chips.push({ key: "documentTypeId", label: type.name });
    if (area) chips.push({ key: "areaId", label: area.name });
    if (draft.status) chips.push({ key: "status", label: DOCUMENT_STATUS_LABELS[draft.status as DocumentStatus] });
    if (draft.version) chips.push({ key: "version", label: `v${draft.version}` });
    if (draft.dateFrom) chips.push({ key: "dateFrom", label: `Desde ${draft.dateFrom}` });
    if (draft.dateTo) chips.push({ key: "dateTo", label: `Hasta ${draft.dateTo}` });
    if (author) chips.push({ key: "createdBy", label: author.full_name });
    for (const id of draft.tagIds) {
      const t = tags.find((x) => x.id === id);
      if (t) chips.push({ key: "tagIds", label: `#${t.name}`, value: id });
    }
    return chips;
  }, [draft, tree, categories, subcategories, documentTypes, areas, authors, tags]);

  const removeChip = (chip: { key: keyof Draft; value?: string }) => {
    if (chip.key === "tagIds") change({ tagIds: draft.tagIds.filter((t) => t !== chip.value) });
    else if (chip.key === "standardId") change({ standardId: "" });
    else if (chip.key === "categoryId") change({ categoryId: "" });
    else change({ [chip.key]: "" } as Partial<Draft>);
  };

  const fields = (immediate: boolean) => (
    <>
      <Field label="Norma">
        <Select
          value={draft.standardId}
          onChange={(e) => change({ standardId: e.target.value }, immediate)}
          placeholder="Todas"
          options={tree.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` }))}
        />
      </Field>
      <Field label="Categoría">
        <Select
          value={draft.categoryId}
          onChange={(e) => change({ categoryId: e.target.value }, immediate)}
          placeholder="Todas"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
      </Field>
      <Field label="Subcategoría">
        <Select
          value={draft.subcategoryId}
          onChange={(e) => change({ subcategoryId: e.target.value }, immediate)}
          placeholder="Todas"
          disabled={!draft.categoryId}
          options={subcategories.map((s) => ({ value: s.id, label: s.name }))}
        />
      </Field>
      <Field label="Tipo">
        <Select
          value={draft.documentTypeId}
          onChange={(e) => change({ documentTypeId: e.target.value }, immediate)}
          placeholder="Todos"
          options={documentTypes.map((t) => ({ value: t.id, label: t.name }))}
        />
      </Field>
      <Field label="Área">
        <Select
          value={draft.areaId}
          onChange={(e) => change({ areaId: e.target.value }, immediate)}
          placeholder="Todas"
          options={areas.map((a) => ({ value: a.id, label: a.name }))}
        />
      </Field>
      <Field label="Estado">
        <Select
          value={draft.status}
          onChange={(e) => change({ status: e.target.value }, immediate)}
          placeholder="Todos"
          options={DOCUMENT_STATUSES.map((s) => ({ value: s, label: DOCUMENT_STATUS_LABELS[s] }))}
        />
      </Field>
    </>
  );

  const moreFields = (immediate: boolean) => (
    <>
      <Field label="Versión">
        <Select
          value={draft.version}
          onChange={(e) => change({ version: e.target.value }, immediate)}
          placeholder="Todas"
          options={versions.map((v) => ({ value: v, label: `v${v}` }))}
        />
      </Field>
      <Field label="Modificado desde">
        <Input type="date" value={draft.dateFrom} max={draft.dateTo || undefined} onChange={(e) => change({ dateFrom: e.target.value }, immediate)} />
      </Field>
      <Field label="Modificado hasta">
        <Input type="date" value={draft.dateTo} min={draft.dateFrom || undefined} onChange={(e) => change({ dateTo: e.target.value }, immediate)} />
      </Field>
      <Field label="Autor">
        <Select
          value={draft.createdBy}
          onChange={(e) => change({ createdBy: e.target.value }, immediate)}
          placeholder="Cualquiera"
          options={authors.map((a) => ({ value: a.id, label: a.full_name || a.email }))}
        />
      </Field>
      <Field label="Etiquetas" className="sm:col-span-2 lg:col-span-4">
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
                  change(
                    { tagIds: selected ? draft.tagIds.filter((x) => x !== t.id) : [...draft.tagIds, t.id] },
                    immediate,
                  )
                }
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  selected ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg",
                )}
              >
                #{t.name}
              </button>
            );
          })}
        </div>
      </Field>
    </>
  );

  return (
    <div className="space-y-3">
      {/* Barra principal */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            type="search"
            value={draft.q}
            onChange={(e) => setDraft({ ...draft, q: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && commit(draft)}
            placeholder="Buscar por nombre, código, descripción, norma, etiqueta…"
            aria-label="Buscar documentos"
            className="pl-9"
          />
        </div>
        {/* Móvil: abre bottom sheet */}
        <Button variant="outline" className="md:hidden" onClick={() => setSheetOpen(true)} leftIcon={<Filter className="size-4" />}>
          Filtros
          {active > 0 ? <Badge tone="primary" size="sm">{active}</Badge> : null}
        </Button>
        {/* Escritorio: más filtros */}
        <Button
          variant={moreOpen ? "secondary" : "outline"}
          className="hidden md:inline-flex"
          onClick={() => setMoreOpen((v) => !v)}
          leftIcon={<SlidersHorizontal className="size-4" />}
          aria-expanded={moreOpen}
        >
          Más filtros
        </Button>
      </div>

      {/* Escritorio: filtros primarios */}
      <div className="hidden gap-3 md:grid md:grid-cols-3 lg:grid-cols-6">{fields(true)}</div>
      {moreOpen ? (
        <div className="hidden gap-3 rounded-xl border border-border bg-surface-2/50 p-4 md:grid md:grid-cols-2 lg:grid-cols-4 animate-fade-in">
          {moreFields(true)}
        </div>
      ) : null}

      {/* Chips activos */}
      {activeChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <button
              key={`${chip.key}-${chip.value ?? chip.label}`}
              type="button"
              onClick={() => removeChip(chip)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-fg hover:bg-surface-2"
              aria-label={`Quitar filtro ${chip.label}`}
            >
              {chip.label}
              <X className="size-3 text-fg-subtle" />
            </button>
          ))}
          <button type="button" onClick={reset} className="text-xs font-medium text-primary hover:underline">
            Limpiar todo
          </button>
        </div>
      ) : null}

      {/* Móvil: bottom sheet */}
      <Dialog
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filtrar documentos"
        description="Combina varios criterios para acotar el repositorio."
        footer={
          <>
            <Button variant="ghost" onClick={reset}>
              Limpiar
            </Button>
            <Button
              onClick={() => {
                commit(draft);
                setSheetOpen(false);
              }}
            >
              Aplicar filtros
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {fields(false)}
          {moreFields(false)}
        </div>
      </Dialog>
    </div>
  );
}
