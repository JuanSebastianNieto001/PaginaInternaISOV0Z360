/**
 * Construcción de consultas de búsqueda full-text para PostgreSQL.
 *
 * El vector `documents.search_vector` se genera con la configuración
 * `public.spanish_unaccent`, por lo que la consulta debe usar la misma.
 */

/** Nombre sin esquema: PostgREST lo resuelve vía search_path (public). */
export const SEARCH_CONFIG = "spanish_unaccent";

/**
 * Convierte texto libre en una tsquery con coincidencia por prefijo:
 *   "política seguridad" → "politica:* & seguridad:*"
 * Devuelve `null` si no hay términos útiles.
 */
export function buildPrefixTsQuery(input: string | null | undefined): string | null {
  if (!input) return null;
  const terms = input
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, 8);

  if (terms.length === 0) return null;
  return terms.map((t) => `${t}:*`).join(" & ");
}

/** Normaliza el texto de búsqueda para mostrarlo/serializarlo en la URL. */
export function normalizeSearchInput(input: string | null | undefined): string {
  return (input ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
}
