import Link from "next/link";

import { describeAuditAction } from "@/lib/constants/audit";
import { auditEntityHref, auditEntityLabel, auditMetaValue } from "@/lib/utils/audit-meta";
import { cn } from "@/lib/utils/cn";
import { formatDateTime, formatRelative } from "@/lib/utils/format";
import type { AuditLogItem } from "@/types";

import { Avatar } from "../ui/avatar";
import { EmptyState } from "../ui/states";
import { Tooltip } from "../ui/tooltip";

const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-surface-2 text-fg-muted",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function ActivityTimeline({
  logs,
  compact = false,
  emptyTitle = "Sin actividad",
  emptyDescription = "Todavía no hay acciones registradas.",
}: {
  logs: AuditLogItem[];
  compact?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (logs.length === 0) {
    return <EmptyState compact title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ol className={cn("divide-y divide-border", compact ? "" : "rounded-xl border border-border bg-surface")}>
      {logs.map((log) => {
        const p = describeAuditAction(log.action);
        const Icon = p.icon;
        const label = auditEntityLabel(log);
        const href = auditEntityHref(log);
        const version = auditMetaValue(log.metadata, "version");
        const summary = auditMetaValue(log.metadata, "change_summary");

        return (
          <li key={log.id} className={cn("flex items-start gap-3", compact ? "py-3" : "px-4 py-3.5")}>
            <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", TONE_CLASSES[p.tone])} aria-hidden>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-fg">
                <span className="font-medium">{log.user?.full_name ?? "Sistema"}</span>{" "}
                <span className="text-fg-muted">{p.label.toLowerCase()}</span>{" "}
                {label ? (
                  href ? (
                    <Link href={href} className="font-medium text-primary hover:underline">
                      {label}
                    </Link>
                  ) : (
                    <span className="font-medium">{label}</span>
                  )
                ) : null}
                {version && log.action.startsWith("document.") ? (
                  <span className="ml-1 font-mono text-xs text-fg-subtle">v{version}</span>
                ) : null}
              </p>
              {summary ? <p className="mt-0.5 text-xs text-fg-muted">“{summary}”</p> : null}
              <p className="mt-0.5 flex items-center gap-2 text-xs text-fg-subtle">
                {log.user ? <Avatar name={log.user.full_name} src={log.user.avatar_url} size="xs" /> : null}
                <Tooltip content={formatDateTime(log.created_at)}>
                  <time dateTime={log.created_at}>{formatRelative(log.created_at)}</time>
                </Tooltip>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
