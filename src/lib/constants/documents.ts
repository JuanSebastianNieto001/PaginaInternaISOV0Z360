import type { DocumentSortField, DocumentStatus } from "@/types";

export const DOCUMENT_STATUSES: DocumentStatus[] = ["draft", "review", "approved", "obsolete"];

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "Borrador",
  review: "En revisión",
  approved: "Aprobado",
  obsolete: "Obsoleto",
};

export const DOCUMENT_STATUS_DESCRIPTIONS: Record<DocumentStatus, string> = {
  draft: "Documento en elaboración. No es de uso oficial.",
  review: "Pendiente de revisión y aprobación.",
  approved: "Documento vigente y de uso oficial.",
  obsolete: "Documento retirado. Se conserva por trazabilidad.",
};

export const DOCUMENT_SORT_FIELDS: { value: DocumentSortField; label: string }[] = [
  { value: "updated_at", label: "Última modificación" },
  { value: "created_at", label: "Fecha de creación" },
  { value: "name", label: "Nombre" },
  { value: "code", label: "Código" },
  { value: "status", label: "Estado" },
  { value: "version", label: "Versión" },
];

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50];
export const MAX_PAGE_SIZE = 100;

export const VERSION_REGEX = /^[0-9]+(\.[0-9]+){0,2}$/;

/** Sugiere la siguiente versión: 1.0 → 1.1, 2 → 2.1, 1.2.3 → 1.2.4 */
export function suggestNextVersion(current: string, kind: "minor" | "major" = "minor"): string {
  const parts = current.split(".").map((p) => Number.parseInt(p, 10) || 0);
  if (kind === "major") return `${(parts[0] ?? 0) + 1}.0`;
  if (parts.length === 1) return `${parts[0]}.1`;
  const last = parts.length - 1;
  parts[last] = (parts[last] ?? 0) + 1;
  return parts.join(".");
}

/** Compara versiones semánticas simples. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
