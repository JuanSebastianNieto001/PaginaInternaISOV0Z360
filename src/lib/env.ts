/**
 * Acceso centralizado y validado a variables de entorno.
 *
 * - Las variables NEXT_PUBLIC_* se exponen al navegador (solo anon key y URL).
 * - SUPABASE_SERVICE_ROLE_KEY es exclusivamente de servidor y solo la lee
 *   `lib/supabase/admin.ts` (marcado con `server-only`).
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Falta la variable de entorno ${name}. Revisa .env.local (ver .env.example).`,
    );
  }
  return value;
}

export const publicEnv = {
  get supabaseUrl(): string {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabaseAnonKey(): string {
    return required(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  },
  get siteUrl(): string {
    return (
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
    );
  },
};

export const STORAGE_BUCKET = "documents";
