import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import { Breadcrumb, type BreadcrumbItem } from "./breadcrumb";

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
  children?: ReactNode;
}

export function PageHeader({ title, description, actions, breadcrumbs, className, children }: PageHeaderProps) {
  return (
    <header className={cn("mb-6 flex flex-col gap-4", className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? <Breadcrumb items={breadcrumbs} /> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-balance text-xl font-semibold tracking-tight text-fg sm:text-2xl">{title}</h1>
          {description ? <p className="mt-1 max-w-2xl text-sm text-fg-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div> : null}
      </div>
      {children}
    </header>
  );
}
