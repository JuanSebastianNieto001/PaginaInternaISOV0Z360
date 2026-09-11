"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteDocumentType, deleteTag, upsertDocumentType, upsertTag } from "@/lib/actions/taxonomy.actions";
import type { TagWithCount } from "@/lib/services/tags.service";
import { STANDARD_COLORS } from "@/lib/validation/taxonomy";
import { cn } from "@/lib/utils/cn";
import type { DocumentType } from "@/types";

import { useToast } from "../providers/toast-provider";
import { Badge, namedColorDot } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { ConfirmDialog, Dialog } from "../ui/dialog";
import { Field, FormError } from "../ui/field";
import { Input, Textarea } from "../ui/input";
import { EmptyState } from "../ui/states";
import { Switch } from "../ui/switch";

type TagDraft = { kind: "tag"; id?: string; name: string; color: string };
type TypeDraft = { kind: "type"; id?: string; code: string; name: string; description: string; active: boolean; sortOrder: number };
type Draft = TagDraft | TypeDraft;
type Deleting = { kind: "tag"; id: string; name: string } | { kind: "type"; id: string; name: string };

export function TagsTypesManager({ tags, documentTypes }: { tags: TagWithCount[]; documentTypes: DocumentType[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Deleting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const open = (d: Draft) => { setDraft(d); setError(null); setFieldErrors({}); };

  const submit = () => {
    if (!draft) return;
    startTransition(async () => {
      const result = draft.kind === "tag"
        ? await upsertTag({ id: draft.id, name: draft.name, color: draft.color })
        : await upsertDocumentType({ id: draft.id, code: draft.code, name: draft.name, description: draft.description, active: draft.active, sortOrder: draft.sortOrder });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      toast.success("Guardado correctamente");
      setDraft(null);
      router.refresh();
    });
  };

  const confirmDelete = () => {
    if (!deleting) return;
    startTransition(async () => {
      const result = deleting.kind === "tag" ? await deleteTag({ id: deleting.id }) : await deleteDocumentType({ id: deleting.id });
      if (!result.ok) {
        toast.error("No se pudo eliminar", result.error);
        return;
      }
      toast.success("Eliminado correctamente");
      setDeleting(null);
      router.refresh();
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Etiquetas" description={`${tags.length} etiquetas. Al eliminar una etiqueta se desvincula de sus documentos.`} action={<Button size="sm" onClick={() => open({ kind: "tag", name: "", color: "slate" })} leftIcon={<Plus className="size-3.5" />}>Nueva</Button>} />
        <CardContent className="pt-4">
          {tags.length === 0 ? (
            <EmptyState compact title="Sin etiquetas" description="Crea etiquetas o añádelas al subir documentos." />
          ) : (
            <ul className="divide-y divide-border">
              {tags.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <Badge color={t.color}>#{t.name}</Badge>
                  <span className="text-xs text-fg-subtle">{t.document_count} documentos</span>
                  <div className="ml-auto flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => open({ kind: "tag", id: t.id, name: t.name, color: t.color ?? "slate" })} aria-label="Editar etiqueta"><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleting({ kind: "tag", id: t.id, name: t.name })} aria-label="Eliminar etiqueta"><Trash2 className="size-4 text-danger" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Tipos de documento" description="Política, procedimiento, registro… Los tipos inactivos no se ofrecen al subir." action={<Button size="sm" onClick={() => open({ kind: "type", code: "", name: "", description: "", active: true, sortOrder: documentTypes.length + 1 })} leftIcon={<Plus className="size-3.5" />}>Nuevo</Button>} />
        <CardContent className="pt-4">
          {documentTypes.length === 0 ? (
            <EmptyState compact title="Sin tipos de documento" description="Crea al menos un tipo para poder subir documentos." />
          ) : (
            <ul className="divide-y divide-border">
              {documentTypes.map((t) => (
                <li key={t.id} className={cn("flex items-center gap-3 py-2.5", !t.active && "opacity-60")}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium text-fg">{t.name}</span>
                      <Badge tone="outline" size="sm" className="font-mono">{t.code}</Badge>
                      {!t.active ? <Badge tone="danger" size="sm">Inactivo</Badge> : null}
                    </div>
                    {t.description ? <p className="truncate text-xs text-fg-muted">{t.description}</p> : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => open({ kind: "type", id: t.id, code: t.code, name: t.name, description: t.description ?? "", active: t.active, sortOrder: t.sort_order })} aria-label="Editar tipo"><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleting({ kind: "type", id: t.id, name: t.name })} aria-label="Eliminar tipo"><Trash2 className="size-4 text-danger" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.kind === "tag" ? (draft.id ? "Editar etiqueta" : "Nueva etiqueta") : draft?.id ? "Editar tipo de documento" : "Nuevo tipo de documento"}
        size="sm"
        locked={pending}
        footer={
          <>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={pending}>Cancelar</Button>
            <Button onClick={submit} loading={pending}>{draft?.id ? "Guardar" : "Crear"}</Button>
          </>
        }
      >
        {draft?.kind === "tag" ? (
          <div className="space-y-4">
            <FormError message={error} />
            <Field label="Nombre" htmlFor="tagName" required error={fieldErrors.name}>
              <Input id="tagName" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={40} disabled={pending} />
            </Field>
            <Field label="Color">
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color">
                {STANDARD_COLORS.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={draft.color === c} aria-label={c} onClick={() => setDraft({ ...draft, color: c })} className={cn("size-7 rounded-full ring-offset-2 ring-offset-surface transition", namedColorDot(c), draft.color === c && "ring-2 ring-primary")} disabled={pending} />
                ))}
              </div>
            </Field>
          </div>
        ) : draft?.kind === "type" ? (
          <div className="space-y-4">
            <FormError message={error} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Código" htmlFor="typeCode" required error={fieldErrors.code} hint="minúsculas, ej.: procedure">
                <Input id="typeCode" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toLowerCase() })} className="font-mono" disabled={pending} />
              </Field>
              <Field label="Orden" htmlFor="typeOrder">
                <Input id="typeOrder" type="number" min={0} value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} disabled={pending} />
              </Field>
            </div>
            <Field label="Nombre" htmlFor="typeName" required error={fieldErrors.name}>
              <Input id="typeName" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} disabled={pending} />
            </Field>
            <Field label="Descripción" htmlFor="typeDesc">
              <Textarea id="typeDesc" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} disabled={pending} />
            </Field>
            <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} disabled={pending} label="Activo" />
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={pending}
        destructive
        title={deleting?.kind === "tag" ? "Eliminar etiqueta" : "Eliminar tipo de documento"}
        description={<>Se eliminará <span className="font-medium text-fg">{deleting?.name}</span>.{deleting?.kind === "tag" ? " Los documentos dejarán de tenerla asignada." : " Solo es posible si ningún documento usa este tipo."}</>}
        confirmLabel="Eliminar"
      />
    </div>
  );
}
