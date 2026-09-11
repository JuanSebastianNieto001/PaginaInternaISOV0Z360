import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Cliente con `service_role`. SOLO servidor (Server Actions / Route Handlers).
 *
 * Se utiliza únicamente para operaciones que la API pública no permite, como
 * crear usuarios en Supabase Auth. Toda llamada debe ir precedida de una
 * comprobación explícita de permisos del usuario que la solicita.
 *
 * Devuelve `null` si la clave no está configurada, para que la UI pueda
 * informar al administrador en lugar de fallar.
 */
export function createAdminClient(): SupabaseClient<Database> | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;

  return createSupabaseClient<Database>(publicEnv.supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function isAdminClientConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
