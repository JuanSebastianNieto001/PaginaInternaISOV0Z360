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
      className={cn("relative w-80 max-w-full", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        router.push(q ? `/documents?q=${encodeURIComponent(q)}` : "/documents");
        ref.current?.blur();
      }}
    >
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[15px] -translate-y-1/2 text-fg-subtle" />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar documentos, códigos…"
        aria-label="Buscar documentos"
        className={cn(
          "h-[38px] w-full rounded-full border border-border-strong bg-surface-2 pl-10 pr-14 text-[13px] text-fg transition-colors",
          "placeholder:text-fg-subtle hover:border-primary focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring",
        )}
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-border-strong px-1.5 py-px text-[11px] text-fg-subtle sm:block">
        ⌘K
      </kbd>
    </form>
  );
}
