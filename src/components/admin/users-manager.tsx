"use client";

import { KeyRound, Pencil, RefreshCw, Search, Trash2, UserPlus, UserRoundCheck, UserRoundX } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { createUser, deleteUser, setUserActive, setUserPassword, updateUser } from "@/lib/actions/users.actions";
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
import { Tooltip } from "../ui/tooltip";

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

function generatePassword(length = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function UsersManager({ users, roles, currentUser, adminConfigured, filters }: UsersManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [q, setQ] = useState(filters.q);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserListItem | null>(null);
  const [resetting, setResetting] = useState<UserListItem | null>(null);
  const [toggling, setToggling] = useState<UserListItem | null>(null);
  const [deleting, setDeleting] = useState<UserListItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Alta
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newMode, setNewMode] = useState<"password" | "invite">("password");
  const [newPassword, setNewPassword] = useState("");
  const [newRequireChange, setNewRequireChange] = useState(true);

  // Edición
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");

  // Restablecer contraseña
  const [resetPassword, setResetPassword] = useState("");
  const [resetRequireChange, setResetRequireChange] = useState(true);

  const superAdmin = isSuperAdmin(currentUser);
  const assignableRoles = roles.filter((r) => superAdmin || r.code !== ROLES.SUPER_ADMIN);
  const canManageTarget = (u: UserListItem) => superAdmin || u.role.code !== ROLES.SUPER_ADMIN;

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

  const resetErrors = () => {
    setError(null);
    setFieldErrors({});
  };

  const openCreate = () => {
    resetErrors();
    setNewEmail("");
    setNewName("");
    setNewRole("");
    setNewMode("password");
    setNewPassword(generatePassword());
    setNewRequireChange(true);
    setCreateOpen(true);
  };

  const openEdit = (u: UserListItem) => {
    resetErrors();
    setEditing(u);
    setEditName(u.full_name);
    setEditRole(u.role_id);
  };

  const openReset = (u: UserListItem) => {
    resetErrors();
    setResetting(u);
    setResetPassword(generatePassword());
    setResetRequireChange(u.id !== currentUser.id);
  };

  const submitCreate = () => {
    resetErrors();
    startTransition(async () => {
      const result = await createUser({
        email: newEmail,
        fullName: newName,
        roleId: newRole,
        mode: newMode,
        password: newMode === "password" ? newPassword : "",
        requirePasswordChange: newRequireChange,
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      toast.success(
        result.data.invited ? "Invitación enviada" : "Usuario creado",
        result.data.invited
          ? `${newEmail} recibirá un email para establecer su contraseña.`
          : newRequireChange
            ? `${newEmail} deberá cambiar la contraseña temporal en su primer acceso.`
            : `${newEmail} ya puede iniciar sesión.`,
      );
      setCreateOpen(false);
      router.refresh();
    });
  };

  const submitEdit = () => {
    if (!editing) return;
    resetErrors();
    startTransition(async () => {
      const result = await updateUser({ id: editing.id, fullName: editName, roleId: editRole });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      toast.success("Usuario actualizado");
      setEditing(null);
      router.refresh();
    });
  };

  const submitReset = () => {
    if (!resetting) return;
    resetErrors();
    startTransition(async () => {
      const result = await setUserPassword({ id: resetting.id, password: resetPassword, requirePasswordChange: resetRequireChange });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      toast.success(
        "Contraseña restablecida",
        result.data.requirePasswordChange
          ? `${resetting.email} deberá cambiarla en su próximo inicio de sesión.`
          : `${resetting.email} puede usar la nueva contraseña de inmediato.`,
      );
      setResetting(null);
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

  const submitDelete = () => {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteUser({ id: deleting.id });
      if (!result.ok) {
        toast.error("No se pudo eliminar", result.error);
        return;
      }
      toast.success("Usuario eliminado", `${deleting.email} ya no puede acceder. Sus documentos se conservan.`);
      setDeleting(null);
      router.refresh();
    });
  };

  const actionButtons = (u: UserListItem) => {
    const self = u.id === currentUser.id;
    const manageable = canManageTarget(u);
    return (
      <>
        <Tooltip content="Editar nombre y rol">
          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(u)} disabled={!manageable} aria-label="Editar">
            <Pencil className="size-4" />
          </Button>
        </Tooltip>
        <Tooltip content="Restablecer contraseña">
          <Button variant="ghost" size="icon-sm" onClick={() => openReset(u)} disabled={!manageable || !adminConfigured} aria-label="Restablecer contraseña">
            <KeyRound className="size-4" />
          </Button>
        </Tooltip>
        <Tooltip content={u.is_active ? "Desactivar" : "Activar"}>
          <Button variant="ghost" size="icon-sm" onClick={() => setToggling(u)} disabled={self || !manageable} aria-label={u.is_active ? "Desactivar" : "Activar"}>
            {u.is_active ? <UserRoundX className="size-4 text-warning" /> : <UserRoundCheck className="size-4 text-success" />}
          </Button>
        </Tooltip>
        <Tooltip content="Eliminar">
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(u)} disabled={self || !manageable || !adminConfigured} aria-label="Eliminar">
            <Trash2 className="size-4 text-danger" />
          </Button>
        </Tooltip>
      </>
    );
  };

  const statusBadges = (u: UserListItem) => (
    <div className="flex flex-wrap gap-1.5">
      {u.is_active ? <Badge tone="success" size="sm">Activo</Badge> : <Badge tone="danger" size="sm">Desactivado</Badge>}
      {u.must_change_password ? <Badge tone="warning" size="sm">Debe cambiar contraseña</Badge> : null}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o email…" className="pl-9" aria-label="Buscar usuarios" />
        </div>
        <Select aria-label="Filtrar por rol" value={filters.roleId} onChange={(e) => updateUrl({ role: e.target.value })} placeholder="Todos los roles" options={roles.map((r) => ({ value: r.id, label: r.name }))} className="sm:w-52" />
        <Select aria-label="Filtrar por estado" value={filters.active} onChange={(e) => updateUrl({ active: e.target.value })} placeholder="Todos los estados" options={[{ value: "true", label: "Activos" }, { value: "false", label: "Desactivados" }]} className="sm:w-44" />
        <Button onClick={openCreate} leftIcon={<UserPlus className="size-4" />} disabled={!adminConfigured}>
          Nuevo usuario
        </Button>
      </div>

      {!adminConfigured ? (
        <p className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning">
          Crear, eliminar y restablecer contraseñas requiere la variable de servidor <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code>.
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
                          <p className="truncate font-medium text-fg">
                            {u.full_name || "—"}
                            {u.id === currentUser.id ? <span className="ml-2 text-xs text-fg-subtle">(tú)</span> : null}
                          </p>
                          <p className="truncate text-xs text-fg-subtle">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge tone={ROLE_TONE[u.role.code] ?? "neutral"}>{u.role.name}</Badge></TableCell>
                    <TableCell>{statusBadges(u)}</TableCell>
                    <TableCell className="text-fg-muted">
                      {u.last_sign_in_at ? <span title={formatDateTime(u.last_sign_in_at)}>{formatRelative(u.last_sign_in_at)}</span> : <span className="text-fg-subtle">Nunca</span>}
                    </TableCell>
                    <TableCell className="text-fg-muted">{formatDateTime(u.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-0.5">{actionButtons(u)}</div>
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
                      {statusBadges(u)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-0.5 border-t border-border pt-2">{actionButtons(u)}</div>
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
        description="Asigna una contraseña temporal o envía una invitación por email."
        locked={pending}
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={pending}>Cancelar</Button>
            <Button onClick={submitCreate} loading={pending} disabled={!newEmail || !newName || !newRole || (newMode === "password" && newPassword.length < 8)}>
              Crear usuario
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormError message={error} />
          <Field label="Email" htmlFor="newEmail" required error={fieldErrors.email}>
            <Input id="newEmail" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="nombre@empresa.com" disabled={pending} />
          </Field>
          <Field label="Nombre completo" htmlFor="newName" required error={fieldErrors.fullName}>
            <Input id="newName" value={newName} onChange={(e) => setNewName(e.target.value)} disabled={pending} />
          </Field>
          <Field label="Rol" htmlFor="newRole" required error={fieldErrors.roleId} hint={assignableRoles.find((r) => r.id === newRole)?.description ?? undefined}>
            <Select id="newRole" value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="Selecciona un rol" options={assignableRoles.map((r) => ({ value: r.id, label: r.name }))} disabled={pending} />
          </Field>

          <div className="rounded-lg border border-border bg-surface-2/50 p-3">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Modo de alta">
              {(["password", "invite"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={newMode === m}
                  onClick={() => setNewMode(m)}
                  disabled={pending}
                  className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${newMode === m ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-fg-muted hover:text-fg"}`}
                >
                  <span className="block font-medium">{m === "password" ? "Asignar contraseña" : "Enviar invitación"}</span>
                  <span className="block opacity-80">{m === "password" ? "Tú defines la contraseña inicial." : "El usuario la define desde un enlace por email."}</span>
                </button>
              ))}
            </div>

            {newMode === "password" ? (
              <div className="mt-3 space-y-3">
                <Field label="Contraseña temporal" htmlFor="newPassword" required error={fieldErrors.password} hint="Mínimo 8 caracteres. Comunícala por un canal seguro.">
                  <div className="flex gap-2">
                    <Input id="newPassword" type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="font-mono" disabled={pending} />
                    <Tooltip content="Generar otra">
                      <Button type="button" variant="outline" size="icon" onClick={() => setNewPassword(generatePassword())} disabled={pending} aria-label="Generar contraseña">
                        <RefreshCw className="size-4" />
                      </Button>
                    </Tooltip>
                  </div>
                </Field>
                <Switch
                  checked={newRequireChange}
                  onCheckedChange={setNewRequireChange}
                  disabled={pending}
                  label="Solicitar cambio de contraseña"
                  description="Al iniciar sesión por primera vez, el usuario deberá definir una contraseña nueva antes de usar la aplicación."
                />
              </div>
            ) : null}
          </div>
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
          <Field label="Nombre completo" htmlFor="editName" required error={fieldErrors.fullName}>
            <Input id="editName" value={editName} onChange={(e) => setEditName(e.target.value)} disabled={pending} />
          </Field>
          <Field label="Rol" htmlFor="editRole" required error={fieldErrors.roleId} hint={editing?.id === currentUser.id ? "No puedes cambiar tu propio rol." : undefined}>
            <Select id="editRole" value={editRole} onChange={(e) => setEditRole(e.target.value)} options={assignableRoles.map((r) => ({ value: r.id, label: r.name }))} disabled={pending || editing?.id === currentUser.id} />
          </Field>
        </div>
      </Dialog>

      {/* Restablecer contraseña */}
      <Dialog
        open={Boolean(resetting)}
        onClose={() => setResetting(null)}
        title="Restablecer contraseña"
        description={resetting?.email}
        size="sm"
        locked={pending}
        footer={
          <>
            <Button variant="outline" onClick={() => setResetting(null)} disabled={pending}>Cancelar</Button>
            <Button onClick={submitReset} loading={pending} disabled={resetPassword.length < 8}>Guardar contraseña</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormError message={error} />
          <Field label="Nueva contraseña" htmlFor="resetPassword" required error={fieldErrors.password} hint="Mínimo 8 caracteres. Comunícala por un canal seguro.">
            <div className="flex gap-2">
              <Input id="resetPassword" type="text" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} className="font-mono" disabled={pending} />
              <Tooltip content="Generar otra">
                <Button type="button" variant="outline" size="icon" onClick={() => setResetPassword(generatePassword())} disabled={pending} aria-label="Generar contraseña">
                  <RefreshCw className="size-4" />
                </Button>
              </Tooltip>
            </div>
          </Field>
          {resetting?.id !== currentUser.id ? (
            <Switch
              checked={resetRequireChange}
              onCheckedChange={setResetRequireChange}
              disabled={pending}
              label="Solicitar cambio de contraseña"
              description="El usuario deberá definir una contraseña nueva en su próximo inicio de sesión."
            />
          ) : (
            <p className="text-xs text-fg-subtle">Estás cambiando tu propia contraseña: se aplicará de inmediato.</p>
          )}
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

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={submitDelete}
        loading={pending}
        destructive
        title="Eliminar usuario"
        description={
          <>
            Se eliminará definitivamente la cuenta de <span className="font-medium text-fg">{deleting?.full_name || deleting?.email}</span>.
            Los documentos que creó se conservan (autor “Usuario eliminado”) y la acción queda en auditoría. Si solo quieres bloquear el acceso, usa “Desactivar”.
          </>
        }
        confirmLabel="Eliminar definitivamente"
      />
    </div>
  );
}
