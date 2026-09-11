import "server-only";

import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { AppError, toUserMessage } from "@/lib/utils/errors";
import type { ActionResult, CurrentUser, PermissionCode } from "@/types";

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = undefined>(error: string, fieldErrors?: Record<string, string[]>): ActionResult<T> {
  return { ok: false, error, fieldErrors };
}

/** Convierte un error de validación Zod en un ActionResult legible. */
export function zodFail<T = undefined>(error: z.ZodError): ActionResult<T> {
  const flat = z.flattenError(error);
  const fieldErrors: Record<string, string[]> = {};
  for (const [key, msgs] of Object.entries(flat.fieldErrors)) {
    if (Array.isArray(msgs) && msgs.length > 0) fieldErrors[key] = msgs as string[];
  }
  const firstField = Object.values(fieldErrors)[0]?.[0];
  return fail(firstField ?? flat.formErrors[0] ?? "Revisa los datos introducidos.", fieldErrors);
}

/**
 * Exige usuario autenticado, activo y con el permiso indicado.
 * Lanza AppError para que `runAction` lo convierta en un resultado de error.
 */
export async function authorize(permission?: PermissionCode): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("Tu sesión ha expirado. Inicia sesión de nuevo.", "forbidden");
  if (!user.isActive) throw new AppError("Tu cuenta está desactivada.", "forbidden");
  if (permission && !can(user, permission)) {
    throw new AppError("No tienes permisos para realizar esta acción.", "forbidden");
  }
  return user;
}

/** Envuelve una acción para devolver siempre un ActionResult sin filtrar internals. */
export async function runAction<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("[action]", error);
    return fail(toUserMessage(error));
  }
}
