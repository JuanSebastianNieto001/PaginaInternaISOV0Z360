import type { Metadata } from "next";

import { AppSettingsForm } from "@/components/admin/app-settings-form";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getAppSettings } from "@/lib/services/settings.service";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ajustes del sistema" };

export default async function AdminSettingsPage() {
  const { allowed } = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!allowed) return <ForbiddenState description="Solo SUPER_ADMIN puede modificar la configuración global." />;

  const supabase = await createClient();
  let settings;
  try {
    settings = await getAppSettings(supabase);
  } catch {
    return <ErrorState />;
  }

  return (
    <>
      <PageHeader title="Ajustes del sistema" description="Configuración global almacenada en la base de datos. Aplica a todos los usuarios." />
      <AppSettingsForm settings={settings} />
    </>
  );
}
