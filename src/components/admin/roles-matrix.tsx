"use client";

import { Check, Lock, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { setRolePermissions } from "@/lib/actions/roles.actions";
import { PERMISSIONS, ROLES } from "@/lib/constants/permissions";
import { PERMISSION_MODULE_LABELS } from "@/lib/services/roles.service";
import { cn } from "@/lib/utils/cn";
import type { Permission, RoleWithPermissions } from "@/types";

import { useToast } from "../providers/toast-provider";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export function RolesMatrix({ roles, permissions }: { roles: RoleWithPermissions[]; permissions: Permission[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [savingRole, setSavingRole] = useState<string | null>(null);

  const initial = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const r of roles) map[r.id] = new Set(r.permissions.map((p) => p.id));
    return map;
  }, [roles]);

  const [state, setState] = useState<Record<string, Set<string>>>(() => {
    const copy: Record<string, Set<string>> = {};
    for (const [k, v] of Object.entries(initial)) copy[k] = new Set(v);
    return copy;
  });

  const readPermissionId = permissions.find((p) => p.code === PERMISSIONS.DOCUMENTS_READ)?.id;

  const grouped = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const p of permissions) {
      const list = groups.get(p.module) ?? [];
      list.push(p);
      groups.set(p.module, list);
    }
    return Array.from(groups.entries());
  }, [permissions]);

  const isDirty = (roleId: string) => {
    const a = initial[roleId] ?? new Set<string>();
    const b = state[roleId] ?? new Set<string>();
    if (a.size !== b.size) return true;
    for (const id of a) if (!b.has(id)) return true;
    return false;
  };

  const toggle = (roleId: string, permissionId: string) => {
    setState((prev) => {
      const next = new Set(prev[roleId] ?? []);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return { ...prev, [roleId]: next };
    });
  };

  const save = (roleId: string) => {
    setSavingRole(roleId);
    startTransition(async () => {
      const result = await setRolePermissions({ roleId, permissionIds: Array.from(state[roleId] ?? []) });
      setSavingRole(null);
      if (!result.ok) {
        toast.error("No se pudieron guardar los permisos", result.error);
        return;
      }
      toast.success("Permisos actualizados", "Los usuarios verán los cambios en su próxima navegación.");
      router.refresh();
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 z-10 bg-surface px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-fg-subtle">Permiso</th>
              {roles.map((r) => (
                <th key={r.id} className="px-3 py-3 text-center align-top">
                  <div className="flex flex-col items-center gap-1.5">
                    <Badge tone={r.code === ROLES.SUPER_ADMIN ? "primary" : "outline"}>{r.name}</Badge>
                    <span className="font-mono text-[10px] text-fg-subtle">{r.code}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map(([module, perms]) => (
              <>
                <tr key={`m-${module}`} className="bg-surface-2/60">
                  <td colSpan={roles.length + 1} className="sticky left-0 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
                    {PERMISSION_MODULE_LABELS[module] ?? module}
                  </td>
                </tr>
                {perms.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="sticky left-0 z-10 bg-surface px-4 py-2.5">
                      <p className="font-medium text-fg">{p.name}</p>
                      <p className="text-xs text-fg-subtle">{p.description}</p>
                      <p className="font-mono text-[10px] text-fg-subtle">{p.code}</p>
                    </td>
                    {roles.map((r) => {
                      const locked = r.code === ROLES.SUPER_ADMIN || (p.id === readPermissionId);
                      const checked = r.code === ROLES.SUPER_ADMIN ? true : (state[r.id]?.has(p.id) ?? false);
                      return (
                        <td key={r.id} className="px-3 py-2.5 text-center">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            aria-label={`${p.name} para ${r.name}`}
                            disabled={locked || pending}
                            onClick={() => toggle(r.id, p.id)}
                            className={cn(
                              "inline-flex size-6 items-center justify-center rounded-md border transition-colors",
                              checked ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface hover:border-border-strong",
                              locked && "cursor-not-allowed opacity-70",
                            )}
                          >
                            {checked ? <Check className="size-3.5" /> : locked ? <Lock className="size-3 text-fg-subtle" /> : null}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-surface-2/40">
              <td className="sticky left-0 bg-surface-2/40 px-4 py-3 text-xs text-fg-subtle">
                SUPER_ADMIN siempre tiene todos los permisos. “Consultar documentos” es obligatorio para todos los roles.
              </td>
              {roles.map((r) => (
                <td key={r.id} className="px-3 py-3 text-center">
                  {r.code !== ROLES.SUPER_ADMIN ? (
                    <Button size="sm" variant={isDirty(r.id) ? "primary" : "outline"} disabled={!isDirty(r.id) || pending} loading={savingRole === r.id} onClick={() => save(r.id)} leftIcon={<Save className="size-3.5" />}>
                      Guardar
                    </Button>
                  ) : null}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
