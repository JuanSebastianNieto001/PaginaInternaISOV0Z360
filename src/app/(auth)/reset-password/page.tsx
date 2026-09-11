import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui/button";
import { StateBlock } from "@/components/ui/states";

import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <StateBlock
        title="Enlace no válido"
        description="El enlace de recuperación ha expirado o ya fue utilizado. Solicita uno nuevo."
        tone="warning"
        action={
          <ButtonLink href="/forgot-password" size="sm">
            Solicitar nuevo enlace
          </ButtonLink>
        }
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Establecer nueva contraseña</h1>
      <p className="mt-1.5 text-sm text-fg-muted">
        Cuenta: <span className="font-medium text-fg">{user.email}</span>
      </p>
      <div className="mt-8">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
