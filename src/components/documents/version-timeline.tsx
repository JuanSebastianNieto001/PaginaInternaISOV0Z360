import { Download, GitCommitHorizontal } from "lucide-react";

import { formatBytes, formatDateTime } from "@/lib/utils/format";
import type { DocumentVersionItem } from "@/types";

import { Avatar } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { buttonClasses } from "../ui/button";
import { EmptyState } from "../ui/states";
import { StatusBadge } from "./status-badge";

export function VersionTimeline({
  documentId,
  versions,
  currentVersion,
  canDownload,
}: {
  documentId: string;
  versions: DocumentVersionItem[];
  currentVersion: string;
  canDownload: boolean;
}) {
  if (versions.length === 0) {
    return <EmptyState compact title="Sin versiones registradas" description="Este documento todavía no tiene historial de versiones." />;
  }

  return (
    <ol className="relative space-y-0 border-l border-border pl-6">
      {versions.map((v, idx) => {
        const isCurrent = v.version === currentVersion;
        return (
          <li key={v.id} className="relative pb-6 last:pb-0">
            <span
              className={`absolute -left-[31px] top-1 flex size-5 items-center justify-center rounded-full border-2 ${
                isCurrent ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface text-fg-subtle"
              }`}
              aria-hidden
            >
              <GitCommitHorizontal className="size-3" />
            </span>
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold text-fg">v{v.version}</span>
                {isCurrent ? <Badge tone="primary" size="sm">Actual</Badge> : null}
                {idx === versions.length - 1 ? <Badge tone="outline" size="sm">Inicial</Badge> : null}
                <StatusBadge status={v.status} size="sm" />
                <span className="ml-auto text-xs text-fg-subtle">{formatDateTime(v.created_at)}</span>
              </div>
              {v.change_summary ? <p className="mt-2 text-sm text-fg">{v.change_summary}</p> : null}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-fg-muted">
                  <Avatar name={v.creator?.full_name} src={v.creator?.avatar_url} size="xs" />
                  <span>{v.creator?.full_name ?? "Usuario eliminado"}</span>
                  <span aria-hidden>·</span>
                  <span className="truncate">
                    {v.file_name} · {formatBytes(v.file_size)}
                  </span>
                </div>
                {canDownload ? (
                  <a
                    href={`/api/documents/${documentId}/download?version=${v.id}`}
                    className={buttonClasses({ variant: "ghost", size: "sm" })}
                  >
                    <Download className="size-3.5" /> Descargar
                  </a>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
