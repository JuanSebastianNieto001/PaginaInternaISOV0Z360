"use client";

import { useCallback, useState, type ReactNode } from "react";

import type { CurrentUser } from "@/types";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ user, orgName, children }: { user: CurrentUser; orgName: string; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="min-h-dvh bg-bg">
      <Sidebar user={user} orgName={orgName} mobileOpen={mobileOpen} onClose={close} />
      <div className="flex min-h-dvh flex-col lg:pl-60">
        <Topbar user={user} onMenuClick={() => setMobileOpen(true)} />
        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
