"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteStandard, upsertStandard } from "@/lib/actions/taxonomy.actions";
import { STANDARD_COLORS } from "@/lib/validation/taxonomy";
import { cn } from "@/lib/utils/cn";
import type { Standard } from "@/types";

import { useToast } from "../providers/toast-provider";
import { Badge, namedColorDot } from "../ui/badge";
import { Button } from "../ui/button";
import { ConfirmDialog, Dialog } from "../ui/dialog";
import { Field, FormError } from "../ui/field";
import { Input, Textarea } from "../ui/input";
import { EmptyState } from "../ui/states";
import { Switch } from "../ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

interface Draft {
  id?: string;
  code: string;
  name: string;
  description: string;
  color: string;
  active: boolean;
  sortOrder: number;
}

const EMPTY: Draft = { code: "", name: "", description: "", color: "blue", active: true, sortOrder: 0 };

export function StandardsManager({ standards, counts }: { standards: Standard[]; counts: Record<string, number> }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Standard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const openCreate = () => { setDraft({ ...EMPTY, sortOrder: standards.length + 1 }); setError(null); setFieldErrors({}); };
  const openEdit = (s: Standard) => {
    setDraft({ id: s.id, code: s.code, name: s.name, description: s.description ?? "", color: s.color ?? "blue", active: s.active, sortOrder: s.sort_order });
    setError(null);
    setFieldErrors({});
  };

  const submit = () => {
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      const result = await upsertStandard(draft);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      toast.success(draft.id ? "Norma actualizada" : "Norma creada");
      setDraft(null);
      router.refresh();
    });
  };

  const confirmDelete = () => {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteStandard({ id: deleting.id });
      if (!result.ok) {
        toast.error("No se pudo eliminar", result.error);
        return;
      }
      toast.success("Norma eliminada");
      setDeleting(null);
      router.refresh();
    });
  };

  const toggleActive = (s: Standard) => {
    startTransition(async () => {
      const result = await upsertStandard({ id: s.id, code: s.code, name: s.name, description: s.description ?? "", color: s.color ?? "", active: !s.active, sortOrder: s.sort_order });
      if (!result.ok) {
        toast.error("No se pudo cambiar el estado", result.error);
        return;
      }
      toast.success(s.active ? "Norma desactivada" : "Norma activada");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} leftIcon={<Plus className="size-4" />}>Nueva norma</Button>
      </div>

      {standards.length === 0 ? (
        <EmptyState title="No hay normas" description="Crea la primera norma (p. ej. ISO 27001) para empezar a clasificar documentos." action={<Button onClick={openCreate} size="sm">Crear norma</Button>} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Norma</TableHead>
                <TableHead className="hidden lg:table-cell">Descripción</TableHead>
                <TableHead>Documentos</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead>Activa</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standards.map((s) => (
                <TableRow key={s.id} className={cn(!s.active && "opacity-60")}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className={`size-2.5 rounded-full ${namedColorDot(s.color)}`} aria-hidden />
                      <div>
                        <p className="font-medium text-fg">{s.name}</p>
                        <Badge color={s.color} size="sm" className="mt-0.5">{s.code}</Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden max-w-md text-fg-muted lg:table-cell"><p className="truncate">{s.description ?? "—"}</p></TableCell>
                  <TableCell className="tabular-nums">{counts[s.id] ?? 0}</TableCell>
                  <TableCell className="tabular-nums text-fg-muted">{s.sort_order}</TableCell>
                  <TableCell><Switch size="sm" checked={s.active} onCheckedChange={() => toggleActive(s)} disabled={pending} /></TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(s)} aria-label="Editar"><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(s)} aria-label="Eliminar" disabled={(counts[s.id] ?? 0) > 0} title={(counts[s.id] ?? 0) > 0 ? "Tiene documentos asociados: desactívala en su lugar" : undefined}><Trash2 className="size-4 text-danger" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Editar norma" : "Nueva norma"}
        locked={pending}
        footer={
          <>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={pending}>Cancelar</Button>
            <Button onClick={submit} loading={pending}>{draft?.id ? "Guardar" : "Crear"}</Button>
          </>
        }
      >
        {draft ? (
          <div className="space-y-4">
            <FormError message={error} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Código" htmlFor="stdCode" required error={fieldErrors.code} hint="Ej.: ISO-27001">
                <Input id="stdCode" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} className="font-mono uppercase" disabled={pending} />
              </Field>
              <Field label="Orden" htmlFor="stdOrder" error={fieldErrors.sortOrder}>
                <Input id="stdOrder" type="number" min={0} value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} disabled={pending} />
              </Field>
            </div>
            <Field label="Nombre" htmlFor="stdName" required error={fieldErrors.name} hint="Ej.: ISO/IEC 27001:2022">
              <Input id="stdName" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} disabled={pending} />
            </Field>
            <Field label="Descripción" htmlFor="stdDesc" error={fieldErrors.description}>
              <Textarea id="stdDesc" rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} disabled={pending} />
            </Field>
            <Field label="Color">
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color">
                {STANDARD_COLORS.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={draft.color === c} aria-label={c} onClick={() => setDraft({ ...draft, color: c })} className={cn("size-7 rounded-full ring-offset-2 ring-offset-surface transition", namedColorDot(c), draft.color === c && "ring-2 ring-primary")} disabled={pending} />
                ))}
              </div>
            </Field>
            <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} disabled={pending} label="Norma activa" description="Las normas inactivas no se muestran en filtros ni formularios." />
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={pending}
        destructive
        title="Eliminar norma"
        description={<>Se eliminará <span className="font-medium text-fg">{deleting?.name}</span> junto con sus categorías y subcategorías. Solo es posible si no tiene documentos asociados.</>}
        confirmLabel="Eliminar"
      />
    </div>
  );
}
