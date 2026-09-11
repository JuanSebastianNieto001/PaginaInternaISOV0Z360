"use client";

import { ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { canAny } from "@/lib/auth/permissions";
import { MAIN_NAV, SYSTEM_NAV, isNavActive, type NavItem } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils/cn";
import type { CurrentUser } from "@/types";

import { Button } from "../ui/button";

interface SidebarProps {
  user: CurrentUser;
  orgName: string;
  mobileOpen: boolean;
  onClose: () => void;
}

function NavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate: () => void }) {
  const active = isNavActive(pathname, item);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary-soft text-primary"
          : "text-fg-muted hover:bg-surface-2 hover:text-fg",
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-fg-subtle group-hover:text-fg")} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function SidebarContent({ user, orgName, pathname, onNavigate }: Omit<SidebarProps, "mobileOpen" | "onClose"> & { pathname: string; onNavigate: () => void }) {
  const mainItems = MAIN_NAV.filter((i) => canAny(user, i.anyPermission));
  const systemItems = SYSTEM_NAV.filter((i) => canAny(user, i.anyPermission));

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-fg">
          <ShieldCheck className="size-4.5" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-fg">{orgName}</p>
          <p className="truncate text-[11px] text-fg-subtle">Gestión documental</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Principal">
        <div>
          <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
            Repositorio
          </p>
          <div className="space-y-0.5">
            {mainItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
            Sistema
          </p>
          <div className="space-y-0.5">
            {systemItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      </nav>

      <div className="border-t border-border px-4 py-3">
        <p className="truncate text-xs font-medium text-fg">{user.fullName || user.email}</p>
        <p className="truncate text-[11px] text-fg-subtle">{user.role.name}</p>
      </div>
    </div>
  );
}

export function Sidebar({ user, orgName, mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  // Cierra el drawer al cambiar de ruta y bloquea el scroll del body mientras esté abierto.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen, onClose]);

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:fixed lg:inset-y-0 lg:left-0 lg:block">
        <SidebarContent user={user} orgName={orgName} pathname={pathname} onNavigate={onClose} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            aria-label="Cerrar menú"
            onClick={onClose}
          />
          <div className="absolute inset-y-0 left-0 w-[85vw] max-w-72 border-r border-border bg-surface shadow-pop animate-slide-in-left">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="absolute right-2 top-3"
              aria-label="Cerrar menú"
            >
              <X className="size-4" />
            </Button>
            <SidebarContent user={user} orgName={orgName} pathname={pathname} onNavigate={onClose} />
          </div>
        </div>
      ) : null}
    </>
  );
}
