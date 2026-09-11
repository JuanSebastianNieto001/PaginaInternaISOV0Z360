import type { AuditLogItem, Json } from "@/types";

/** Lee un valor de texto del campo `metadata` de un registro de auditoría. */
export function auditMetaValue(metadata: Json, key: string): string | undefined {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) return undefined;
  const value = metadata[key];
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : undefined;
}

/** Nombre de la entidad afectada ("Manual de Calidad"). */
export function auditEntityName(log: AuditLogItem): string | undefined {
  return (
    auditMetaValue(log.metadata, "name") ??
    auditMetaValue(log.metadata, "full_name") ??
    auditMetaValue(log.metadata, "email")
  );
}

/** Etiqueta completa con código cuando existe ("MAN-CA-001 · Manual de Calidad"). */
export function auditEntityLabel(log: AuditLogItem): string | undefined {
  const name = auditEntityName(log);
  const code = auditMetaValue(log.metadata, "code");
  if (name && code) return `${code} · ${name}`;
  return name ?? code;
}

/** Enlace a la entidad afectada, si sigue existiendo. */
export function auditEntityHref(log: AuditLogItem): string | undefined {
  if (!log.entity_id) return undefined;
  if (log.entity_type === "document" && !log.action.endsWith(".deleted")) return `/documents/${log.entity_id}`;
  if (log.entity_type === "user") {
    return `/admin/users?q=${encodeURIComponent(auditMetaValue(log.metadata, "email") ?? "")}`;
  }
  return undefined;
}
