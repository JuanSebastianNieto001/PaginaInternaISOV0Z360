import type { PostgrestError } from "@supabase/supabase-js";

/** Error de dominio con mensaje seguro para mostrar al usuario. */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: "forbidden" | "not_found" | "validation" | "conflict" | "unknown" = "unknown",
  ) {
    super(message);
    this.name = "AppError";
  }
}

const PG_MESSAGES: Record<string, string> = {
  "23505": "Ya existe un registro con ese valor único (código, email o nombre).",
  "23503": "No se puede completar: el registro está referenciado por otros datos.",
  "23514": "Alguno de los valores no cumple las reglas de validación.",
  "42501": "No tienes permisos para realizar esta acción.",
  PGRST116: "No se encontró el registro solicitado.",
};

function isPostgrestError(e: unknown): e is PostgrestError {
  return typeof e === "object" && e !== null && "code" in e && "message" in e;
}

/**
 * Convierte cualquier error (Supabase, Postgres, JS) en un mensaje legible
 * sin filtrar detalles internos.
 */
export function toUserMessage(error: unknown, fallback = "Ha ocurrido un error inesperado."): string {
  if (error instanceof AppError) return error.message;

  if (isPostgrestError(error)) {
    if (error.code === "42501" || /row-level security/i.test(error.message)) {
      return PG_MESSAGES["42501"] ?? fallback;
    }
    // Excepciones lanzadas desde triggers PL/pgSQL con mensajes propios
    if (error.code === "P0001" || error.code === "42501") return error.message;
    return PG_MESSAGES[error.code] ?? fallback;
  }

  if (error instanceof Error) {
    if (/permission|not allowed|denied/i.test(error.message)) return PG_MESSAGES["42501"] ?? fallback;
    return process.env.NODE_ENV === "development" ? error.message : fallback;
  }

  return fallback;
}

export function isRlsDenied(error: unknown): boolean {
  return isPostgrestError(error) && (error.code === "42501" || /row-level security/i.test(error.message));
}
