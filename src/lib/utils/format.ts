import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";

/** Formatea bytes de forma legible (1.2 MB). */
export function formatBytes(bytes: number | null | undefined, decimals = 1): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : decimals)} ${sizes[i]}`;
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = typeof value === "string" ? parseISO(value) : value;
  return isValid(d) ? d : null;
}

/** 10 sep 2026 */
export function formatDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? format(d, "d MMM yyyy", { locale: es }) : "—";
}

/** 10 sep 2026, 14:32 */
export function formatDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? format(d, "d MMM yyyy, HH:mm", { locale: es }) : "—";
}

/** hace 3 días */
export function formatRelative(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return `hace ${formatDistanceToNowStrict(d, { locale: es })}`;
}

/** Formatea un número con separadores locales. */
export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat("es").format(value ?? 0);
}

/** Iniciales para avatares: "María Pérez" → "MP". */
export function initials(name: string | null | undefined, fallback = "?"): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || fallback;
}

/** Trunca texto con puntos suspensivos. */
export function truncate(text: string | null | undefined, max = 80): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
