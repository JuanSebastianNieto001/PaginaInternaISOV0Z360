import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export function Spinner({ className, label = "Cargando…" }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-fg-muted">
      <Loader2 className={cn("size-4 animate-spin", className)} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function PageSpinner({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status">
      <div className="flex flex-col items-center gap-3 text-fg-muted">
        <Loader2 className="size-6 animate-spin" aria-hidden />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}
