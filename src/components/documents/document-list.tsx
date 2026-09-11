import type { DocumentListItem, DocumentQuery } from "@/types";

import { DocumentCard } from "./document-card";
import { DocumentTable } from "./document-table";
import type { ViewMode } from "./view-toggle";

export function DocumentList({
  documents,
  view,
  query,
  canDownload,
  basePath,
}: {
  documents: DocumentListItem[];
  view: ViewMode;
  query?: DocumentQuery;
  canDownload: boolean;
  basePath?: string;
}) {
  if (view === "grid") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {documents.map((doc) => (
          <DocumentCard key={doc.id} document={doc} />
        ))}
      </div>
    );
  }
  return <DocumentTable documents={documents} query={query} canDownload={canDownload} basePath={basePath} />;
}
