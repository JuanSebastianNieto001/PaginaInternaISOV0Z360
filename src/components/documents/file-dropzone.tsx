"use client";

import { CheckCircle2, UploadCloud, X } from "lucide-react";
import { useId, useRef, useState, type DragEvent } from "react";

import { cn } from "@/lib/utils/cn";
import { fileKindLabel, getExtension } from "@/lib/utils/files";
import { formatBytes } from "@/lib/utils/format";

import { Button } from "../ui/button";
import { FileIcon } from "./file-icon";

export interface FileDropzoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  allowedExtensions: string[];
  maxSizeMb: number;
  /** 0–100 mientras sube; null cuando no hay subida activa. */
  progress: number | null;
  disabled?: boolean;
  error?: string | null;
}

export function validateFile(file: File, allowedExtensions: string[], maxSizeMb: number): string | null {
  const ext = getExtension(file.name);
  if (!ext || !allowedExtensions.includes(ext)) {
    return `Tipo de archivo no permitido (.${ext || "?"}). Permitidos: ${allowedExtensions.map((e) => `.${e}`).join(", ")}.`;
  }
  if (file.size > maxSizeMb * 1024 * 1024) {
    return `El archivo (${formatBytes(file.size)}) supera el máximo de ${maxSizeMb} MB.`;
  }
  if (file.size === 0) return "El archivo está vacío.";
  return null;
}

export function FileDropzone({ file, onFileChange, allowedExtensions, maxSizeMb, progress, disabled, error }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const inputId = useId();
  const accept = allowedExtensions.map((e) => `.${e}`).join(",");

  const pick = (f: File | undefined | null) => {
    if (!f) return;
    onFileChange(f);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    pick(e.dataTransfer.files?.[0]);
  };

  if (file) {
    const uploading = progress !== null && progress < 100;
    const done = progress === 100;
    return (
      <div className={cn("rounded-xl border bg-surface p-4", error ? "border-danger" : "border-border")}>
        <div className="flex items-start gap-3">
          <FileIcon extension={getExtension(file.name)} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{file.name}</p>
            <p className="text-xs text-fg-muted">
              {fileKindLabel(getExtension(file.name))} · {formatBytes(file.size)}
              {file.type ? ` · ${file.type}` : ""}
            </p>
            {progress !== null ? (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-fg-muted">
                  <span className="flex items-center gap-1">
                    {done ? <CheckCircle2 className="size-3.5 text-success" /> : null}
                    {done ? "Archivo subido" : uploading ? "Subiendo…" : "Preparando…"}
                  </span>
                  <span className="tabular-nums">{progress}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                  <div className={cn("h-full rounded-full transition-[width]", done ? "bg-success" : "bg-primary")} style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : null}
            {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
          </div>
          {!disabled && progress === null ? (
            <Button variant="ghost" size="icon-sm" onClick={() => onFileChange(null)} aria-label="Quitar archivo">
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
        dragging ? "border-primary bg-primary-soft/50" : "border-border bg-surface hover:border-border-strong hover:bg-surface-2/50",
        error && "border-danger",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span className="mb-3 flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <UploadCloud className="size-6" />
      </span>
      <p className="text-sm font-medium text-fg">
        Arrastra el archivo aquí o <span className="text-primary underline-offset-2 hover:underline">selecciónalo</span>
      </p>
      <p className="mt-1 text-xs text-fg-muted">
        Hasta {maxSizeMb} MB · {allowedExtensions.map((e) => e.toUpperCase()).join(", ")}
      </p>
      {error ? <p className="mt-3 text-xs text-danger">{error}</p> : null}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
