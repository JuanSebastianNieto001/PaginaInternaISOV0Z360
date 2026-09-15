"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";
import type { ActionResult } from "@/types";

import { useToast } from "../providers/toast-provider";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { ConfirmDialog, Dialog } from "../ui/dialog";
import { Field, FormError } from "../ui/field";
import { Input, Textarea } from "../ui/input";
import { EmptyState } from "../ui/states";
import { Switch } from "../ui/switch";

/**
 * Listas planas de taxonomía (áreas responsables, procesos del SGI): mismo
 * comportamiento para todas, solo cambian los textos y las acciones. Los
 * textos van completos en vez de componerse, porque en español el género
 * cambia la frase entera ("Área creada" / "Proceso creado").
 */
export interface TaxonomyListItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  sort_order: number;
  document_count: number;
}

export interface TaxonomyListLabels {
  cardTitle: string;
  /** Recibe el número de elementos. */
  cardDescription: (count: number) => string;
  newButton: string;
  emptyTitle: string;
  emptyDescription: string;
  newDialogTitle: string;
  editDialogTitle: string;
  dialogDescription: string;
  namePlaceholder: string;
  codePlaceholder: string;
  descriptionPlaceholder: string;
  activeLabel: string;
  activeDescription: string;
  deleteDialogTitle: string;
  createdToast: string;
  updatedToast: string;
  deletedToast: string;
  fieldPrefix: string;
}

export interface TaxonomyListManagerProps {
  items: TaxonomyListItem[];
  labels: TaxonomyListLabels;
  upsert: (input: {
    id?: string;
    code: string;
    name: string;
    description: string;
    active: boolean;
    sortOrder: number;
  }) => Promise<ActionResult<{ id: string }>>;
  remove: (input: { id: string }) => Promise<ActionResult<{ id: string }>>;
}

interface Draft {
  id?: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
  sortOrder: number;
}

/** Sugiere un código a partir del nombre: "Líder ISO" → "LIDER_ISO". */
export function codeFromName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export function TaxonomyListManager({ items, labels, upsert, remove }: TaxonomyListManagerProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<TaxonomyListItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const open = (d: Draft) => {
    setDraft(d);
    setError(null);
    setFieldErrors({});
  };

  const submit = () => {
    if (!draft) return;
    startTransition(async () => {
      const result = await upsert({
        id: draft.id,
        code: draft.code || codeFromName(draft.name),
        name: draft.name,
        description: draft.description,
        active: draft.active,
        sortOrder: draft.sortOrder,
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      toast.success(draft.id ? labels.updatedToast : labels.createdToast);
      setDraft(null);
      router.refresh();
    });
  };

  const confirmDelete = () => {
    if (!deleting) return;
    startTransition(async () => {
      const result = await remove({ id: deleting.id });
      if (!result.ok) {
        toast.error("No se pudo eliminar", result.error);
        return;
      }
      toast.success(labels.deletedToast);
      setDeleting(null);
      router.refresh();
    });
  };

  const nextOrder = (items.length + 1) * 10;

  return (
    <>
      <Card>
        <CardHeader
          title={labels.cardTitle}
          description={labels.cardDescription(items.length)}
          action={
            <Button
              size="sm"
              onClick={() => open({ code: "", name: "", description: "", active: true, sortOrder: nextOrder })}
              leftIcon={<Plus className="size-3.5" />}
            >
              {labels.newButton}
            </Button>
          }
        />
        <CardContent className="pt-4">
          {items.length === 0 ? (
            <EmptyState compact title={labels.emptyTitle} description={labels.emptyDescription} />
          ) : (
            <ul className="divide-y divide-border">
              {items.map((a) => (
                <li key={a.id} className={cn("flex items-center gap-3 py-2.5", !a.active && "opacity-60")}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium text-fg">{a.name}</span>
                      <Badge tone="outline" size="sm" className="font-mono">
                        {a.code}
                      </Badge>
                      {!a.active ? (
                        <Badge tone="danger" size="sm">
                          Inactivo
                        </Badge>
                      ) : null}
                    </div>
                    {a.description ? <p className="truncate text-xs text-fg-muted">{a.description}</p> : null}
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-fg-subtle">
                    {formatNumber(a.document_count)} documentos
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        open({
                          id: a.id,
                          code: a.code,
                          name: a.name,
                          description: a.description ?? "",
                          active: a.active,
                          sortOrder: a.sort_order,
                        })
                      }
                      aria-label={`Editar ${a.name}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleting(a)}
                      aria-label={`Eliminar ${a.name}`}
                    >
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? labels.editDialogTitle : labels.newDialogTitle}
        description={labels.dialogDescription}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={submit} loading={pending}>
              Guardar
            </Button>
          </>
        }
      >
        {draft ? (
          <div className="space-y-4">
            <FormError message={error} />
            <Field label="Nombre" htmlFor={`${labels.fieldPrefix}-name`} required error={fieldErrors.name}>
              <Input
                id={`${labels.fieldPrefix}-name`}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder={labels.namePlaceholder}
                autoFocus
              />
            </Field>
            <Field
              label="Código"
              htmlFor={`${labels.fieldPrefix}-code`}
              error={fieldErrors.code}
              hint="Identificador interno. Si lo dejas vacío se genera del nombre."
            >
              <Input
                id={`${labels.fieldPrefix}-code`}
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                placeholder={codeFromName(draft.name) || labels.codePlaceholder}
                className="font-mono uppercase"
              />
            </Field>
            <Field label="Descripción" htmlFor={`${labels.fieldPrefix}-description`} error={fieldErrors.description}>
              <Textarea
                id={`${labels.fieldPrefix}-description`}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder={labels.descriptionPlaceholder}
                rows={3}
              />
            </Field>
            <Field
              label="Orden"
              htmlFor={`${labels.fieldPrefix}-order`}
              error={fieldErrors.sortOrder}
              hint="Menor número, más arriba en las listas."
            >
              <Input
                id={`${labels.fieldPrefix}-order`}
                type="number"
                min={0}
                max={9999}
                value={draft.sortOrder}
                onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })}
              />
            </Field>
            <Switch
              checked={draft.active}
              onCheckedChange={(v) => setDraft({ ...draft, active: v })}
              label={labels.activeLabel}
              description={labels.activeDescription}
            />
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={pending}
        title={labels.deleteDialogTitle}
        description={`¿Eliminar "${deleting?.name}"? Solo es posible si no tiene documentos asignados.`}
        confirmLabel="Eliminar"
        destructive
      />
    </>
  );
}
