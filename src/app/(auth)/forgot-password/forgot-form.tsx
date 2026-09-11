"use client";

import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordReset, type AuthFormState } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormSuccess } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(requestPasswordReset, {});

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      {!state.success ? (
        <>
          <Field label="Email" htmlFor="email" required>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="nombre@empresa.com" required autoFocus disabled={pending} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={pending} leftIcon={<Mail className="size-4" />}>
            Enviar enlace
          </Button>
        </>
      ) : null}

      <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Volver a iniciar sesión
      </Link>
    </form>
  );
}
