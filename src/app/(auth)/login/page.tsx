import { Lock } from "lucide-react";
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
    <>
      <div className="mb-4 grid size-11 place-items-center rounded-xl bg-[#eaf1fe] text-[#1d4ed8]" aria-hidden>
        <Lock className="size-[22px]" />
      </div>
      <h1 className="mb-1.5 text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-[#0f1b2d]">
        Bienvenido de nuevo
      </h1>
      <p className="mb-[22px] text-sm text-[#6a768b]">Accede con la cuenta que te asignó el administrador.</p>
      <LoginForm next={next} notice={notice} />
    </>
  );
}
