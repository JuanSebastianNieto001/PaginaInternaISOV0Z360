"use client";

import { Bell, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { findNavLabel } from "@/lib/constants/navigation";
import type { CurrentUser } from "@/types";

import { Tooltip } from "../ui/tooltip";
import { GlobalSearch } from "./global-search";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export function Topbar({
  user,
  orgName,
  onMenuClick,
}: {
  user: CurrentUser;
  orgName: string;
  onMenuClick: () => void;
}) {
  const pathname = usePathname();
  const section = findNavLabel(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-[60px] shrink-0 items-center gap-3 border-b-2 border-divider bg-bg px-4 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Abrir menú"
        className="-ml-2 grid size-9 place-items-center rounded-lg text-fg transition-colors hover:bg-brand-100 hover:text-primary min-[900px]:hidden"
      >
        <Menu className="size-[18px]" />
      </button>

      <nav aria-label="Ruta" className="flex min-w-0 items-center gap-2 text-[13px] text-fg-subtle">
        <span className="hidden truncate sm:inline">{orgName}</span>
        <span className="hidden sm:inline" aria-hidden>
          /
        </span>
        <span className="truncate font-semibold text-fg">{section}</span>
      </nav>

      <div className="flex-1" />

      <GlobalSearch className="hidden min-[900px]:block" />

      <Tooltip content="Actividad reciente" side="bottom">
        <Link
          href="/activity"
          aria-label="Actividad reciente"
          className="grid size-[38px] shrink-0 place-items-center rounded-full border border-border-strong text-fg transition-colors hover:border-primary hover:bg-brand-100 hover:text-primary"
        >
          <Bell className="size-[17px]" />
        </Link>
      </Tooltip>

      <ThemeToggle />
      <UserMenu user={user} />
    </header>
  );
}
