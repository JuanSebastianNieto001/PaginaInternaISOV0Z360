"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteArea, upsertArea } from "@/lib/actions/taxonomy.actions";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";
import type { Area } from "@/types";

import { useToast } from "../providers/toast-provider";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { ConfirmDialog, Dialog } from "../ui/dialog";
import { Field, FormError } from "../ui/field";
import { Input, Textarea } from "../ui/input";
import { EmptyState } from "../ui/states";
import { Switch } from "../ui/switch";

export interface AreaWithCount extends Area {
  document_count: number;
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
function codeFromName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export function AreasManager({ areas }: { areas: AreaWithCount[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<AreaWithCount | null>(null);
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
      const result = await upsertArea({
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
      toast.success(draft.id ? "Área actualizada" : "Área creada");
      setDraft(null);
      router.refresh();
    });
  };

  const confirmDelete = () => {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteArea({ id: deleting.id });
      if (!result.ok) {
        toast.error("No se pudo eliminar", result.error);
        return;
      }
      toast.success("Área eliminada");
      setDeleting(null);
      router.refresh();
    });
  };

  const nextOrder = (areas.length + 1) * 10;

  return (
    <>
      <Card>
        <CardHeader
          title="Áreas responsables"
          description={`${areas.length} áreas. Se asignan al subir un documento y sirven para filtrar el repositorio.`}
          action={
            <Button
              size="sm"
              onClick={() => open({ code: "", name: "", description: "", active: true, sortOrder: nextOrder })}
              leftIcon={<Plus className="size-3.5" />}
            >
              Nueva área
            </Button>
          }
        />
        <CardContent className="pt-4">
          {areas.length === 0 ? (
            <EmptyState compact title="Sin áreas" description="Crea las áreas o cargos que serán dueños de la documentación." />
          ) : (
            <ul className="divide-y divide-border">
              {areas.map((a) => (
                <li key={a.id} className={cn("flex items-center gap-3 py-2.5", !a.active && "opacity-60")}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium text-fg">{a.name}</span>
                      <Badge tone="outline" size="sm" className="font-mono">
                        {a.code}
                      </Badge>
                      {!a.active ? (
                        <Badge tone="danger" size="sm">
                          Inactiva
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
        title={draft?.id ? "Editar área" : "Nueva área"}
        description="El nombre es lo que verán las personas al subir o filtrar documentos."
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
            <Field label="Nombre" htmlFor="area-name" required error={fieldErrors.name}>
              <Input
                id="area-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Coordinador SST"
                autoFocus
              />
            </Field>
            <Field
              label="Código"
              htmlFor="area-code"
              error={fieldErrors.code}
              hint="Identificador interno. Si lo dejas vacío se genera del nombre."
            >
              <Input
                id="area-code"
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                placeholder={codeFromName(draft.name) || "COORDINADOR_SST"}
                className="font-mono uppercase"
              />
            </Field>
            <Field label="Descripción" htmlFor="area-description" error={fieldErrors.description}>
              <Textarea
                id="area-description"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Qué documentación gestiona esta área…"
                rows={3}
              />
            </Field>
            <Field label="Orden" htmlFor="area-order" error={fieldErrors.sortOrder} hint="Menor número, más arriba en las listas.">
              <Input
                id="area-order"
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
              label="Activa"
              description="Las áreas inactivas no se ofrecen al subir documentos."
            />
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={pending}
        title="Eliminar área"
        description={`¿Eliminar "${deleting?.name}"? Solo es posible si no tiene documentos asignados.`}
        confirmLabel="Eliminar"
        destructive
      />
    </>
  );
}
