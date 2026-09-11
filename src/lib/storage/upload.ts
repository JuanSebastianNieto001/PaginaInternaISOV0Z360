"use client";

import { STORAGE_BUCKET, publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

export interface UploadOptions {
  file: File;
  path: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export class UploadError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

/**
 * Sube un archivo directamente desde el navegador al bucket privado con
 * progreso real (XHR). Usa el JWT de la sesión del usuario: las políticas RLS
 * de Storage deciden si la subida está permitida.
 */
export async function uploadFileWithProgress({ file, path, onProgress, signal }: UploadOptions): Promise<void> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new UploadError("Tu sesión ha expirado. Vuelve a iniciar sesión.", 401);
  }

  const url = `${publicEnv.supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("apikey", publicEnv.supabaseAnonKey);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "3600");
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      let message = "No se pudo subir el archivo.";
      try {
        const body = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        if (xhr.status === 403) message = "No tienes permisos para subir archivos.";
        else if (xhr.status === 413) message = "El archivo supera el tamaño máximo permitido.";
        else if (body.message) message = body.message;
      } catch {
        /* respuesta no JSON */
      }
      reject(new UploadError(message, xhr.status));
    };

    xhr.onerror = () => reject(new UploadError("Error de red durante la subida."));
    xhr.onabort = () => reject(new UploadError("Subida cancelada."));

    if (signal) {
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(file);
  });
}

/** Elimina un objeto subido (limpieza si falla el guardado de metadatos). */
export async function removeUploadedFile(path: string): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(STORAGE_BUCKET).remove([path]);
}
