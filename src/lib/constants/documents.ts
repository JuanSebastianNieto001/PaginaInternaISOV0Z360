import type { DocumentSortField, DocumentStatus, InfoClassification } from "@/types";

/**
 * Estados del listado maestro del SGI, en el orden del ciclo de vida:
 * se redacta, se revisa, se manda a aprobar, queda vigente y al final se
 * retira. Los nombres son los que usa el propio listado maestro.
 */
export const DOCUMENT_STATUSES: DocumentStatus[] = [
  "draft",
  "review",
  "pending_approval",
  "approved",
  "obsolete",
];

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "Borrador",
  review: "En revisión",
  pending_approval: "En aprobación",
  approved: "Vigente",
  obsolete: "Obsoleto",
};

/** Plural, para los filtros del repositorio. */
export const DOCUMENT_STATUS_PLURALS: Record<DocumentStatus, string> = {
  draft: "Borradores",
  review: "En revisión",
  pending_approval: "En aprobación",
  approved: "Vigentes",
  obsolete: "Obsoletos",
};

export const DOCUMENT_STATUS_DESCRIPTIONS: Record<DocumentStatus, string> = {
  draft: "Documento en elaboración. No es de uso oficial.",
  review: "En revisión técnica antes de mandarlo a aprobar.",
  pending_approval: "Revisado y a la espera de la firma de quien lo aprueba.",
  approved: "Documento vigente y de uso oficial. Es el que se enseña en auditoría.",
  obsolete: "Documento retirado. Se conserva por trazabilidad.",
};

/**
 * Clasificación de la información (control de ISO 27001). Sale de la hoja
 * "Listas de Control" del listado maestro.
 */
export const INFO_CLASSIFICATIONS: InfoClassification[] = [
  "public",
  "internal",
  "confidential",
  "restricted",
];

export const INFO_CLASSIFICATION_LABELS: Record<InfoClassification, string> = {
  public: "Pública",
  internal: "Uso interno",
  confidential: "Confidencial",
  restricted: "Restringida / Secreta",
};

export const INFO_CLASSIFICATION_DESCRIPTIONS: Record<InfoClassification, string> = {
  public: "Puede divulgarse fuera de la empresa.",
  internal: "Circula dentro de la empresa. Es el valor por defecto.",
  confidential: "Solo para quien lo necesita por su trabajo.",
  restricted: "Acceso muy limitado y con autorización expresa.",
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
