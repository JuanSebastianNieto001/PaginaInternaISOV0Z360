import "server-only";

import { STORAGE_BUCKET } from "@/lib/env";
import type { TypedSupabaseClient } from "@/lib/supabase/server";

/**
 * Genera una Signed URL temporal. Requiere que el usuario supere la política
 * de SELECT sobre storage.objects (documents.read).
 */
export async function createSignedFileUrl(
  supabase: TypedSupabaseClient,
  path: string,
  options: { expiresIn?: number; downloadAs?: string } = {},
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, options.expiresIn ?? 60 * 10, {
      download: options.downloadAs ?? undefined,
    });
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Elimina objetos del bucket. Ignora errores individuales (best effort). */
export async function removeFiles(supabase: TypedSupabaseClient, paths: string[]): Promise<void> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return;
  await supabase.storage.from(STORAGE_BUCKET).remove(unique);
}

/** Comprueba que un objeto existe en el bucket (tras la subida del cliente). */
export async function fileExists(supabase: TypedSupabaseClient, path: string): Promise<boolean> {
  const idx = path.lastIndexOf("/");
  const folder = idx === -1 ? "" : path.slice(0, idx);
  const name = idx === -1 ? path : path.slice(idx + 1);
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(folder, { search: name, limit: 1 });
  if (error) return false;
  return (data ?? []).some((o) => o.name === name);
}
