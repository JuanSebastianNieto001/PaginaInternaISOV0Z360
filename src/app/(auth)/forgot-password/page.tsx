import type { Metadata } from "next";

import { ForgotPasswordForm } from "./forgot-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Recuperar contraseña</h1>
      <p className="mt-1.5 text-sm text-fg-muted">
        Introduce tu email y te enviaremos un enlace para establecer una nueva contraseña.
      </p>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
