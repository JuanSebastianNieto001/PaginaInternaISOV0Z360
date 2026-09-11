import Link from "next/link";

import { formatBytes, formatRelative } from "@/lib/utils/format";
import type { DocumentListItem } from "@/types";

import { Badge } from "../ui/badge";
import { FileIcon } from "./file-icon";
import { StatusBadge } from "./status-badge";

export function DocumentCard({ document: doc }: { document: DocumentListItem }) {
  return (
    <Link
      href={`/documents/${doc.id}`}
      className="group flex h-full flex-col rounded-xl border border-border bg-surface p-4 shadow-card transition-all hover:-translate-y-px hover:border-border-strong hover:shadow-pop focus-visible:outline-2 focus-visible:outline-ring"
    >
      <div className="flex items-start gap-3">
        <FileIcon extension={doc.file_extension} />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">{doc.code}</p>
          <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-fg group-hover:text-primary">
            {doc.name}
          </h3>
        </div>
      </div>

      {doc.description ? (
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-fg-muted">{doc.description}</p>
      ) : null}

      <div className="mt-auto pt-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {doc.standard ? (
            <Badge color={doc.standard.color} size="sm">
              {doc.standard.code}
            </Badge>
          ) : null}
          {doc.category ? (
            <Badge tone="outline" size="sm" className="max-w-40 truncate">
              {doc.category.name}
            </Badge>
          ) : null}
          {doc.document_type ? (
            <Badge tone="outline" size="sm">
              {doc.document_type.name}
            </Badge>
          ) : null}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-fg-subtle">
          <div className="flex items-center gap-2">
            <StatusBadge status={doc.status} size="sm" />
            <span className="font-mono">v{doc.version}</span>
          </div>
          <span className="truncate" title={`${formatBytes(doc.file_size)} · ${doc.file_extension.toUpperCase()}`}>
            {formatRelative(doc.updated_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}
