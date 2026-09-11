"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
  /** Contenedor del trigger; permite estilizar el botón. */
  triggerClassName?: string;
}

/** Menú desplegable ligero (sin dependencias) con cierre por click fuera / Escape. */
export function Dropdown({ trigger, children, align = "end", className, triggerClassName }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className={cn("inline-flex items-center rounded-md focus-visible:outline-2 focus-visible:outline-ring", triggerClassName)}
      >
        {trigger}
      </button>
      {open ? (
        <div
          id={id}
          role="menu"
          onClick={() => setOpen(false)}
          className={cn(
            "absolute top-full z-50 mt-1.5 min-w-48 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-pop animate-fade-in",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

const itemClasses =
  "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-fg transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none";

export function DropdownItem({
  children,
  onClick,
  href,
  destructive,
  disabled,
  icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  destructive?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const cls = cn(itemClasses, destructive && "text-danger hover:bg-danger-soft");
  if (href) {
    return (
      <Link href={href} role="menuitem" className={cls} aria-disabled={disabled}>
        {icon}
        {children}
      </Link>
    );
  }
  return (
    <button type="button" role="menuitem" className={cls} onClick={onClick} disabled={disabled}>
      {icon}
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div role="separator" className="my-1 h-px bg-border" />;
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return <div className="px-2.5 py-1.5 text-xs font-medium text-fg-subtle">{children}</div>;
}
