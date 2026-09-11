"use client";

import { GitBranchPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createDocumentVersion } from "@/lib/actions/documents.actions";
import { DOCUMENT_STATUSES, DOCUMENT_STATUS_LABELS, suggestNextVersion } from "@/lib/constants/documents";
import { removeUploadedFile, uploadFileWithProgress } from "@/lib/storage/upload";
import { buildStoragePath, getExtension, guessMimeType } from "@/lib/utils/files";
import { createVersionSchema } from "@/lib/validation/documents";
import type { DocumentStatus } from "@/types";

import { useToast } from "../providers/toast-provider";
import { Button, ButtonLink } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Field, FormError } from "../ui/field";
import { Input, Textarea } from "../ui/input";
import { Select } from "../ui/select";
import { FileDropzone, validateFile } from "./file-dropzone";

export interface NewVersionFormProps {
  document: { id: string; name: string; code: string; version: string; status: DocumentStatus };
  settings: { maxFileSizeMb: number; allowedExtensions: string[] };
}

export function NewVersionForm({ document: doc, settings }: NewVersionFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [version, setVersion] = useState(suggestNextVersion(doc.version, "minor"));
  const [status, setStatus] = useState<DocumentStatus>(doc.status === "approved" ? "review" : doc.status);
  const [changeSummary, setChangeSummary] = useState("");

  const busy = pending || (progress !== null && progress < 100);

  const onFileChange = (f: File | null) => {
    setFile(f);
    setFileError(f ? validateFile(f, settings.allowedExtensions, settings.maxFileSizeMb) : null);
    setProgress(null);
  };

  const submit = () => {
    setFormError(null);
    setFieldErrors({});
    if (!file) {
      setFileError("Selecciona el archivo de la nueva versión.");
      return;
    }
    const fe = validateFile(file, settings.allowedExtensions, settings.maxFileSizeMb);
    if (fe) {
      setFileError(fe);
      return;
    }

    const extension = getExtension(file.name);
    const path = buildStoragePath(doc.id, version, extension);
    const payload = {
      documentId: doc.id,
      version,
      status,
      changeSummary,
      file: { path, name: file.name, extension, size: file.size, mimeType: file.type || guessMimeType(file.name) },
    };
    const parsed = createVersionSchema.safeParse(payload);
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
      const result = await createDocumentVersion(parsed.data);
      if (!result.ok) {
        await removeUploadedFile(path).catch(() => undefined);
        setProgress(null);
        setFormError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }
      toast.success("Nueva versión publicada", `${doc.code} ahora está en v${result.data.version}.`);
      router.push(`/documents/${doc.id}`);
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
        <Card>
          <CardHeader title="Archivo de la nueva versión" description="La versión anterior se conserva íntegra en el historial." />
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
        <Card>
          <CardHeader title="Resumen del cambio" description="Describe qué cambia respecto a la versión anterior. Quedará en el historial." />
          <CardContent>
            <Field htmlFor="changeSummary" required error={fieldErrors.changeSummary}>
              <Textarea id="changeSummary" value={changeSummary} onChange={(e) => setChangeSummary(e.target.value)} placeholder="Ej.: Actualización del apartado 5.2 tras la auditoría interna de junio." disabled={busy} invalid={Boolean(fieldErrors.changeSummary)} />
            </Field>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-6">
        <Card>
          <CardHeader title="Numeración y estado" />
          <CardContent className="space-y-4">
            <div className="rounded-md bg-surface-2 px-3 py-2 text-xs text-fg-muted">
              Versión actual: <span className="font-mono font-semibold text-fg">v{doc.version}</span>
            </div>
            <Field label="Nueva versión" htmlFor="version" required error={fieldErrors.version}>
              <div className="flex gap-2">
                <Input id="version" value={version} onChange={(e) => setVersion(e.target.value)} className="font-mono" disabled={busy} invalid={Boolean(fieldErrors.version)} />
                <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" onClick={() => setVersion(suggestNextVersion(doc.version, "major"))} disabled={busy}>
                  Mayor
                </Button>
              </div>
            </Field>
            <Field label="Estado de la nueva versión" htmlFor="status" required>
              <Select id="status" value={status} onChange={(e) => setStatus(e.target.value as DocumentStatus)} options={DOCUMENT_STATUSES.map((s) => ({ value: s, label: DOCUMENT_STATUS_LABELS[s] }))} disabled={busy} />
            </Field>
          </CardContent>
        </Card>
        <div className="space-y-3">
          <FormError message={formError} />
          <Button type="submit" size="lg" className="w-full" loading={busy} leftIcon={<GitBranchPlus className="size-4" />}>
            {progress !== null && progress < 100 ? `Subiendo ${progress}%` : "Publicar versión"}
          </Button>
          <ButtonLink href={`/documents/${doc.id}`} variant="ghost" className="w-full">
            Cancelar
          </ButtonLink>
        </div>
      </aside>
    </form>
  );
}
