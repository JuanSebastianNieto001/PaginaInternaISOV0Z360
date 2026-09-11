"use client";

import { ArrowRight, Check, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { signIn, type AuthFormState } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { FormError, Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/** Estilos de campo del rediseño (sobre el Input base del proyecto). */
const INPUT_CLASSES =
  "h-auto min-h-[46px] rounded-[10px] border-[#d6dde8] bg-[#f7f9fc] px-3.5 py-2.5 text-[#0f1b2d] shadow-none " +
  "placeholder:text-[#8e9bb0] hover:border-[#b6c0d0] " +
  "focus-visible:border-[#1d4ed8] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#1d4ed8]";

const LABEL_CLASSES = "text-xs font-semibold text-[#4d5869]";

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signIn, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {notice && !state.error ? (
        <div
          role="status"
          className="mb-4 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning"
        >
          {notice}
        </div>
      ) : null}
      {state.error ? (
        <div className="mb-4">
          <FormError message={state.error} />
        </div>
      ) : null}

      {/* Email */}
      <div className="mb-4 flex flex-col gap-1.5">
        <Label htmlFor="email" className={LABEL_CLASSES}>
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nombre@voz360.co"
          required
          autoFocus
          disabled={pending}
          className={INPUT_CLASSES}
        />
      </div>

      {/* Contraseña */}
      <div className="mb-4 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password" className={LABEL_CLASSES}>
            Contraseña
          </Label>
          <Link
            href="/forgot-password"
            className="text-xs font-normal text-[#173db0] no-underline transition-colors hover:text-[#1d4ed8]"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••••"
            required
            disabled={pending}
            className={`${INPUT_CLASSES} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-1.5 top-1/2 grid size-[34px] -translate-y-1/2 place-items-center rounded-lg text-[#6a768b] transition-colors hover:bg-[#eaf1fe] hover:text-[#1d4ed8]"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPassword}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      {/* Recordarme */}
      <label className="mb-[22px] flex w-fit cursor-pointer select-none items-center gap-2 text-[13px] text-[#4d5869]">
        <input type="checkbox" name="remember" value="1" defaultChecked className="peer sr-only" disabled={pending} />
        <span
          aria-hidden
          className="grid size-4 place-items-center rounded-[5px] border border-[#d6dde8] bg-white text-transparent transition-colors peer-checked:border-[#1d4ed8] peer-checked:bg-[#1d4ed8] peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#1d4ed8]"
        >
          <Check className="size-3" strokeWidth={3} />
        </span>
        Recordarme en este equipo
      </label>

      <Button
        type="submit"
        size="lg"
        loading={pending}
        rightIcon={<ArrowRight className="size-[18px]" aria-hidden />}
        className="h-auto min-h-12 w-full gap-2.5 rounded-xl bg-[linear-gradient(180deg,#3b7be6,#1d4ed8)] text-[15px] font-extrabold text-white shadow-[0_8px_20px_rgba(29,78,216,.30)] hover:bg-[#173db0] hover:bg-none"
      >
        Iniciar sesión
      </Button>

      <div className="mt-5 flex items-center gap-2 border-t border-[#eaeef5] pt-4 text-xs text-[#6a768b]">
        <ShieldCheck className="size-3.5 shrink-0 text-[#1d4ed8]" aria-hidden />
        <span>Acceso gestionado por el administrador. Conexión cifrada.</span>
      </div>
    </form>
  );
}
