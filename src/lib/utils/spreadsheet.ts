/**
 * Lectura de hojas de cálculo en el propio navegador.
 *
 * Un .xlsx es un ZIP de archivos XML. Aquí se abre ese ZIP con
 * `DecompressionStream`, que ya traen los navegadores, y se leen las hojas con
 * `DOMParser`. No hay dependencias externas y, sobre todo, el documento nunca
 * sale del navegador de quien lo está mirando: para un sistema que guarda
 * información clasificada como confidencial, mandarlo a un visor de terceros
 * no es una opción.
 *
 * Es una vista rápida, no un Excel: se ignoran fórmulas, formatos y gráficos.
 * El archivo de verdad siempre es el que se descarga.
 */

export interface SheetData {
  name: string;
  rows: string[][];
  /** Se recortaron filas o columnas para no bloquear la página. */
  truncated: boolean;
}

export const MAX_PREVIEW_ROWS = 500;
export const MAX_PREVIEW_COLS = 40;

/* ----------------------------------------------------------------------------
 * ZIP
 * ------------------------------------------------------------------------- */
interface ZipEntry {
  method: number;
  compressedSize: number;
  offset: number;
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;

export function canReadSpreadsheets(): boolean {
  return typeof DecompressionStream !== "undefined";
}

function findEndOfCentralDirectory(view: DataView): number {
  // El registro final mide 22 bytes más el comentario (máximo 65535).
  const lowest = Math.max(0, view.byteLength - 22 - 65535);
  for (let i = view.byteLength - 22; i >= lowest; i -= 1) {
    if (view.getUint32(i, true) === EOCD_SIGNATURE) return i;
  }
  return -1;
}

function readZipIndex(buffer: ArrayBuffer): Map<string, ZipEntry> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder("utf-8");
  const entries = new Map<string, ZipEntry>();

  const eocd = findEndOfCentralDirectory(view);
  if (eocd === -1) throw new Error("El archivo no parece un .xlsx válido.");

  const count = view.getUint16(eocd + 10, true);
  let pointer = view.getUint32(eocd + 16, true);

  for (let i = 0; i < count; i += 1) {
    if (pointer + 46 > view.byteLength || view.getUint32(pointer, true) !== CENTRAL_SIGNATURE) break;
    const method = view.getUint16(pointer + 10, true);
    const compressedSize = view.getUint32(pointer + 20, true);
    const nameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const offset = view.getUint32(pointer + 42, true);
    const name = decoder.decode(bytes.subarray(pointer + 46, pointer + 46 + nameLength));
    entries.set(name, { method, compressedSize, offset });
    pointer += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipFile(buffer: ArrayBuffer, index: Map<string, ZipEntry>, name: string): Promise<string | null> {
  const entry = index.get(name);
  if (!entry) return null;

  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  // La cabecera local repite nombre y extra con longitudes propias.
  const nameLength = view.getUint16(entry.offset + 26, true);
  const extraLength = view.getUint16(entry.offset + 28, true);
  const start = entry.offset + 30 + nameLength + extraLength;
  const raw = bytes.subarray(start, start + entry.compressedSize);

  const content = entry.method === 0 ? raw : await inflateRaw(raw);
  return new TextDecoder("utf-8").decode(content);
}

/* ----------------------------------------------------------------------------
 * Formatos de fecha
 * ------------------------------------------------------------------------- */
/** Formatos de fecha y hora que Excel trae de serie. */
const BUILT_IN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 30, 36, 45, 46, 47, 50, 57]);

/** Formatos de porcentaje que Excel trae de serie. */
const BUILT_IN_PERCENT_FORMATS = new Set([9, 10]);

/** Quita los literales entre comillas y los modificadores entre corchetes. */
function stripFormatLiterals(code: string): string {
  return code.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "");
}

function looksLikeDateFormat(code: string | undefined): boolean {
  if (!code) return false;
  return /[ymd]/i.test(stripFormatLiterals(code));
}

function looksLikePercentFormat(code: string | undefined): boolean {
  if (!code) return false;
  return stripFormatLiterals(code).includes("%");
}

/** Un 100 % se guarda como 1: sin esto la vista previa enseña números sueltos. */
function percentLabel(value: number): string {
  return `${Math.round(value * 10000) / 100}%`;
}

/** Convierte el número de serie de Excel a una fecha legible. */
function serialToDateLabel(serial: number): string {
  const ms = Math.round((serial - 25569) * 86400000);
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return String(serial);

  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  const hasTime = Math.abs(serial % 1) > 1e-9;
  if (!hasTime) return `${dd}/${mm}/${yyyy}`;

  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mi = String(date.getUTCMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

/* ----------------------------------------------------------------------------
 * XML de la hoja
 * ------------------------------------------------------------------------- */
function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, "application/xml");
}

function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function readSharedStrings(xml: string | null): string[] {
  if (!xml) return [];
  const doc = parseXml(xml);
  return Array.from(doc.getElementsByTagName("si")).map((si) =>
    Array.from(si.getElementsByTagName("t"))
      .map((t) => t.textContent ?? "")
      .join(""),
  );
}

export type CellFormat = "plain" | "date" | "percent";

/** Para cada estilo de celda, qué clase de formato tiene. */
function readCellFormats(xml: string | null): CellFormat[] {
  if (!xml) return [];
  const doc = parseXml(xml);

  const customFormats = new Map<number, string>();
  for (const fmt of Array.from(doc.getElementsByTagName("numFmt"))) {
    const id = Number(fmt.getAttribute("numFmtId"));
    const code = fmt.getAttribute("formatCode") ?? "";
    if (Number.isFinite(id)) customFormats.set(id, code);
  }

  const cellXfs = doc.getElementsByTagName("cellXfs")[0];
  if (!cellXfs) return [];

  return Array.from(cellXfs.getElementsByTagName("xf")).map<CellFormat>((xf) => {
    const id = Number(xf.getAttribute("numFmtId") ?? "0");
    if (!Number.isFinite(id)) return "plain";
    if (BUILT_IN_DATE_FORMATS.has(id)) return "date";
    if (BUILT_IN_PERCENT_FORMATS.has(id)) return "percent";
    const code = customFormats.get(id);
    if (looksLikeDateFormat(code)) return "date";
    if (looksLikePercentFormat(code)) return "percent";
    return "plain";
  });
}

function readSheet(xml: string, shared: string[], formats: CellFormat[]): { rows: string[][]; truncated: boolean } {
  const doc = parseXml(xml);
  const rows: string[][] = [];
  let truncated = false;

  const rowNodes = Array.from(doc.getElementsByTagName("row"));
  for (const rowNode of rowNodes) {
    if (rows.length >= MAX_PREVIEW_ROWS) {
      truncated = true;
      break;
    }

    const cells: string[] = [];
    for (const cell of Array.from(rowNode.getElementsByTagName("c"))) {
      const ref = cell.getAttribute("r");
      const index = ref ? columnIndex(ref) : cells.length;
      if (index >= MAX_PREVIEW_COLS) {
        truncated = true;
        continue;
      }

      const type = cell.getAttribute("t");
      let value = "";

      if (type === "inlineStr") {
        value = Array.from(cell.getElementsByTagName("t"))
          .map((t) => t.textContent ?? "")
          .join("");
      } else {
        const raw = cell.getElementsByTagName("v")[0]?.textContent ?? "";
        if (type === "s") {
          value = shared[Number(raw)] ?? "";
        } else if (type === "b") {
          value = raw === "1" ? "Sí" : "No";
        } else if (type === "e") {
          value = raw;
        } else if (raw !== "") {
          const format = formats[Number(cell.getAttribute("s") ?? "0")] ?? "plain";
          const numeric = Number(raw);
          if (format === "date" && Number.isFinite(numeric) && numeric > 0) value = serialToDateLabel(numeric);
          else if (format === "percent" && Number.isFinite(numeric)) value = percentLabel(numeric);
          else value = raw;
        }
      }

      while (cells.length < index) cells.push("");
      cells[index] = value.replace(/\s+/g, " ").trim();
    }

    // Filas completamente vacías no aportan nada a una vista rápida.
    if (cells.some((c) => c !== "")) rows.push(cells);
  }

  // Igualar el ancho de todas las filas para que la tabla no se descuadre.
  const width = rows.reduce((max, r) => Math.max(max, r.length), 0);
  for (const row of rows) while (row.length < width) row.push("");

  return { rows, truncated };
}

/* ----------------------------------------------------------------------------
 * Entrada pública
 * ------------------------------------------------------------------------- */
export async function readXlsx(buffer: ArrayBuffer): Promise<SheetData[]> {
  if (!canReadSpreadsheets()) {
    throw new Error("Tu navegador no puede abrir hojas de cálculo. Descarga el archivo para verlo.");
  }

  const index = readZipIndex(buffer);
  const [workbookXml, relsXml, sharedXml, stylesXml] = await Promise.all([
    readZipFile(buffer, index, "xl/workbook.xml"),
    readZipFile(buffer, index, "xl/_rels/workbook.xml.rels"),
    readZipFile(buffer, index, "xl/sharedStrings.xml"),
    readZipFile(buffer, index, "xl/styles.xml"),
  ]);
  if (!workbookXml) throw new Error("El archivo no contiene ninguna hoja legible.");

  const shared = readSharedStrings(sharedXml);
  const formats = readCellFormats(stylesXml);

  // r:id → ruta del XML de la hoja.
  const targets = new Map<string, string>();
  if (relsXml) {
    for (const rel of Array.from(parseXml(relsXml).getElementsByTagName("Relationship"))) {
      const id = rel.getAttribute("Id");
      const target = rel.getAttribute("Target");
      if (id && target) targets.set(id, target.startsWith("/") ? target.slice(1) : `xl/${target}`);
    }
  }

  const sheets: SheetData[] = [];
  const sheetNodes = Array.from(parseXml(workbookXml).getElementsByTagName("sheet"));
  for (const [position, node] of sheetNodes.entries()) {
    const name = node.getAttribute("name") ?? `Hoja ${position + 1}`;
    const relId = node.getAttribute("r:id") ?? node.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    const path = (relId && targets.get(relId)) || `xl/worksheets/sheet${position + 1}.xml`;
    const xml = await readZipFile(buffer, index, path);
    if (!xml) continue;
    const { rows, truncated } = readSheet(xml, shared, formats);
    sheets.push({ name, rows, truncated });
  }

  if (sheets.length === 0) throw new Error("El archivo no contiene ninguna hoja legible.");
  return sheets;
}

/** CSV según RFC 4180: comillas dobles, saltos de línea dentro de campo. */
export function readCsv(text: string, name = "Datos"): SheetData[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let truncated = false;

  const pushField = () => {
    if (row.length < MAX_PREVIEW_COLS) row.push(field.trim());
    else truncated = true;
    field = "";
  };
  const pushRow = () => {
    pushField();
    if (row.some((c) => c !== "")) {
      if (rows.length < MAX_PREVIEW_ROWS) rows.push(row);
      else truncated = true;
    }
    row = [];
  };

  const clean = text.replace(/^﻿/, "");
  // Si hay más punto y coma que comas, el archivo viene de un Excel en español.
  const separator = (clean.match(/;/g)?.length ?? 0) > (clean.match(/,/g)?.length ?? 0) ? ";" : ",";

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === separator) pushField();
    else if (ch === "\n") pushRow();
    else if (ch !== "\r") field += ch;
  }
  if (field !== "" || row.length > 0) pushRow();

  const width = rows.reduce((max, r) => Math.max(max, r.length), 0);
  for (const r of rows) while (r.length < width) r.push("");

  return [{ name, rows, truncated }];
}
