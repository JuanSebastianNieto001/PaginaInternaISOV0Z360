import { LogOut, UserX } from "lucide-react";
import type { Metadata } from "next";

import { signOut } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { StateBlock } from "@/components/ui/states";

export const metadata: Metadata = { title: "Cuenta desactivada" };

export default async function AccountDisabledPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  const missingProfile = reason === "missing_profile";

  return (
    <StateBlock
      icon={UserX}
      tone="warning"
      title={missingProfile ? "Cuenta no configurada" : "Cuenta desactivada"}
      description={
        missingProfile
          ? "Tu usuario existe pero no tiene un perfil asociado. Contacta con el administrador para completar el alta."
          : "Un administrador ha desactivado tu acceso. Si crees que se trata de un error, contacta con el administrador de la organización."
      }
      action={
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm" leftIcon={<LogOut className="size-4" />}>
            Cerrar sesión
          </Button>
        </form>
      }
    />
  );
}
