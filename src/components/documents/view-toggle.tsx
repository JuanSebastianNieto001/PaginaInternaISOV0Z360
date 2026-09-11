"use client";

import { LayoutGrid, List } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils/cn";

export type ViewMode = "list" | "grid";

export function ViewToggle({ view }: { view: ViewMode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const set = (next: ViewMode) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (next === "list") sp.delete("view");
    else sp.set("view", next);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    try {
      localStorage.setItem("iso-dms-view", next);
    } catch {
      /* noop */
    }
  };

  const base = "inline-flex size-8 items-center justify-center rounded-md transition-colors";
  return (
    <div role="group" aria-label="Modo de vista" className="inline-flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5">
      <button
        type="button"
        onClick={() => set("list")}
        aria-pressed={view === "list"}
        aria-label="Vista de lista"
        className={cn(base, view === "list" ? "bg-surface-3 text-fg" : "text-fg-subtle hover:text-fg")}
      >
        <List className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => set("grid")}
        aria-pressed={view === "grid"}
        aria-label="Vista de cuadrícula"
        className={cn(base, view === "grid" ? "bg-surface-3 text-fg" : "text-fg-subtle hover:text-fg")}
      >
        <LayoutGrid className="size-4" />
      </button>
    </div>
  );
}
