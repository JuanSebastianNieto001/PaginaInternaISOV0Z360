import { CalendarClock, Hash, Tag as TagIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ActivityTimeline } from "@/components/documents/activity-timeline";
import { DocumentActions } from "@/components/documents/document-actions";
import { FavoriteButton } from "@/components/documents/favorite-button";
import { FileIcon } from "@/components/documents/file-icon";
import { FilePreview } from "@/components/documents/file-preview";
import { StatusBadge } from "@/components/documents/status-badge";
import { TrackView } from "@/components/documents/track-view";
import { VersionTimeline } from "@/components/documents/version-timeline";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, NotFoundState } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { DOCUMENT_STATUS_DESCRIPTIONS } from "@/lib/constants/documents";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getDocumentActivity } from "@/lib/services/audit.service";
import { getDocumentById, getDocumentVersions } from "@/lib/services/documents.service";
import { isFavorite } from "@/lib/services/favorites.service";
import { createSignedFileUrl } from "@/lib/storage/server";
import { createClient } from "@/lib/supabase/server";
import { fileKindLabel } from "@/lib/utils/files";
import { formatBytes, formatDate, formatDateTime } from "@/lib/utils/format";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!UUID_RE.test(id)) return { title: "Documento" };
  try {
    const supabase = await createClient();
    const doc = await getDocumentById(supabase, id);
    return { title: doc ? `${doc.code} · ${doc.name}` : "Documento no encontrado" };
  } catch {
    return { title: "Documento" };
  }
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-start sm:gap-4">
      <dt className="w-36 shrink-0 text-xs font-medium uppercase tracking-wide text-fg-subtle">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm text-fg">{children}</dd>
    </div>
  );
}

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([requireUser(), params]);
  if (!UUID_RE.test(id)) return <NotFoundState title="Documento no encontrado" />;

  const supabase = await createClient();
  let doc;
  try {
    doc = await getDocumentById(supabase, id);
  } catch {
    return <ErrorState />;
  }
  if (!doc) return <NotFoundState title="Documento no encontrado" description="El documento no existe, fue eliminado o no tienes acceso." />;

  const canDownload = can(user, PERMISSIONS.DOCUMENTS_DOWNLOAD);
  const canUpdate = can(user, PERMISSIONS.DOCUMENTS_UPDATE);
  const canDelete = can(user, PERMISSIONS.DOCUMENTS_DELETE);

  const [versions, activity, favorite, previewUrl] = await Promise.all([
    getDocumentVersions(supabase, doc.id).catch(() => []),
    getDocumentActivity(supabase, doc.id).catch(() => []),
    isFavorite(supabase, user.id, doc.id).catch(() => false),
    createSignedFileUrl(supabase, doc.file_path, { expiresIn: 60 * 15 }),
  ]);

  return (
    <>
      <TrackView documentId={doc.id} />
      <PageHeader
        breadcrumbs={[
          { label: "Repositorio", href: "/documents" },
          ...(doc.standard ? [{ label: doc.standard.code, href: `/documents?standard=${doc.standard.id}` }] : []),
          ...(doc.category ? [{ label: doc.category.name, href: `/documents?standard=${doc.standard?.id ?? ""}&category=${doc.category.id}` }] : []),
          { label: doc.code },
        ]}
        title={
          <span className="flex items-start gap-3">
            <FileIcon extension={doc.file_extension} className="mt-0.5" />
            <span className="min-w-0">
              <span className="block font-mono text-xs font-normal uppercase tracking-wide text-fg-subtle">{doc.code}</span>
              <span className="block">{doc.name}</span>
            </span>
          </span>
        }
        actions={
          <>
            <FavoriteButton documentId={doc.id} initial={favorite} />
            <DocumentActions document={{ id: doc.id, name: doc.name, status: doc.status, version: doc.version }} canDownload={canDownload} canUpdate={canUpdate} canDelete={canDelete} />
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={doc.status} />
          <Badge tone="outline" className="font-mono">v{doc.version}</Badge>
          {doc.standard ? <Badge color={doc.standard.color}>{doc.standard.code}</Badge> : null}
          {doc.document_type ? <Badge tone="outline">{doc.document_type.name}</Badge> : null}
          <span className="text-xs text-fg-subtle">{DOCUMENT_STATUS_DESCRIPTIONS[doc.status]}</span>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <FilePreview documentId={doc.id} fileName={doc.file_name} extension={doc.file_extension} mimeType={doc.mime_type} size={doc.file_size} signedUrl={previewUrl} canDownload={canDownload} />

          <Tabs defaultValue="info">
            <TabsList>
              <TabsTrigger value="info">Información</TabsTrigger>
              <TabsTrigger value="versions" count={versions.length}>Versiones</TabsTrigger>
              <TabsTrigger value="activity" count={activity.length}>Actividad</TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <Card>
                <CardContent>
                  <dl className="divide-y divide-border">
                    <InfoRow label="Descripción">{doc.description ? <p className="whitespace-pre-line leading-relaxed">{doc.description}</p> : <span className="text-fg-subtle">Sin descripción.</span>}</InfoRow>
                    <InfoRow label="Norma">{doc.standard ? <Link href={`/documents?standard=${doc.standard.id}`} className="hover:text-primary">{doc.standard.code} · {doc.standard.name}</Link> : "—"}</InfoRow>
                    <InfoRow label="Categoría">{doc.category?.name ?? "—"}</InfoRow>
                    <InfoRow label="Subcategoría">{doc.subcategory?.name ?? <span className="text-fg-subtle">—</span>}</InfoRow>
                    <InfoRow label="Tipo">{doc.document_type?.name ?? "—"}</InfoRow>
                    <InfoRow label="Área responsable">
                      {doc.area ? (
                        <Link href={`/documents?area=${doc.area.id}`} className="hover:text-primary">
                          {doc.area.name}
                        </Link>
                      ) : (
                        <span className="text-fg-subtle">Sin asignar</span>
                      )}
                    </InfoRow>
                    <InfoRow label="Etiquetas">
                      {doc.tags.length === 0 ? (
                        <span className="text-fg-subtle">Sin etiquetas.</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {doc.tags.map((t) => (
                            <Link key={t.id} href={`/documents?tags=${t.id}`}>
                              <Badge color={t.color} className="hover:opacity-80"><TagIcon className="size-3" />{t.name}</Badge>
                            </Link>
                          ))}
                        </div>
                      )}
                    </InfoRow>
                    <InfoRow label="Archivo">
                      {doc.file_name}
                      <span className="ml-2 text-xs text-fg-subtle">{fileKindLabel(doc.file_extension)} · {formatBytes(doc.file_size)}</span>
                    </InfoRow>
                    <InfoRow label="Vigencia">
                      {doc.effective_date ? formatDate(doc.effective_date) : <span className="text-fg-subtle">—</span>}
                      {doc.review_date ? <span className="ml-3 inline-flex items-center gap-1 text-xs text-fg-muted"><CalendarClock className="size-3.5" /> Revisión: {formatDate(doc.review_date)}</span> : null}
                    </InfoRow>
                    <InfoRow label="Identificador"><span className="inline-flex items-center gap-1 font-mono text-xs text-fg-muted"><Hash className="size-3" />{doc.id}</span></InfoRow>
                  </dl>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="versions">
              <VersionTimeline documentId={doc.id} versions={versions} currentVersion={doc.version} canDownload={canDownload} />
            </TabsContent>

            <TabsContent value="activity">
              <ActivityTimeline logs={activity} emptyTitle="Sin actividad registrada" emptyDescription="Las acciones sobre este documento aparecerán aquí." />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader title="Trazabilidad" />
            <CardContent className="space-y-4 pt-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Autor</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Avatar name={doc.creator?.full_name} src={doc.creator?.avatar_url} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{doc.creator?.full_name ?? "Usuario eliminado"}</p>
                    <p className="text-xs text-fg-subtle">{formatDateTime(doc.created_at)}</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Última modificación</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Avatar name={doc.updater?.full_name} src={doc.updater?.avatar_url} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{doc.updater?.full_name ?? "—"}</p>
                    <p className="text-xs text-fg-subtle">{formatDateTime(doc.updated_at)}</p>
                  </div>
                </div>
              </div>
              {doc.approved_at ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Aprobado</p>
                  <p className="mt-1 text-sm text-fg">{formatDateTime(doc.approved_at)}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Resumen de versiones" />
            <CardContent className="pt-4">
              {versions.length === 0 ? (
                <p className="text-sm text-fg-subtle">Sin historial.</p>
              ) : (
                <ul className="space-y-2">
                  {versions.slice(0, 5).map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-mono font-medium text-fg">v{v.version}</span>
                      <span className="truncate text-xs text-fg-muted">{v.creator?.full_name ?? "—"}</span>
                      <span className="shrink-0 text-xs text-fg-subtle">{formatDate(v.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
