import Link from "next/link";

import { describeAuditAction } from "@/lib/constants/audit";
import { auditEntityHref, auditEntityLabel } from "@/lib/utils/audit-meta";
import { cn } from "@/lib/utils/cn";
import { formatRelative, initials } from "@/lib/utils/format";
import type { AuditLogItem } from "@/types";

/** Lista compacta de actividad del dashboard: quién hizo qué y cuándo. */
export function ActivityList({ logs }: { logs: AuditLogItem[] }) {
  if (logs.length === 0) {
    return <p className="py-6 text-sm text-fg-subtle">Todavía no hay acciones registradas.</p>;
  }

  return (
    <ul>
      {logs.map((log, index) => {
        const label = auditEntityLabel(log);
        const href = auditEntityHref(log);
        const author = log.user?.full_name || log.user?.email || "Sistema";

        return (
          <li
            key={log.id}
            className={cn(
              "grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-3 py-3",
              index < logs.length - 1 && "border-b border-border",
            )}
          >
            <span
              className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-100 text-[10px] font-extrabold text-brand-800"
              aria-hidden
            >
              {initials(author)}
            </span>
            <p className="min-w-0 text-sm leading-[1.4] text-fg">
              <span className="font-semibold">{author}</span>{" "}
              <span className="text-fg-subtle">{describeAuditAction(log.action).label.toLowerCase()}</span>{" "}
              {label ? (
                href ? (
                  <Link href={href} className="font-semibold hover:text-primary hover:underline">
                    {label}
                  </Link>
                ) : (
                  <span className="font-semibold">{label}</span>
                )
              ) : null}
            </p>
            <time dateTime={log.created_at} className="whitespace-nowrap pt-0.5 text-[11px] text-fg-subtle">
              {formatRelative(log.created_at)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
