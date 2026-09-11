"use client";

import { Download, GitBranchPlus, MoreHorizontal, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { changeDocumentStatus, deleteDocument } from "@/lib/actions/documents.actions";
import { DOCUMENT_STATUSES, DOCUMENT_STATUS_LABELS } from "@/lib/constants/documents";
import type { DocumentStatus } from "@/types";

import { useToast } from "../providers/toast-provider";
import { ButtonLink, buttonClasses } from "../ui/button";
import { ConfirmDialog } from "../ui/dialog";
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from "../ui/dropdown";

interface DocumentActionsProps {
  document: { id: string; name: string; status: DocumentStatus; version: string };
  canDownload: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export function DocumentActions({ document: doc, canDownload, canUpdate, canDelete }: DocumentActionsProps) {
  const router = useRouter();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    startTransition(async () => {
      const result = await deleteDocument(doc.id);
      if (!result.ok) {
        toast.error("No se pudo eliminar", result.error);
        return;
      }
      toast.success("Documento eliminado", `"${doc.name}" se ha eliminado junto con su historial.`);
      setConfirmOpen(false);
      router.push("/documents");
    });
  };

  const onStatus = (status: DocumentStatus) => {
    if (status === doc.status) return;
    startTransition(async () => {
      const result = await changeDocumentStatus(doc.id, status);
      if (!result.ok) {
        toast.error("No se pudo cambiar el estado", result.error);
        return;
      }
      toast.success("Estado actualizado", `Ahora está "${DOCUMENT_STATUS_LABELS[status]}".`);
      router.refresh();
    });
  };

  const hasMenu = canUpdate || canDelete;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canDownload ? (
          <a href={`/api/documents/${doc.id}/download`} className={buttonClasses({ variant: "primary" })}>
            <Download className="size-4" /> Descargar
          </a>
        ) : null}
        {canUpdate ? (
          <ButtonLink href={`/documents/${doc.id}/new-version`} variant="outline" leftIcon={<GitBranchPlus className="size-4" />}>
            Nueva versión
          </ButtonLink>
        ) : null}
        {hasMenu ? (
          <Dropdown
            align="end"
            trigger={
              <span className={buttonClasses({ variant: "outline", size: "icon" })} aria-label="Más acciones">
                <MoreHorizontal className="size-4" />
              </span>
            }
          >
            {canUpdate ? (
              <>
                <DropdownItem href={`/documents/${doc.id}/edit`} icon={<Pencil className="size-4 text-fg-subtle" />}>
                  Editar metadatos
                </DropdownItem>
                <DropdownSeparator />
                <DropdownLabel>Cambiar estado</DropdownLabel>
                {DOCUMENT_STATUSES.map((s) => (
                  <DropdownItem
                    key={s}
                    onClick={() => onStatus(s)}
                    disabled={pending || s === doc.status}
                    icon={<RefreshCw className="size-4 text-fg-subtle" />}
                  >
                    {DOCUMENT_STATUS_LABELS[s]}
                    {s === doc.status ? <span className="ml-auto text-xs text-fg-subtle">actual</span> : null}
                  </DropdownItem>
                ))}
              </>
            ) : null}
            {canDelete ? (
              <>
                <DropdownSeparator />
                <DropdownItem destructive onClick={() => setConfirmOpen(true)} icon={<Trash2 className="size-4" />}>
                  Eliminar documento
                </DropdownItem>
              </>
            ) : null}
          </Dropdown>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onDelete}
        loading={pending}
        destructive
        title="Eliminar documento"
        description={
          <>
            Se eliminará <span className="font-medium text-fg">“{doc.name}”</span> con todas sus versiones y
            archivos. Esta acción queda registrada en auditoría y no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar definitivamente"
      />
    </>
  );
}
