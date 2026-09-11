import type { Metadata } from "next";

import { SettingsForms } from "@/components/settings/settings-forms";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Configuración" description="Tu perfil, seguridad de la cuenta y preferencias de la interfaz." />
      <SettingsForms user={user} />
    </>
  );
}
