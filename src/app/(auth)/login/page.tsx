import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

const REASONS: Record<string, string> = {
  session: "Tu sesión ha expirado. Inicia sesión de nuevo.",
  inactive: "Tu cuenta está desactivada. Contacta con el administrador.",
  link_invalid: "El enlace no es válido o ha expirado. Solicita uno nuevo.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const { next, reason } = await searchParams;
  const notice = reason ? REASONS[reason] : undefined;

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Iniciar sesión</h1>
      <p className="mt-1.5 text-sm text-fg-muted">Accede con tu cuenta corporativa para entrar al repositorio.</p>
      <div className="mt-8">
        <LoginForm next={next} notice={notice} />
      </div>
    </div>
  );
}
