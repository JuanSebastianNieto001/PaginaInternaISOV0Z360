import { DOCUMENT_STATUS_LABELS } from "@/lib/constants/documents";
import { cn } from "@/lib/utils/cn";
import type { DocumentStatus } from "@/types";

/** Píldoras de estado del sistema de diseño (azul marino → aprobado). */
const STYLES: Record<DocumentStatus, string> = {
  approved: "bg-brand-900 text-white border-transparent",
  pending_approval: "bg-brand-400 text-brand-900 border-transparent",
  review: "bg-brand-100 text-brand-800 border-transparent",
  draft: "bg-surface-3 text-[#33405a] border-transparent dark:text-fg",
  obsolete: "bg-transparent text-fg-subtle border-border-strong",
};

export function StatusBadge({
  status,
  size = "md",
  className,
}: {
  status: DocumentStatus;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border font-semibold leading-none",
        size === "sm" ? "px-2 py-[3px] text-[10px]" : "px-2.5 py-[4px] text-[11px]",
        STYLES[status],
        className,
      )}
    >
      {DOCUMENT_STATUS_LABELS[status]}
    </span>
  );
}
