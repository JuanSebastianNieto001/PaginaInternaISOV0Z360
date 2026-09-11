"use client";

import { ChevronDown, LogOut, Settings, ShieldCheck } from "lucide-react";
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
      triggerClassName="gap-2 rounded-md px-1.5 py-1 hover:bg-surface-2"
      trigger={
        <>
          <Avatar name={user.fullName || user.email} src={user.avatarUrl} size="sm" />
          <span className="hidden max-w-32 truncate text-sm font-medium text-fg md:block">
            {user.fullName || user.email}
          </span>
          <ChevronDown className="hidden size-3.5 text-fg-subtle md:block" />
        </>
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
