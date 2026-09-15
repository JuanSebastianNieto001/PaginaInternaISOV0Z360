"use client";

import { AlertCircle, Loader2, Table2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils/cn";
import { MAX_PREVIEW_ROWS, canReadSpreadsheets, readCsv, readXlsx, type SheetData } from "@/lib/utils/spreadsheet";

/** Por encima de este tamaño la vista previa se pide a mano. */
const AUTO_LOAD_LIMIT = 5 * 1024 * 1024;

interface SheetPreviewProps {
  signedUrl: string;
  fileName: string;
  extension: string;
  size: number;
}

export function SheetPreview({ signedUrl, fileName, extension, size }: SheetPreviewProps) {
  const [sheets, setSheets] = useState<SheetData[] | null>(null);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [asked, setAsked] = useState(size <= AUTO_LOAD_LIMIT);
  const started = useRef(false);

  // Mientras se ha pedido la vista y no hay ni hojas ni error, se está leyendo.
  const loading = asked && !sheets && !error;

  const load = useCallback(async () => {
    try {
      // Nada de estado antes del primer await: así el efecto no encadena renders.
      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error("No se pudo descargar el archivo para mostrarlo.");
      const isCsv = extension.toLowerCase() === "csv";
      if (!isCsv && !canReadSpreadsheets()) {
        throw new Error("Tu navegador no puede abrir hojas de cálculo. Descarga el archivo para verlo.");
      }
      const parsed = isCsv ? readCsv(await response.text(), fileName) : await readXlsx(await response.arrayBuffer());
      setSheets(parsed);
      setActive(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer la hoja de cálculo.");
    }
  }, [signedUrl, extension, fileName]);

  useEffect(() => {
    if (!asked || started.current) return;
    started.current = true;
    void load();
  }, [asked, load]);

  if (!asked) {
    return (
      <div className="flex flex-col items-center gap-2 border-t border-border px-4 py-6 text-center">
        <p className="text-xs text-fg-subtle">El archivo es grande. La vista previa se carga solo si la pides.</p>
        <button
          type="button"
          onClick={() => setAsked(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-strong px-3 text-[13px] font-medium text-fg transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
        >
          <Table2 className="size-4" /> Ver contenido
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <p className="flex items-center justify-center gap-2 border-t border-border px-4 py-8 text-sm text-fg-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Leyendo la hoja de cálculo…
      </p>
    );
  }

  if (error) {
    return (
      <p className="flex items-center justify-center gap-2 border-t border-border px-4 py-6 text-xs text-fg-subtle">
        <AlertCircle className="size-3.5 shrink-0" aria-hidden /> {error}
      </p>
    );
  }

  if (!sheets) return null;

  const sheet = sheets[active] ?? sheets[0];
  if (!sheet || sheet.rows.length === 0) {
    return (
      <p className="border-t border-border px-4 py-6 text-center text-xs text-fg-subtle">
        La hoja está vacía.
      </p>
    );
  }

  const [header, ...body] = sheet.rows;

  return (
    <div className="border-t border-border">
      {sheets.length > 1 ? (
        <div className="flex flex-wrap gap-1.5 border-b border-border px-3 py-2">
          {sheets.map((s, i) => (
            <button
              key={`${s.name}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              className={cn(
                "h-7 rounded-full border px-3 text-xs font-medium transition-colors",
                i === active
                  ? "border-primary bg-primary text-primary-fg"
                  : "border-border bg-surface text-fg-muted hover:border-primary hover:bg-primary-soft hover:text-primary",
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="max-h-[60vh] overflow-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr>
              {(header ?? []).map((cell, i) => (
                <th
                  key={i}
                  scope="col"
                  className="whitespace-nowrap border-b border-border-strong px-3 py-2 text-left font-semibold text-fg"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, r) => (
              <tr key={r} className="even:bg-surface-2/50">
                {row.map((cell, c) => (
                  <td key={c} className="max-w-[28rem] truncate border-b border-border px-3 py-1.5 text-fg-muted" title={cell}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="border-t border-border px-4 py-2 text-[11px] text-fg-subtle">
        Vista rápida sin formato ni fórmulas.{" "}
        {sheet.truncated ? `Se muestran las primeras ${MAX_PREVIEW_ROWS} filas. ` : ""}
        Descarga el archivo para verlo tal cual.
      </p>
    </div>
  );
}
