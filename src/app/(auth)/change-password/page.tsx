import { LogOut } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signOut } from "@/lib/actions/auth.actions";
import { getCurrentUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Cambiar contraseña" };

/**
 * Cambio de contraseña obligatorio. El usuario llega aquí con sesión válida
 * pero con la marca must_change_password; hasta completarlo, requireUser()
 * lo redirige de vuelta desde cualquier página de la app.
 */
export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?reason=session");
  if (!user.mustChangePassword) redirect("/dashboard");

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Crea tu nueva contraseña</h1>
      <p className="mt-1.5 text-sm text-fg-muted">
        Tu cuenta <span className="font-medium text-fg">{user.email}</span> tiene una contraseña temporal.
        Por seguridad debes definir una nueva antes de continuar.
      </p>
      <div className="mt-8">
        <ChangePasswordForm />
      </div>
      <form action={signOut} className="mt-6">
        <Button type="submit" variant="link" size="sm" className="text-fg-muted" leftIcon={<LogOut className="size-4" />}>
          Salir y hacerlo más tarde
        </Button>
      </form>
    </div>
  );
}
