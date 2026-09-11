import { ArrowDown, ArrowUp, ArrowUpDown, Download, Eye } from "lucide-react";
import Link from "next/link";

import { buildQueryString } from "@/lib/utils/url";
import { formatDateTime, formatRelative } from "@/lib/utils/format";
import type { DocumentListItem, DocumentQuery, DocumentSortField } from "@/types";

import { Badge } from "../ui/badge";
import { buttonClasses } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Tooltip } from "../ui/tooltip";
import { FileIcon } from "./file-icon";
import { StatusBadge } from "./status-badge";

interface DocumentTableProps {
  documents: DocumentListItem[];
  query?: DocumentQuery;
  canDownload: boolean;
  /** Ruta base para construir los enlaces de ordenación. */
  basePath?: string;
}

function sortHref(basePath: string, query: DocumentQuery, field: DocumentSortField): string {
  const nextDir = query.sort === field && query.direction === "desc" ? "asc" : "desc";
  return `${basePath}${buildQueryString({
    q: query.q,
    standard: query.standardId,
    category: query.categoryId,
    subcategory: query.subcategoryId,
    type: query.documentTypeId,
    status: query.status,
    version: query.version,
    from: query.dateFrom,
    to: query.dateTo,
    user: query.createdBy,
    tags: query.tagIds,
    size: query.pageSize !== 20 ? query.pageSize : undefined,
    sort: field,
    dir: nextDir,
    view: "list",
  })}`;
}

function SortableHead({
  label,
  field,
  query,
  basePath,
  className,
}: {
  label: string;
  field: DocumentSortField;
  query?: DocumentQuery;
  basePath: string;
  className?: string;
}) {
  if (!query) return <TableHead className={className}>{label}</TableHead>;
  const active = query.sort === field;
  const Icon = active ? (query.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead className={className}>
      <Link
        href={sortHref(basePath, query, field)}
        className={`inline-flex items-center gap-1 rounded hover:text-fg ${active ? "text-fg" : ""}`}
        aria-sort={active ? (query.direction === "asc" ? "ascending" : "descending") : "none"}
      >
        {label}
        <Icon className="size-3.5" />
      </Link>
    </TableHead>
  );
}

export function DocumentTable({ documents, query, canDownload, basePath = "/documents" }: DocumentTableProps) {
  return (
    <>
      {/* Tabla (≥ md) */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-surface md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableHead label="Documento" field="name" query={query} basePath={basePath} className="min-w-72" />
              <TableHead>Norma</TableHead>
              <TableHead>Categoría</TableHead>
              <SortableHead label="Estado" field="status" query={query} basePath={basePath} />
              <SortableHead label="Versión" field="version" query={query} basePath={basePath} />
              <SortableHead label="Modificado" field="updated_at" query={query} basePath={basePath} />
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <FileIcon extension={doc.file_extension} size="sm" />
                    <div className="min-w-0">
                      <Link href={`/documents/${doc.id}`} className="block truncate font-medium text-fg hover:text-primary">
                        {doc.name}
                      </Link>
                      <p className="truncate font-mono text-[11px] text-fg-subtle">
                        {doc.code}
                        {doc.document_type ? ` · ${doc.document_type.name}` : ""}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {doc.standard ? (
                    <Badge color={doc.standard.color} size="sm">
                      {doc.standard.code}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="max-w-48">
                  <p className="truncate text-fg">{doc.category?.name ?? "—"}</p>
                  {doc.subcategory ? <p className="truncate text-xs text-fg-subtle">{doc.subcategory.name}</p> : null}
                </TableCell>
                <TableCell>
                  <StatusBadge status={doc.status} size="sm" />
                </TableCell>
                <TableCell className="font-mono text-xs">v{doc.version}</TableCell>
                <TableCell className="whitespace-nowrap text-fg-muted">
                  <Tooltip content={formatDateTime(doc.updated_at)}>
                    <span>{formatRelative(doc.updated_at)}</span>
                  </Tooltip>
                  {doc.updater ? <p className="truncate text-xs text-fg-subtle">{doc.updater.full_name}</p> : null}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Tooltip content="Ver detalle">
                      <Link href={`/documents/${doc.id}`} className={buttonClasses({ variant: "ghost", size: "icon-sm" })} aria-label="Ver detalle">
                        <Eye className="size-4" />
                      </Link>
                    </Tooltip>
                    {canDownload ? (
                      <Tooltip content="Descargar">
                        <a
                          href={`/api/documents/${doc.id}/download`}
                          className={buttonClasses({ variant: "ghost", size: "icon-sm" })}
                          aria-label="Descargar"
                        >
                          <Download className="size-4" />
                        </a>
                      </Tooltip>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Cards (< md) */}
      <ul className="space-y-2 md:hidden">
        {documents.map((doc) => (
          <li key={doc.id}>
            <Link href={`/documents/${doc.id}`} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5">
              <FileIcon extension={doc.file_extension} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{doc.name}</p>
                <p className="truncate font-mono text-[11px] text-fg-subtle">{doc.code}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {doc.standard ? (
                    <Badge color={doc.standard.color} size="sm">
                      {doc.standard.code}
                    </Badge>
                  ) : null}
                  <StatusBadge status={doc.status} size="sm" />
                  <span className="font-mono text-[11px] text-fg-subtle">v{doc.version}</span>
                  <span className="ml-auto text-[11px] text-fg-subtle">{formatRelative(doc.updated_at)}</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
