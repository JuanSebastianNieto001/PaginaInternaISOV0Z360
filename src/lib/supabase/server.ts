import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Se crea uno por petición; nunca se comparte entre peticiones.
 */
export async function createClient(): Promise<TypedSupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Llamado desde un Server Component: no se pueden escribir cookies.
          // El proxy (src/proxy.ts) se encarga de refrescar la sesión.
        }
      },
    },
  });
}
