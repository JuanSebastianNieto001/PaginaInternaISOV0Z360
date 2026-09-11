"use client";

import { Menu, Upload } from "lucide-react";

import { can } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type { CurrentUser } from "@/types";

import { Button, ButtonLink } from "../ui/button";
import { GlobalSearch } from "./global-search";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export function Topbar({ user, onMenuClick }: { user: CurrentUser; onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-bg/60 sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Abrir menú">
        <Menu className="size-5" />
      </Button>

      <GlobalSearch className="flex-1 max-w-xl" />

      <div className="ml-auto flex items-center gap-1.5">
        {can(user, PERMISSIONS.DOCUMENTS_CREATE) ? (
          <ButtonLink href="/documents/new" size="sm" className="hidden sm:inline-flex" leftIcon={<Upload className="size-4" />}>
            Subir documento
          </ButtonLink>
        ) : null}
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
