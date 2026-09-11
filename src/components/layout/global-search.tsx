"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils/cn";

/** Buscador global: envía a /documents?q=… . Atajo: "/" o Ctrl/Cmd+K. */
export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        router.push(q ? `/documents?q=${encodeURIComponent(q)}` : "/documents");
        ref.current?.blur();
      }}
    >
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar documentos…"
        aria-label="Buscar documentos"
        className={cn(
          "h-9 w-full rounded-md border border-border bg-surface-2/60 pl-9 pr-12 text-sm text-fg transition-colors",
          "placeholder:text-fg-subtle hover:border-border-strong focus:bg-surface focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring",
        )}
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-surface px-1.5 py-px font-mono text-[10px] text-fg-subtle sm:block">
        /
      </kbd>
    </form>
  );
}
