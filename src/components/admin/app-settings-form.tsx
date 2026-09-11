"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateAppSettings } from "@/lib/actions/settings.actions";
import { DOCUMENT_STATUSES, DOCUMENT_STATUS_LABELS } from "@/lib/constants/documents";
import { HARD_MAX_FILE_SIZE_MB } from "@/lib/validation/settings";
import type { AppSettings, DocumentStatus } from "@/types";

import { useToast } from "../providers/toast-provider";
import { Button } from "../ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { Field, FormError } from "../ui/field";
import { Input, Textarea } from "../ui/input";
import { Select } from "../ui/select";

export function AppSettingsForm({ settings }: { settings: AppSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [orgName, setOrgName] = useState(settings.org_name);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(String(settings.max_file_size_mb));
  const [allowedExtensions, setAllowedExtensions] = useState(settings.allowed_extensions.join(", "));
  const [defaultStatus, setDefaultStatus] = useState<DocumentStatus>(settings.default_status);
  const [recentLimit, setRecentLimit] = useState(String(settings.recent_limit));

  const submit = () => {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await updateAppSettings({ orgName, maxFileSizeMb, allowedExtensions, defaultStatus, recentLimit });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      toast.success("Configuración guardada");
      router.refresh();
    });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Organización" description="Identidad mostrada en la barra lateral y en los correos." />
        <CardContent className="space-y-4">
          <Field label="Nombre de la organización" htmlFor="orgName" required error={fieldErrors.orgName}>
            <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} disabled={pending} />
          </Field>
          <Field label="Estado por defecto al subir" htmlFor="defaultStatus" error={fieldErrors.defaultStatus}>
            <Select id="defaultStatus" value={defaultStatus} onChange={(e) => setDefaultStatus(e.target.value as DocumentStatus)} options={DOCUMENT_STATUSES.map((s) => ({ value: s, label: DOCUMENT_STATUS_LABELS[s] }))} disabled={pending} />
          </Field>
          <Field label="Documentos en Recientes" htmlFor="recentLimit" error={fieldErrors.recentLimit} hint="Entre 5 y 100.">
            <Input id="recentLimit" type="number" min={5} max={100} value={recentLimit} onChange={(e) => setRecentLimit(e.target.value)} disabled={pending} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Archivos" description="Restricciones aplicadas en la subida (cliente y servidor)." />
        <CardContent className="space-y-4">
          <Field label="Tamaño máximo por archivo (MB)" htmlFor="maxFileSizeMb" required error={fieldErrors.maxFileSizeMb} hint={`Techo del bucket de Storage: ${HARD_MAX_FILE_SIZE_MB} MB.`}>
            <Input id="maxFileSizeMb" type="number" min={1} max={HARD_MAX_FILE_SIZE_MB} value={maxFileSizeMb} onChange={(e) => setMaxFileSizeMb(e.target.value)} disabled={pending} />
          </Field>
          <Field label="Extensiones permitidas" htmlFor="allowedExtensions" required error={fieldErrors.allowedExtensions} hint="Separadas por comas. Deben estar también en allowed_mime_types del bucket (ver 003_storage.sql).">
            <Textarea id="allowedExtensions" rows={3} value={allowedExtensions} onChange={(e) => setAllowedExtensions(e.target.value)} className="font-mono text-xs" disabled={pending} />
          </Field>
        </CardContent>
        <CardFooter>
          <FormError message={error} />
          <Button type="submit" loading={pending} leftIcon={<Save className="size-4" />}>Guardar configuración</Button>
        </CardFooter>
      </Card>
    </form>
  );
}
