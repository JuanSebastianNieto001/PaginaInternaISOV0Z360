"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export type TypedSupabaseClient = SupabaseClient<Database>;

let browserClient: TypedSupabaseClient | undefined;

/**
 * Cliente de Supabase para componentes cliente.
 * Usa exclusivamente la anon key; la autorización real la aplica RLS.
 */
export function createClient(): TypedSupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      publicEnv.supabaseUrl,
      publicEnv.supabaseAnonKey,
    );
  }
  return browserClient;
}
