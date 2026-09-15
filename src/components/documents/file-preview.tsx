import { Download, ExternalLink, FileQuestion, Lock } from "lucide-react";

import { fileKindLabel, getPreviewKind } from "@/lib/utils/files";
import { formatBytes } from "@/lib/utils/format";

import { FileIcon } from "./file-icon";
import { SheetPreview } from "./sheet-preview";

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

const ACTION_CLASSES =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-strong px-3 text-[13px] font-medium text-fg transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary";

/**
 * Barra de acciones común a todos los formatos. "Abrir en otra pestaña" usa la
 * misma URL temporal que la vista previa: en PDF, imágenes y texto el navegador
 * lo muestra a pantalla completa; en formatos que no sabe dibujar, como Excel o
 * Word, lo descarga, que es lo único que puede hacer.
 */
function Actions({
  documentId,
  signedUrl,
  canDownload,
}: {
  documentId: string;
  signedUrl: string;
  canDownload: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border-t border-border px-4 py-3">
      <a
        href={signedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={ACTION_CLASSES}
        title="Abre el archivo en una pestaña nueva. Si el navegador no sabe mostrar el formato, lo descargará."
      >
        <ExternalLink className="size-4" /> Abrir en otra pestaña
      </a>
      {canDownload ? (
        <a href={`/api/documents/${documentId}/download`} className={ACTION_CLASSES}>
          <Download className="size-4" /> Descargar archivo
        </a>
      ) : null}
    </div>
  );
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
        <Actions documentId={documentId} signedUrl={signedUrl} canDownload={canDownload} />
      </div>
    );
  }

  if (kind === "image") {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-center bg-surface-2 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- Signed URL temporal, no optimizable */}
          <img src={signedUrl} alt={fileName} className="max-h-[70vh] max-w-full rounded-md object-contain" />
        </div>
        <Actions documentId={documentId} signedUrl={signedUrl} canDownload={canDownload} />
      </div>
    );
  }

  if (kind === "sheet") {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <FileIcon extension={extension} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-fg">{fileName}</p>
            <p className="text-xs text-fg-muted">
              {fileKindLabel(extension)} · {formatBytes(size)}
            </p>
          </div>
        </div>
        <SheetPreview signedUrl={signedUrl} fileName={fileName} extension={extension} size={size} />
        <Actions documentId={documentId} signedUrl={signedUrl} canDownload={canDownload} />
      </div>
    );
  }

  if (kind === "text") {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <iframe src={signedUrl} title={`Vista previa de ${fileName}`} className="h-[60vh] w-full bg-surface" sandbox="" />
        <Actions documentId={documentId} signedUrl={signedUrl} canDownload={canDownload} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface">
      {info}
      <p className="flex items-center justify-center gap-1.5 px-4 pb-3 text-center text-xs text-fg-subtle">
        <FileQuestion className="size-3.5 shrink-0" /> El navegador no sabe mostrar este formato. Ábrelo en otra
        pestaña o descárgalo para verlo en tu equipo.
      </p>
      <Actions documentId={documentId} signedUrl={signedUrl} canDownload={canDownload} />
    </div>
  );
}
