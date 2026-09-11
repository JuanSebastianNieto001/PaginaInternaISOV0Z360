"use client";

import { ChevronRight, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteCategory, deleteSubcategory, upsertCategory, upsertSubcategory } from "@/lib/actions/taxonomy.actions";
import { cn } from "@/lib/utils/cn";
import type { Category, StandardWithCategories, Subcategory } from "@/types";

import { useToast } from "../providers/toast-provider";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ConfirmDialog, Dialog } from "../ui/dialog";
import { Field, FormError } from "../ui/field";
import { Input, Textarea } from "../ui/input";
import { Select } from "../ui/select";
import { EmptyState } from "../ui/states";
import { Switch } from "../ui/switch";

interface Props {
  tree: StandardWithCategories[];
  selectedStandardId: string;
  categoryCounts: Record<string, number>;
  subcategoryCounts: Record<string, number>;
}

type CategoryDraft = { kind: "category"; id?: string; standardId: string; code: string; name: string; description: string; active: boolean; sortOrder: number };
type SubDraft = { kind: "subcategory"; id?: string; categoryId: string; code: string; name: string; description: string; active: boolean; sortOrder: number };
type Draft = CategoryDraft | SubDraft;
type Deleting = { kind: "category"; item: Category } | { kind: "subcategory"; item: Subcategory };

export function CategoriesManager({ tree, selectedStandardId, categoryCounts, subcategoryCounts }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Deleting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const standard = tree.find((s) => s.id === selectedStandardId) ?? tree[0];
  if (!standard) return null;

  const open = (d: Draft) => { setDraft(d); setError(null); setFieldErrors({}); };

  const submit = () => {
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      const result = draft.kind === "category"
        ? await upsertCategory({ id: draft.id, standardId: draft.standardId, code: draft.code, name: draft.name, description: draft.description, active: draft.active, sortOrder: draft.sortOrder })
        : await upsertSubcategory({ id: draft.id, categoryId: draft.categoryId, code: draft.code, name: draft.name, description: draft.description, active: draft.active, sortOrder: draft.sortOrder });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      toast.success(draft.id ? "Cambios guardados" : draft.kind === "category" ? "Categoría creada" : "Subcategoría creada");
      setDraft(null);
      router.refresh();
    });
  };

  const confirmDelete = () => {
    if (!deleting) return;
    startTransition(async () => {
      const result = deleting.kind === "category" ? await deleteCategory({ id: deleting.item.id }) : await deleteSubcategory({ id: deleting.item.id });
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select aria-label="Norma" value={standard.id} onChange={(e) => router.replace(`${pathname}?standard=${e.target.value}`)} options={tree.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}${s.active ? "" : " (inactiva)"}` }))} className="sm:w-80" />
        <Button onClick={() => open({ kind: "category", standardId: standard.id, code: "", name: "", description: "", active: true, sortOrder: standard.categories.length + 1 })} leftIcon={<Plus className="size-4" />}>Nueva categoría</Button>
      </div>

      {standard.categories.length === 0 ? (
        <EmptyState title="Esta norma no tiene categorías" description="Crea la primera categoría para poder clasificar documentos bajo esta norma." />
      ) : (
        <ul className="space-y-3">
          {standard.categories.map((cat) => (
            <li key={cat.id} className={cn("rounded-xl border border-border bg-surface", !cat.active && "opacity-70")}>
              <div className="flex flex-wrap items-center gap-3 p-4">
                <span className="flex size-9 items-center justify-center rounded-lg bg-surface-2 text-fg-muted"><Layers className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-fg">{cat.name}</p>
                    <Badge tone="outline" size="sm" className="font-mono">{cat.code}</Badge>
                    {!cat.active ? <Badge tone="danger" size="sm">Inactiva</Badge> : null}
                    <span className="text-xs text-fg-subtle">{categoryCounts[cat.id] ?? 0} documentos</span>
                  </div>
                  {cat.description ? <p className="mt-0.5 text-sm text-fg-muted">{cat.description}</p> : null}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => open({ kind: "subcategory", categoryId: cat.id, code: "", name: "", description: "", active: true, sortOrder: cat.subcategories.length + 1 })} leftIcon={<Plus className="size-3.5" />}>Subcategoría</Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => open({ kind: "category", id: cat.id, standardId: cat.standard_id, code: cat.code, name: cat.name, description: cat.description ?? "", active: cat.active, sortOrder: cat.sort_order })} aria-label="Editar categoría"><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDeleting({ kind: "category", item: cat })} disabled={(categoryCounts[cat.id] ?? 0) > 0} aria-label="Eliminar categoría"><Trash2 className="size-4 text-danger" /></Button>
                </div>
              </div>
              {cat.subcategories.length > 0 ? (
                <ul className="divide-y divide-border border-t border-border">
                  {cat.subcategories.map((sub) => (
                    <li key={sub.id} className={cn("flex flex-wrap items-center gap-3 py-2.5 pl-8 pr-4", !sub.active && "opacity-70")}>
                      <ChevronRight className="size-4 text-fg-subtle" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium text-fg">{sub.name}</span>
                          <Badge tone="outline" size="sm" className="font-mono">{sub.code}</Badge>
                          {!sub.active ? <Badge tone="danger" size="sm">Inactiva</Badge> : null}
                          <span className="text-xs text-fg-subtle">{subcategoryCounts[sub.id] ?? 0} documentos</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => open({ kind: "subcategory", id: sub.id, categoryId: sub.category_id, code: sub.code, name: sub.name, description: sub.description ?? "", active: sub.active, sortOrder: sub.sort_order })} aria-label="Editar subcategoría"><Pencil className="size-4" /></Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleting({ kind: "subcategory", item: sub })} disabled={(subcategoryCounts[sub.id] ?? 0) > 0} aria-label="Eliminar subcategoría"><Trash2 className="size-4 text-danger" /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? (draft.kind === "category" ? "Editar categoría" : "Editar subcategoría") : draft?.kind === "category" ? "Nueva categoría" : "Nueva subcategoría"}
        description={draft?.kind === "category" ? `Norma: ${standard.code}` : undefined}
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
              <Field label="Código" htmlFor="catCode" required error={fieldErrors.code} hint="Corto y único dentro del nivel. Ej.: SEG">
                <Input id="catCode" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} className="font-mono uppercase" disabled={pending} />
              </Field>
              <Field label="Orden" htmlFor="catOrder" error={fieldErrors.sortOrder}>
                <Input id="catOrder" type="number" min={0} value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} disabled={pending} />
              </Field>
            </div>
            <Field label="Nombre" htmlFor="catName" required error={fieldErrors.name}>
              <Input id="catName" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} disabled={pending} />
            </Field>
            <Field label="Descripción" htmlFor="catDesc" error={fieldErrors.description}>
              <Textarea id="catDesc" rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} disabled={pending} />
            </Field>
            <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} disabled={pending} label="Activa" description="Si se desactiva, deja de aparecer en filtros y formularios." />
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={pending}
        destructive
        title={deleting?.kind === "category" ? "Eliminar categoría" : "Eliminar subcategoría"}
        description={<>Se eliminará <span className="font-medium text-fg">{deleting?.item.name}</span>{deleting?.kind === "category" ? " y todas sus subcategorías" : ""}. Solo es posible si no tiene documentos asociados.</>}
        confirmLabel="Eliminar"
      />
    </div>
  );
}
