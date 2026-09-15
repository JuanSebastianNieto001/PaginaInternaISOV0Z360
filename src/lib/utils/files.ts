/**
 * Utilidades relacionadas con archivos: extensiones, MIME, previsualización y
 * rutas de Storage.
 */

export const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  txt: "text/plain",
  csv: "text/csv",
  md: "text/markdown",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  zip: "application/zip",
};

export function getExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  if (idx === -1 || idx === fileName.length - 1) return "";
  return fileName.slice(idx + 1).toLowerCase();
}

export function guessMimeType(fileName: string, fallback = "application/octet-stream"): string {
  return MIME_BY_EXTENSION[getExtension(fileName)] ?? fallback;
}

export type PreviewKind = "pdf" | "image" | "sheet" | "text" | "none";

/** Formatos de hoja de cálculo que la app sabe leer en el navegador. */
const SHEET_EXTENSIONS = ["xlsx", "csv"];

export function getPreviewKind(extension: string, mimeType?: string | null): PreviewKind {
  const ext = extension.toLowerCase();
  if (ext === "pdf" || mimeType === "application/pdf") return "pdf";
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext) || mimeType?.startsWith("image/")) {
    return "image";
  }
  // Antes que el texto: un CSV se lee mucho mejor como tabla que como texto plano.
  if (SHEET_EXTENSIONS.includes(ext)) return "sheet";
  if (["txt", "md"].includes(ext) || mimeType?.startsWith("text/")) return "text";
  return "none";
}

/** Etiqueta amigable del tipo de archivo. */
export function fileKindLabel(extension: string): string {
  const ext = extension.toLowerCase();
  const map: Record<string, string> = {
    pdf: "PDF",
    doc: "Word",
    docx: "Word",
    xls: "Excel",
    xlsx: "Excel",
    ppt: "PowerPoint",
    pptx: "PowerPoint",
    odt: "OpenDocument",
    ods: "OpenDocument",
    txt: "Texto",
    csv: "CSV",
    md: "Markdown",
    png: "Imagen",
    jpg: "Imagen",
    jpeg: "Imagen",
    webp: "Imagen",
    gif: "Imagen",
    svg: "Imagen",
    zip: "ZIP",
  };
  return map[ext] ?? (ext.toUpperCase() || "Archivo");
}

/**
 * Ruta canónica dentro del bucket `documents`.
 * {document_id}/{version}/{uuid}.{ext}
 */
export function buildStoragePath(documentId: string, version: string, extension: string): string {
  const safeVersion = version.replace(/[^0-9.]/g, "") || "1.0";
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
  return `${documentId}/v${safeVersion}/${id}${extension ? `.${extension}` : ""}`;
}

/** Sanitiza un nombre de archivo para cabeceras Content-Disposition. */
export function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|\r\n]+/g, "_").slice(0, 200);
}
