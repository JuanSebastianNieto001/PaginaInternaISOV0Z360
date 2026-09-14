"use client";

import { LogOut, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { signOut } from "@/lib/actions/auth.actions";
import { canAny } from "@/lib/auth/permissions";
import { MAIN_NAV, SYSTEM_NAV, isNavActive, type NavItem } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/format";
import type { CurrentUser } from "@/types";

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
        "mx-2.5 my-0.5 flex items-center gap-2.5 rounded-[10px] border-l-[3px] px-3 py-[9px] text-sm transition-colors",
        active
          ? "border-primary bg-primary-soft font-semibold text-fg"
          : "border-transparent font-normal text-fg hover:bg-primary-soft",
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-fg-subtle")} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function GroupLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("px-4 pb-1.5 text-[10px] uppercase tracking-[.12em] text-fg-subtle", className)}>{children}</p>
  );
}

function SidebarContent({
  user,
  orgName,
  pathname,
  onNavigate,
  onClose,
  showClose = false,
}: {
  user: CurrentUser;
  orgName: string;
  pathname: string;
  onNavigate: () => void;
  onClose: () => void;
  showClose?: boolean;
}) {
  const mainItems = MAIN_NAV.filter((i) => canAny(user, i.anyPermission));
  const systemItems = SYSTEM_NAV.filter((i) => canAny(user, i.anyPermission));

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[60px] shrink-0 items-center gap-2.5 border-b-2 border-divider px-4">
        <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-primary text-primary-fg">
          <ShieldCheck className="size-[17px]" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-extrabold tracking-[-0.01em] text-fg">{orgName}</p>
          <p className="truncate text-[10px] uppercase tracking-[.1em] text-fg-subtle">Gestión documental</p>
        </div>
        {showClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="ml-auto grid size-8 shrink-0 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-primary-soft hover:text-primary"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto py-4" aria-label="Principal">
        <GroupLabel>Repositorio</GroupLabel>
        {mainItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
        <GroupLabel className="pt-5">Sistema</GroupLabel>
        {systemItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="flex shrink-0 items-center gap-2.5 border-t-2 border-divider px-4 py-3">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-900 text-[12px] font-extrabold text-white"
          aria-hidden
        >
          {initials(user.fullName || user.email)}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[13px] font-semibold text-fg">{user.fullName || user.email}</p>
          <p className="truncate text-[11px] text-fg-subtle">{user.role.name}</p>
        </div>
        <form action={signOut} className="ml-auto shrink-0">
          <button
            type="submit"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="grid size-7 place-items-center rounded-md text-fg-subtle transition-colors hover:text-primary"
          >
            <LogOut className="size-[15px]" />
          </button>
        </form>
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
      {/* Escritorio: columna fija de 240 px */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r-2 border-divider bg-surface-2 min-[900px]:block">
        <SidebarContent user={user} orgName={orgName} pathname={pathname} onNavigate={onClose} onClose={onClose} />
      </aside>

      {/* Móvil y tableta: drawer con overlay */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 min-[900px]:hidden" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <button
            type="button"
            className="absolute inset-0 bg-brand-900/45"
            aria-label="Cerrar menú"
            onClick={onClose}
          />
          <div className="absolute inset-y-0 left-0 w-60 max-w-[85vw] border-r-2 border-divider bg-surface-2 shadow-float animate-slide-in-left">
            <SidebarContent
              user={user}
              orgName={orgName}
              pathname={pathname}
              onNavigate={onClose}
              onClose={onClose}
              showClose
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
