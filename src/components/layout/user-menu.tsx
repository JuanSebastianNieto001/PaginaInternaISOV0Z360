"use client";

import { LogOut, Settings, ShieldCheck } from "lucide-react";
import { useTransition } from "react";

import { signOut } from "@/lib/actions/auth.actions";
import { canAny } from "@/lib/auth/permissions";
import { ADMIN_AREA_PERMISSIONS } from "@/lib/constants/permissions";
import type { CurrentUser } from "@/types";

import { Avatar } from "../ui/avatar";
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from "../ui/dropdown";

export function UserMenu({ user }: { user: CurrentUser }) {
  const [pending, startTransition] = useTransition();

  return (
    <Dropdown
      align="end"
      triggerClassName="rounded-full"
      trigger={
        <Avatar name={user.fullName || user.email} src={user.avatarUrl} size="md" tone="brand" />
      }
    >
      <DropdownLabel>
        <span className="block truncate text-xs font-medium text-fg">{user.fullName || "Usuario"}</span>
        <span className="block truncate text-[11px] text-fg-subtle">{user.email}</span>
        <span className="mt-1 inline-block rounded bg-primary-soft px-1.5 py-px text-[10px] font-semibold text-primary">
          {user.role.name}
        </span>
      </DropdownLabel>
      <DropdownSeparator />
      <DropdownItem href="/settings" icon={<Settings className="size-4 text-fg-subtle" />}>
        Configuración
      </DropdownItem>
      {canAny(user, ADMIN_AREA_PERMISSIONS) ? (
        <DropdownItem href="/admin" icon={<ShieldCheck className="size-4 text-fg-subtle" />}>
          Administración
        </DropdownItem>
      ) : null}
      <DropdownSeparator />
      <DropdownItem
        destructive
        disabled={pending}
        icon={<LogOut className="size-4" />}
        onClick={() => startTransition(() => void signOut())}
      >
        {pending ? "Cerrando sesión…" : "Cerrar sesión"}
      </DropdownItem>
    </Dropdown>
  );
}
