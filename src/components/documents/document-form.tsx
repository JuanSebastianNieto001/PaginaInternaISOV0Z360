"use client";

import { Save, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { createDocument, updateDocument } from "@/lib/actions/documents.actions";
import {
  DOCUMENT_STATUSES,
  DOCUMENT_STATUS_DESCRIPTIONS,
  DOCUMENT_STATUS_LABELS,
  INFO_CLASSIFICATIONS,
  INFO_CLASSIFICATION_DESCRIPTIONS,
  INFO_CLASSIFICATION_LABELS,
} from "@/lib/constants/documents";
import { removeUploadedFile, uploadFileWithProgress } from "@/lib/storage/upload";
import { buildStoragePath, getExtension, guessMimeType } from "@/lib/utils/files";
import { createDocumentSchema, updateDocumentSchema } from "@/lib/validation/documents";
import { cn } from "@/lib/utils/cn";
import type {
  Area,
  DocumentDetail,
  DocumentStatus,
  DocumentType,
  InfoClassification,
  Process,
  StandardWithCategories,
} from "@/types";

import { useToast } from "../providers/toast-provider";
import { Button, ButtonLink } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Field, FormError } from "../ui/field";
import { Input, Textarea } from "../ui/input";
import { Select } from "../ui/select";
import { FileDropzone, validateFile } from "./file-dropzone";
import { TagInput } from "./tag-input";

export interface DocumentFormProps {
  mode: "create" | "edit";
  tree: StandardWithCategories[];
  documentTypes: DocumentType[];
  areas: Area[];
  processes: Process[];
  tagSuggestions: string[];
  settings: { maxFileSizeMb: number; allowedExtensions: string[]; defaultStatus: DocumentStatus };
  initial?: DocumentDetail;
}

interface FormValues {
  name: string;
  code: string;
  description: string;
  /** Normas que aplican. La primera es la principal. */
  standardIds: string[];
  categoryId: string;
  subcategoryId: string;
  documentTypeId: string;
  areaId: string;
  processId: string;
  classification: InfoClassification;
  retention: string;
  status: DocumentStatus;
  version: string;
  tags: string[];
  effectiveDate: string;
  reviewDate: string;
}

export function DocumentForm({ mode, tree, documentTypes, areas, processes, tagSuggestions, settings, initial }: DocumentFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [values, setValues] = useState<FormValues>(() => ({
    name: initial?.name ?? "",
    code: initial?.code ?? "",
    description: initial?.description ?? "",
    standardIds: tree.filter((s) => (initial?.standards ?? []).some((x) => x.id === s.id)).map((s) => s.id),
    categoryId: initial?.category_id ?? "",
    subcategoryId: initial?.subcategory_id ?? "",
    documentTypeId: initial?.document_type_id ?? "",
    areaId: initial?.area_id ?? "",
    processId: initial?.process_id ?? "",
    classification: initial?.classification ?? "internal",
    retention: initial?.retention ?? "",
    status: initial?.status ?? settings.defaultStatus,
    version: initial?.version ?? "1.0",
    tags: initial?.tags.map((t) => t.name) ?? [],
    effectiveDate: initial?.effective_date ?? "",
    reviewDate: initial?.review_date ?? "",
  }));

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      // Cambiar la norma principal invalida el capítulo elegido.
      if (key === "standardIds" && next.standardIds[0] !== prev.standardIds[0]) {
        next.categoryId = "";
        next.subcategoryId = "";
      }
      if (key === "categoryId") next.subcategoryId = "";
      return next;
    });
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const principalStandardId = values.standardIds[0] ?? "";
  const categories = useMemo(
    () => tree.find((s) => s.id === principalStandardId)?.categories ?? [],
    [tree, principalStandardId],
  );

  /** Alterna una norma conservando el orden del catálogo. */
  const toggleStandard = (id: string) => {
    const chosen = new Set(values.standardIds);
    if (chosen.has(id)) chosen.delete(id);
    else chosen.add(id);
    set(
      "standardIds",
      tree.filter((s) => chosen.has(s.id)).map((s) => s.id),
    );
  };
  const subcategories = useMemo(() => categories.find((c) => c.id === values.categoryId)?.subcategories ?? [], [categories, values.categoryId]);

  const onFileChange = (f: File | null) => {
    setFile(f);
    setFileError(f ? validateFile(f, settings.allowedExtensions, settings.maxFileSizeMb) : null);
    setProgress(null);
  };

  const busy = pending || (progress !== null && progress < 100);

  const submit = () => {
    setFormError(null);
    setFieldErrors({});

    if (mode === "create") {
      if (!file) {
        setFileError("Selecciona el archivo del documento.");
        return;
      }
      const fe = validateFile(file, settings.allowedExtensions, settings.maxFileSizeMb);
      if (fe) {
        setFileError(fe);
        return;
      }

      const id = crypto.randomUUID();
      const extension = getExtension(file.name);
      const path = buildStoragePath(id, values.version, extension);
      const payload = {
        id,
        ...values,
        file: {
          path,
          name: file.name,
          extension,
          size: file.size,
          mimeType: file.type || guessMimeType(file.name),
        },
      };

      const parsed = createDocumentSchema.safeParse(payload);
      if (!parsed.success) {
        const errs: Record<string, string[]> = {};
        for (const issue of parsed.error.issues) {
          const k = String(issue.path[0] ?? "form");
          errs[k] = [...(errs[k] ?? []), issue.message];
        }
        setFieldErrors(errs);
        setFormError("Revisa los campos marcados.");
        return;
      }

      startTransition(async () => {
        try {
          setProgress(0);
          await uploadFileWithProgress({ file, path, onProgress: setProgress });
        } catch (error) {
          setProgress(null);
          setFormError(error instanceof Error ? error.message : "No se pudo subir el archivo.");
          return;
        }

        const result = await createDocument(parsed.data);
        if (!result.ok) {
          await removeUploadedFile(path).catch(() => undefined);
          setProgress(null);
          setFormError(result.error);
          if (result.fieldErrors) setFieldErrors(result.fieldErrors);
          return;
        }
        toast.success("Documento creado", `"${values.name}" se ha añadido al repositorio.`);
        router.push(`/documents/${result.data.id}`);
      });
      return;
    }

    // edit
    if (!initial) return;
    const payload = { id: initial.id, ...values };
    const parsed = updateDocumentSchema.safeParse(payload);
    if (!parsed.success) {
      const errs: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0] ?? "form");
        errs[k] = [...(errs[k] ?? []), issue.message];
      }
      setFieldErrors(errs);
      setFormError("Revisa los campos marcados.");
      return;
    }
    startTransition(async () => {
      const result = await updateDocument(parsed.data);
      if (!result.ok) {
        setFormError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }
      toast.success("Documento actualizado");
      router.push(`/documents/${initial.id}`);
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid gap-6 lg:grid-cols-[1fr_20rem]"
      noValidate
    >
      <div className="space-y-6">
        {mode === "create" ? (
          <Card>
            <CardHeader title="Archivo" description="Arrastra el archivo o selecciónalo. Se almacena de forma privada." />
            <CardContent>
              <FileDropzone
                file={file}
                onFileChange={onFileChange}
                allowedExtensions={settings.allowedExtensions}
                maxSizeMb={settings.maxFileSizeMb}
                progress={progress}
                disabled={busy}
                error={fileError}
              />
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader title="Identificación" description="Datos que identifican el documento en el sistema." />
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="name" required error={fieldErrors.name} className="sm:col-span-2">
              <Input id="name" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="Política de Control de Accesos" disabled={busy} invalid={Boolean(fieldErrors.name)} />
            </Field>
            <Field label="Código" htmlFor="code" required error={fieldErrors.code} hint="Identificador único, p. ej. POL-SI-001.">
              <Input id="code" value={values.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="POL-SI-001" className="font-mono uppercase" disabled={busy} invalid={Boolean(fieldErrors.code)} />
            </Field>
            <Field label="Versión" htmlFor="version" required error={fieldErrors.version} hint="Formato numérico: 1.0, 2.1, 1.0.3">
              <Input id="version" value={values.version} onChange={(e) => set("version", e.target.value)} placeholder="1.0" className="font-mono" disabled={busy} invalid={Boolean(fieldErrors.version)} />
            </Field>
            <Field label="Descripción" htmlFor="description" error={fieldErrors.description} className="sm:col-span-2">
              <Textarea id="description" value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="Propósito, alcance y contenido principal del documento…" disabled={busy} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Clasificación del SGI"
            description="Los mismos campos del listado maestro. Son los que luego permiten filtrar en el repositorio."
          />
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Normas que aplican"
              required
              error={fieldErrors.standardIds}
              hint="Marca todas las que apliquen. Un mismo documento puede servir para dos normas o para las tres."
              className="sm:col-span-2"
            >
              <div className="flex flex-wrap gap-2">
                {tree.map((s) => {
                  const selected = values.standardIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={selected}
                      disabled={busy}
                      onClick={() => toggleStandard(s.id)}
                      className={cn(
                        "inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60",
                        selected
                          ? "border-primary bg-primary text-primary-fg"
                          : "border-border bg-surface text-fg-muted hover:border-primary hover:bg-primary-soft hover:text-primary",
                      )}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Tipo de documento" htmlFor="documentTypeId" required error={fieldErrors.documentTypeId}>
              <Select id="documentTypeId" value={values.documentTypeId} onChange={(e) => set("documentTypeId", e.target.value)} placeholder="Selecciona un tipo" options={documentTypes.map((t) => ({ value: t.id, label: t.name }))} disabled={busy} invalid={Boolean(fieldErrors.documentTypeId)} />
            </Field>
            <Field label="Proceso" htmlFor="processId" required error={fieldErrors.processId} hint="De qué proceso del SGI trata el documento.">
              <Select id="processId" value={values.processId} onChange={(e) => set("processId", e.target.value)} placeholder="Selecciona un proceso" options={processes.map((p) => ({ value: p.id, label: p.name }))} disabled={busy} invalid={Boolean(fieldErrors.processId)} />
            </Field>
            <Field
              label="Clasificación de la información"
              htmlFor="classification"
              required
              error={fieldErrors.classification}
              hint={INFO_CLASSIFICATION_DESCRIPTIONS[values.classification]}
            >
              <Select id="classification" value={values.classification} onChange={(e) => set("classification", e.target.value as InfoClassification)} options={INFO_CLASSIFICATIONS.map((c) => ({ value: c, label: INFO_CLASSIFICATION_LABELS[c] }))} disabled={busy} />
            </Field>
            <Field label="Cargo responsable" htmlFor="areaId" error={fieldErrors.areaId} hint="Quién custodia el documento. Opcional.">
              <Select id="areaId" value={values.areaId} onChange={(e) => set("areaId", e.target.value)} placeholder="Sin cargo asignado" options={areas.map((a) => ({ value: a.id, label: a.name }))} disabled={busy} invalid={Boolean(fieldErrors.areaId)} />
            </Field>
            <Field label="Etiquetas" htmlFor="tags" error={fieldErrors.tags} hint="Pulsa Enter o coma para añadir. Máximo 15." className="sm:col-span-2">
              <TagInput id="tags" value={values.tags} onChange={(t) => set("tags", t)} suggestions={tagSuggestions} disabled={busy} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Capítulo de la norma"
            description="Opcional. Sólo si quieres afinar dentro de la norma principal; el listado maestro no lo exige."
          />
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Capítulo" htmlFor="categoryId" error={fieldErrors.categoryId}>
              <Select id="categoryId" value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)} placeholder={principalStandardId ? "Sin capítulo" : "Primero elige la norma"} options={categories.map((c) => ({ value: c.id, label: c.name }))} disabled={busy || !principalStandardId} invalid={Boolean(fieldErrors.categoryId)} />
            </Field>
            <Field label="Detalle" htmlFor="subcategoryId" error={fieldErrors.subcategoryId}>
              <Select id="subcategoryId" value={values.subcategoryId} onChange={(e) => set("subcategoryId", e.target.value)} placeholder={values.categoryId ? "Sin detalle" : "Primero elige el capítulo"} options={subcategories.map((s) => ({ value: s.id, label: s.name }))} disabled={busy || !values.categoryId || subcategories.length === 0} />
            </Field>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-6">
        <Card>
          <CardHeader title="Estado y vigencia" />
          <CardContent className="space-y-4">
            <Field label="Estado" htmlFor="status" required error={fieldErrors.status} hint={DOCUMENT_STATUS_DESCRIPTIONS[values.status]}>
              <Select id="status" value={values.status} onChange={(e) => set("status", e.target.value as DocumentStatus)} options={DOCUMENT_STATUSES.map((s) => ({ value: s, label: DOCUMENT_STATUS_LABELS[s] }))} disabled={busy} />
            </Field>
            <Field label="Fecha de vigencia" htmlFor="effectiveDate" error={fieldErrors.effectiveDate}>
              <Input id="effectiveDate" type="date" value={values.effectiveDate} onChange={(e) => set("effectiveDate", e.target.value)} disabled={busy} />
            </Field>
            <Field label="Próxima revisión" htmlFor="reviewDate" error={fieldErrors.reviewDate} hint="Base para futuros recordatorios de vencimiento.">
              <Input id="reviewDate" type="date" value={values.reviewDate} onChange={(e) => set("reviewDate", e.target.value)} disabled={busy} />
            </Field>
            <Field label="Retención" htmlFor="retention" error={fieldErrors.retention} hint="Cuánto se conserva. Ej.: 3 años, Permanente.">
              <Input id="retention" value={values.retention} onChange={(e) => set("retention", e.target.value)} placeholder="Permanente" disabled={busy} />
            </Field>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <FormError message={formError} />
          <Button type="submit" size="lg" className="w-full" loading={busy} leftIcon={mode === "create" ? <Upload className="size-4" /> : <Save className="size-4" />}>
            {mode === "create" ? (progress !== null && progress < 100 ? `Subiendo ${progress}%` : "Subir documento") : "Guardar cambios"}
          </Button>
          <ButtonLink href={initial ? `/documents/${initial.id}` : "/documents"} variant="ghost" className="w-full">
            Cancelar
          </ButtonLink>
        </div>
      </aside>
    </form>
  );
}
