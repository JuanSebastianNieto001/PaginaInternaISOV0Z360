"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { formatNumber } from "@/lib/utils/format";

import { Button } from "./button";

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  /** Nombre del parámetro de página en la URL. */
  param?: string;
  itemLabel?: string;
}

export function Pagination({ page, totalPages, total, pageSize, param = "page", itemLabel = "resultados" }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const go = (next: number) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (next <= 1) sp.delete(param);
    else sp.set(param, String(next));
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: true });
  };

  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-col items-center justify-between gap-3 text-sm text-fg-muted sm:flex-row"
    >
      <p>
        Mostrando <span className="font-medium text-fg">{formatNumber(from)}–{formatNumber(to)}</span> de{" "}
        <span className="font-medium text-fg">{formatNumber(total)}</span> {itemLabel}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Página anterior">
          <ChevronLeft className="size-4" />
        </Button>
        <span className="px-2 tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
          aria-label="Página siguiente"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
