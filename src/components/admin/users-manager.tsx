"use client";

import { Pencil, Search, UserPlus, UserRoundCheck, UserRoundX } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { createUser, setUserActive, updateUser } from "@/lib/actions/users.actions";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { ROLES } from "@/lib/constants/permissions";
import { formatDateTime, formatRelative } from "@/lib/utils/format";
import type { CurrentUser, Role, UserListItem } from "@/types";

import { useToast } from "../providers/toast-provider";
import { Avatar } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ConfirmDialog, Dialog } from "../ui/dialog";
import { Field, FormError } from "../ui/field";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { EmptyState } from "../ui/states";
import { Switch } from "../ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

interface UsersManagerProps {
  users: UserListItem[];
  roles: Role[];
  currentUser: CurrentUser;
  adminConfigured: boolean;
  filters: { q: string; roleId: string; active: string };
}

const ROLE_TONE: Record<string, "primary" | "info" | "success" | "neutral"> = {
  SUPER_ADMIN: "primary",
  ADMIN: "info",
  CONSULTOR: "success",
  VISUALIZADOR: "neutral",
};

export function UsersManager({ users, roles, currentUser, adminConfigured, filters }: UsersManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [q, setQ] = useState(filters.q);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserListItem | null>(null);
  const [toggling, setToggling] = useState<UserListItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Formulario de alta
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [withPassword, setWithPassword] = useState(false);

  // Formulario de edición
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");

  const superAdmin = isSuperAdmin(currentUser);
  const assignableRoles = roles.filter((r) => superAdmin || r.code !== ROLES.SUPER_ADMIN);

  const updateUrl = (patch: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (q === filters.q) return;
    const t = window.setTimeout(() => updateUrl({ q }), 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const openEdit = (u: UserListItem) => {
    setEditing(u);
    setEditName(u.full_name);
    setEditRole(u.role_id);
    setError(null);
  };

  const submitCreate = () => {
    setError(null);
    startTransition(async () => {
      const result = await createUser({
        email: newEmail,
        fullName: newName,
        roleId: newRole,
        password: withPassword ? newPassword : "",
        sendInvite: !withPassword,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(
        result.data.invited ? "Invitación enviada" : "Usuario creado",
        result.data.invited ? `${newEmail} recibirá un email para establecer su contraseña.` : `${newEmail} ya puede iniciar sesión.`,
      );
      setCreateOpen(false);
      setNewEmail("");
      setNewName("");
      setNewRole("");
      setNewPassword("");
      setWithPassword(false);
      router.refresh();
    });
  };

  const submitEdit = () => {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const result = await updateUser({ id: editing.id, fullName: editName, roleId: editRole });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Usuario actualizado");
      setEditing(null);
      router.refresh();
    });
  };

  const submitToggle = () => {
    if (!toggling) return;
    startTransition(async () => {
      const result = await setUserActive({ id: toggling.id, isActive: !toggling.is_active });
      if (!result.ok) {
        toast.error("No se pudo cambiar el estado", result.error);
        return;
      }
      toast.success(toggling.is_active ? "Usuario desactivado" : "Usuario activado");
      setToggling(null);
      router.refresh();
    });
  };

  const canManageTarget = (u: UserListItem) => superAdmin || u.role.code !== ROLES.SUPER_ADMIN;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o email…" className="pl-9" aria-label="Buscar usuarios" />
        </div>
        <Select aria-label="Filtrar por rol" value={filters.roleId} onChange={(e) => updateUrl({ role: e.target.value })} placeholder="Todos los roles" options={roles.map((r) => ({ value: r.id, label: r.name }))} className="sm:w-52" />
        <Select aria-label="Filtrar por estado" value={filters.active} onChange={(e) => updateUrl({ active: e.target.value })} placeholder="Todos los estados" options={[{ value: "true", label: "Activos" }, { value: "false", label: "Desactivados" }]} className="sm:w-44" />
        <Button onClick={() => { setCreateOpen(true); setError(null); }} leftIcon={<UserPlus className="size-4" />} disabled={!adminConfigured} title={!adminConfigured ? "Configura SUPABASE_SERVICE_ROLE_KEY para habilitar el alta de usuarios" : undefined}>
          Nuevo usuario
        </Button>
      </div>

      {!adminConfigured ? (
        <p className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning">
          El alta de usuarios desde la interfaz requiere la variable de servidor <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code>. Mientras tanto puedes crear usuarios desde el panel de Supabase o con <code className="font-mono">npm run seed:admin</code>.
        </p>
      ) : null}

      {users.length === 0 ? (
        <EmptyState title="No hay usuarios que coincidan" description="Ajusta la búsqueda o los filtros." />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-surface md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último acceso</TableHead>
                  <TableHead>Alta</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar name={u.full_name || u.email} src={u.avatar_url} size="md" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-fg">{u.full_name || "—"}{u.id === currentUser.id ? <span className="ml-2 text-xs text-fg-subtle">(tú)</span> : null}</p>
                          <p className="truncate text-xs text-fg-subtle">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge tone={ROLE_TONE[u.role.code] ?? "neutral"}>{u.role.name}</Badge></TableCell>
                    <TableCell>{u.is_active ? <Badge tone="success" size="sm">Activo</Badge> : <Badge tone="danger" size="sm">Desactivado</Badge>}</TableCell>
                    <TableCell className="text-fg-muted">{u.last_sign_in_at ? <span title={formatDateTime(u.last_sign_in_at)}>{formatRelative(u.last_sign_in_at)}</span> : <span className="text-fg-subtle">Nunca</span>}</TableCell>
                    <TableCell className="text-fg-muted">{formatDateTime(u.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(u)} disabled={!canManageTarget(u)} aria-label="Editar"><Pencil className="size-4" /></Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setToggling(u)} disabled={u.id === currentUser.id || !canManageTarget(u)} aria-label={u.is_active ? "Desactivar" : "Activar"}>
                          {u.is_active ? <UserRoundX className="size-4 text-danger" /> : <UserRoundCheck className="size-4 text-success" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="space-y-2 md:hidden">
            {users.map((u) => (
              <li key={u.id} className="rounded-xl border border-border bg-surface p-3.5">
                <div className="flex items-start gap-3">
                  <Avatar name={u.full_name || u.email} src={u.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{u.full_name || "—"}</p>
                    <p className="truncate text-xs text-fg-subtle">{u.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone={ROLE_TONE[u.role.code] ?? "neutral"} size="sm">{u.role.name}</Badge>
                      {u.is_active ? <Badge tone="success" size="sm">Activo</Badge> : <Badge tone="danger" size="sm">Desactivado</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(u)} disabled={!canManageTarget(u)} aria-label="Editar"><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setToggling(u)} disabled={u.id === currentUser.id || !canManageTarget(u)} aria-label={u.is_active ? "Desactivar" : "Activar"}>
                      {u.is_active ? <UserRoundX className="size-4 text-danger" /> : <UserRoundCheck className="size-4 text-success" />}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Alta */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nuevo usuario"
        description="Por defecto se envía una invitación por email para que el usuario establezca su contraseña."
        locked={pending}
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={pending}>Cancelar</Button>
            <Button onClick={submitCreate} loading={pending} disabled={!newEmail || !newName || !newRole || (withPassword && newPassword.length < 8)}>Crear usuario</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormError message={error} />
          <Field label="Email" htmlFor="newEmail" required><Input id="newEmail" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="nombre@empresa.com" disabled={pending} /></Field>
          <Field label="Nombre completo" htmlFor="newName" required><Input id="newName" value={newName} onChange={(e) => setNewName(e.target.value)} disabled={pending} /></Field>
          <Field label="Rol" htmlFor="newRole" required hint={assignableRoles.find((r) => r.id === newRole)?.description ?? undefined}>
            <Select id="newRole" value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="Selecciona un rol" options={assignableRoles.map((r) => ({ value: r.id, label: r.name }))} disabled={pending} />
          </Field>
          <Switch checked={withPassword} onCheckedChange={setWithPassword} disabled={pending} label="Definir contraseña ahora" description="En lugar de enviar invitación, la cuenta queda confirmada con la contraseña indicada." />
          {withPassword ? (
            <Field label="Contraseña temporal" htmlFor="newPassword" required hint="Mínimo 8 caracteres. Comunícala por un canal seguro.">
              <Input id="newPassword" type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="font-mono" disabled={pending} />
            </Field>
          ) : null}
        </div>
      </Dialog>

      {/* Edición */}
      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Editar usuario"
        description={editing?.email}
        locked={pending}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={pending}>Cancelar</Button>
            <Button onClick={submitEdit} loading={pending} disabled={!editName || !editRole}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormError message={error} />
          <Field label="Nombre completo" htmlFor="editName" required><Input id="editName" value={editName} onChange={(e) => setEditName(e.target.value)} disabled={pending} /></Field>
          <Field label="Rol" htmlFor="editRole" required hint={editing?.id === currentUser.id ? "No puedes cambiar tu propio rol." : undefined}>
            <Select id="editRole" value={editRole} onChange={(e) => setEditRole(e.target.value)} options={assignableRoles.map((r) => ({ value: r.id, label: r.name }))} disabled={pending || editing?.id === currentUser.id} />
          </Field>
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(toggling)}
        onClose={() => setToggling(null)}
        onConfirm={submitToggle}
        loading={pending}
        destructive={toggling?.is_active}
        title={toggling?.is_active ? "Desactivar usuario" : "Activar usuario"}
        description={
          toggling?.is_active
            ? `${toggling.full_name || toggling.email} perderá el acceso inmediatamente. Sus documentos y su historial se conservan.`
            : `${toggling?.full_name || toggling?.email} recuperará el acceso con su rol actual.`
        }
        confirmLabel={toggling?.is_active ? "Desactivar" : "Activar"}
      />
    </div>
  );
}
