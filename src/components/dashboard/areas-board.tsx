import { Building2 } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";
import type { Area } from "@/types";

export interface AreaCard {
  area: Area;
  total: number;
}

/**
 * Áreas responsables del dashboard. Cada tarjeta lleva al repositorio
 * filtrado por esa área.
 */
export function AreasBoard({ areas }: { areas: AreaCard[] }) {
  if (areas.length === 0) return null;

  return (
    <section aria-label="Áreas responsables" className="mb-8">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.1em] text-fg-muted">
          <Building2 className="size-4 text-primary" aria-hidden />
          Áreas responsables
        </h2>
        <Link href="/documents" className="text-[13px] text-brand-700 hover:underline dark:text-primary">
          Ver repositorio completo →
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-2.5 min-[700px]:grid-cols-3 min-[1100px]:grid-cols-4">
        {areas.map(({ area, total }) => (
          <li key={area.id}>
            <Link
              href={`/documents?area=${area.id}`}
              className={cn(
                "flex h-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3.5 py-3 shadow-card transition-colors",
                "hover:border-primary hover:bg-brand-100",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-fg">{area.name}</span>
                <span className="block text-[11px] text-fg-subtle">
                  {total === 1 ? "1 documento" : `${formatNumber(total)} documentos`}
                </span>
              </span>
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg text-[13px] font-extrabold tabular-nums",
                  total > 0 ? "bg-brand-900 text-white" : "bg-surface-3 text-fg-subtle",
                )}
                aria-hidden
              >
                {formatNumber(total)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
