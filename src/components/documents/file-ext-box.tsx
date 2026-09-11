import { cn } from "@/lib/utils/cn";

/**
 * Caja con la extensión del archivo (PDF, DOCX…) usada en las listas del
 * dashboard: borde fino, esquinas suaves y texto en azul de marca.
 */
export function FileExtBox({
  extension,
  size = "md",
  className,
}: {
  extension: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center border border-border-strong font-extrabold uppercase tracking-[.05em] text-brand-700",
        size === "sm" ? "size-8 rounded-lg text-[9px]" : "size-9 rounded-[10px] text-[9px]",
        className,
      )}
      aria-hidden
    >
      {extension.slice(0, 4)}
    </span>
  );
}
