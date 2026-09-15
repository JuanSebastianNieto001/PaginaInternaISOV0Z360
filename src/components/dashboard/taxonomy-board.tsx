import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";

export interface TaxonomyBoardCard {
  id: string;
  name: string;
  total: number;
}

/**
 * Rejilla de accesos rápidos del dashboard (procesos, áreas). Cada tarjeta
 * lleva al repositorio ya filtrado por ese valor, que es el camino corto el
 * día de la auditoría.
 */
export function TaxonomyBoard({
  title,
  icon: Icon,
  param,
  items,
  linkLabel = "Ver repositorio completo →",
}: {
  title: string;
  icon: LucideIcon;
  /** Parámetro de la URL del repositorio: "process" o "area". */
  param: "process" | "area";
  items: TaxonomyBoardCard[];
  linkLabel?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section aria-label={title} className="mb-8">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.1em] text-fg-muted">
          <Icon className="size-4 text-primary" aria-hidden />
          {title}
        </h2>
        <Link href="/documents" className="text-[13px] text-brand-700 hover:underline dark:text-primary">
          {linkLabel}
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-2.5 min-[700px]:grid-cols-3 min-[1100px]:grid-cols-4">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/documents?${param}=${item.id}`}
              className={cn(
                "flex h-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3.5 py-3 shadow-card transition-colors",
                "hover:border-primary hover:bg-primary-soft",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-fg">{item.name}</span>
                <span className="block text-[11px] text-fg-subtle">
                  {item.total === 1 ? "1 documento" : `${formatNumber(item.total)} documentos`}
                </span>
              </span>
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg text-[13px] font-extrabold tabular-nums",
                  item.total > 0 ? "bg-brand-900 text-white" : "bg-surface-3 text-fg-subtle",
                )}
                aria-hidden
              >
                {formatNumber(item.total)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
