"use client";

import { useCallback, useState, type ReactNode } from "react";

import type { CurrentUser } from "@/types";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ user, orgName, children }: { user: CurrentUser; orgName: string; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar user={user} orgName={orgName} mobileOpen={mobileOpen} onClose={close} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} orgName={orgName} onMenuClick={() => setMobileOpen(true)} />
        <main id="main" className="w-full max-w-[1280px] flex-1 px-4 pb-12 pt-6 animate-fade-in sm:px-6 min-[900px]:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
