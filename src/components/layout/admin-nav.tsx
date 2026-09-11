"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { canAny } from "@/lib/auth/permissions";
import { ADMIN_NAV, isNavActive } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils/cn";
import type { CurrentUser } from "@/types";

export function AdminNav({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const items = ADMIN_NAV.filter((i) => canAny(user, i.anyPermission));

  return (
    <nav aria-label="Secciones de administración" className="-mx-4 mb-6 overflow-x-auto border-b border-border px-4 scrollbar-none sm:mx-0 sm:px-0">
      <ul className="flex min-w-max items-center gap-1">
        {items.map((item) => {
          const active = isNavActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-10 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors",
                  active ? "border-primary text-fg" : "border-transparent text-fg-muted hover:border-border-strong hover:text-fg",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
