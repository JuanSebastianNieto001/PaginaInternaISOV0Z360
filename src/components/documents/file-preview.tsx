import { Download, FileQuestion, Lock } from "lucide-react";

import { fileKindLabel, getPreviewKind } from "@/lib/utils/files";
import { formatBytes } from "@/lib/utils/format";

import { buttonClasses } from "../ui/button";
import { FileIcon } from "./file-icon";

interface FilePreviewProps {
  documentId: string;
  fileName: string;
  extension: string;
  mimeType: string | null;
  size: number;
  /** Signed URL (solo lectura, corta duración). `null` si no se pudo generar. */
  signedUrl: string | null;
  canDownload: boolean;
}

export function FilePreview({ documentId, fileName, extension, mimeType, size, signedUrl, canDownload }: FilePreviewProps) {
  const kind = getPreviewKind(extension, mimeType);

  const info = (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <FileIcon extension={extension} size="lg" />
      <div>
        <p className="text-sm font-medium text-fg">{fileName}</p>
        <p className="mt-0.5 text-xs text-fg-muted">
          {fileKindLabel(extension)} · {formatBytes(size)}
        </p>
      </div>
    </div>
  );

  if (!signedUrl) {
    return (
      <div className="rounded-xl border border-border bg-surface">
        {info}
        <p className="flex items-center justify-center gap-1.5 border-t border-border px-4 py-3 text-xs text-fg-subtle">
          <Lock className="size-3.5" /> No se pudo generar la vista previa del archivo.
        </p>
      </div>
    );
  }

  if (kind === "pdf") {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <iframe
          src={`${signedUrl}#toolbar=0&navpanes=0`}
          title={`Vista previa de ${fileName}`}
          className="h-[70vh] w-full bg-surface-2"
        />
      </div>
    );
  }

  if (kind === "image") {
    return (
      <div className="flex items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-2 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- Signed URL temporal, no optimizable */}
        <img src={signedUrl} alt={fileName} className="max-h-[70vh] max-w-full rounded-md object-contain" />
      </div>
    );
  }

  if (kind === "text") {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <iframe src={signedUrl} title={`Vista previa de ${fileName}`} className="h-[60vh] w-full bg-surface" sandbox="" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface">
      {info}
      <div className="flex flex-col items-center gap-2 border-t border-border px-4 py-4 text-center">
        <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
          <FileQuestion className="size-3.5" /> Este formato no admite vista previa en el navegador.
        </p>
        {canDownload ? (
          <a href={`/api/documents/${documentId}/download`} className={buttonClasses({ variant: "outline", size: "sm" })}>
            <Download className="size-4" /> Descargar archivo
          </a>
        ) : null}
      </div>
    </div>
  );
}
