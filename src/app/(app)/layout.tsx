import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/session";
import { getAppSettings } from "@/lib/services/settings.service";
import { createClient } from "@/lib/supabase/server";

/**
 * Layout autenticado. Comprueba sesión y perfil activo en el servidor;
 * el proxy ya hizo una comprobación optimista previa.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const supabase = await createClient();
  const settings = await getAppSettings(supabase).catch(() => null);

  return (
    <AppShell user={user} orgName={settings?.org_name ?? "ISO DMS"}>
      {children}
    </AppShell>
  );
}
