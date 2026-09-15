import { DEFAULT_PAGE_SIZE, DOCUMENT_STATUSES, INFO_CLASSIFICATIONS, MAX_PAGE_SIZE } from "@/lib/constants/documents";
import type { DocumentQuery, DocumentSortField, DocumentStatus, InfoClassification, SortDirection } from "@/types";

import { normalizeSearchInput } from "./search";

export type SearchParams = Record<string, string | string[] | undefined>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SORT_FIELDS: DocumentSortField[] = ["name", "code", "status", "version", "created_at", "updated_at"];

export function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function asUuid(value: string | string[] | undefined): string | undefined {
  const v = first(value);
  return v && UUID_RE.test(v) ? v : undefined;
}

export function asUuidList(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : value ? value.split(",") : [];
  return raw.map((v) => v.trim()).filter((v) => UUID_RE.test(v));
}

export function asInt(value: string | string[] | undefined, fallback: number, min = 1, max = Number.MAX_SAFE_INTEGER): number {
  const v = Number.parseInt(first(value) ?? "", 10);
  if (Number.isNaN(v)) return fallback;
  return Math.min(Math.max(v, min), max);
}

export function asStatus(value: string | string[] | undefined): DocumentStatus | undefined {
  const v = first(value);
  return v && (DOCUMENT_STATUSES as string[]).includes(v) ? (v as DocumentStatus) : undefined;
}

export function asClassification(value: string | string[] | undefined): InfoClassification | undefined {
  const v = first(value);
  return v && (INFO_CLASSIFICATIONS as string[]).includes(v) ? (v as InfoClassification) : undefined;
}

export function asDate(value: string | string[] | undefined): string | undefined {
  const v = first(value);
  return v && DATE_RE.test(v) ? v : undefined;
}

/** Interpreta los searchParams de /documents en una consulta tipada y segura. */
export function parseDocumentQuery(params: SearchParams): DocumentQuery {
  const sortRaw = first(params.sort);
  const sort: DocumentSortField = SORT_FIELDS.includes(sortRaw as DocumentSortField)
    ? (sortRaw as DocumentSortField)
    : "updated_at";
  const direction: SortDirection = first(params.dir) === "asc" ? "asc" : "desc";
  const version = first(params.version);

  return {
    q: normalizeSearchInput(first(params.q)) || undefined,
    standardId: asUuid(params.standard),
    categoryId: asUuid(params.category),
    subcategoryId: asUuid(params.subcategory),
    documentTypeId: asUuid(params.type),
    areaId: asUuid(params.area),
    processId: asUuid(params.process),
    classification: asClassification(params.class),
    status: asStatus(params.status),
    version: version && /^[0-9]+(\.[0-9]+){0,2}$/.test(version) ? version : undefined,
    dateFrom: asDate(params.from),
    dateTo: asDate(params.to),
    createdBy: asUuid(params.user),
    tagIds: asUuidList(params.tags),
    page: asInt(params.page, 1, 1, 100_000),
    pageSize: asInt(params.size, DEFAULT_PAGE_SIZE, 5, MAX_PAGE_SIZE),
    sort,
    direction,
  };
}

/** Construye una query string a partir de un objeto, omitiendo vacíos. */
export function buildQueryString(values: Record<string, string | number | string[] | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length > 0) sp.set(key, value.join(","));
      continue;
    }
    sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
