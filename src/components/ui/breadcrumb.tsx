import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="flex items-center gap-1 text-sm text-fg-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              <li className="flex items-center">
                {item.href && !last ? (
                  <Link href={item.href} className="rounded px-1 py-0.5 transition-colors hover:bg-surface-2 hover:text-fg">
                    {item.label}
                  </Link>
                ) : (
                  <span className={last ? "px-1 font-medium text-fg" : "px-1"} aria-current={last ? "page" : undefined}>
                    {item.label}
                  </span>
                )}
              </li>
              {!last ? (
                <li aria-hidden>
                  <ChevronRight className="size-3.5 text-fg-subtle" />
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
