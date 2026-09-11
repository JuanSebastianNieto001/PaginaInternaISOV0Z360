"use client";

import { Eye, EyeOff, LogIn } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { signIn, type AuthFormState } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signIn, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="space-y-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {notice && !state.error ? (
        <div role="status" className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning">
          {notice}
        </div>
      ) : null}
      <FormError message={state.error} />

      <Field label="Email" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nombre@empresa.com"
          required
          autoFocus
          disabled={pending}
        />
      </Field>

      <Field
        label={
          <span className="flex items-center justify-between">
            Contraseña
            <Link href="/forgot-password" className="text-xs font-normal text-primary hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </span>
        }
        htmlFor="password"
      >
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            required
            disabled={pending}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-fg-subtle hover:text-fg"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>

      <Button type="submit" size="lg" className="w-full" loading={pending} leftIcon={<LogIn className="size-4" />}>
        Entrar
      </Button>

      <p className="text-center text-xs text-fg-subtle">
        El acceso es gestionado por el administrador de la organización.
      </p>
    </form>
  );
}
