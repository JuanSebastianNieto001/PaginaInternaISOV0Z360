"use client";

import { KeyRound } from "lucide-react";
import { useActionState } from "react";

import { completeForcedPasswordChange, type AuthFormState } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(completeForcedPasswordChange, {});

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormError message={state.error} />
      <Field label="Nueva contraseña" htmlFor="password" required hint="Mínimo 8 caracteres y distinta de la temporal.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} autoFocus disabled={pending} />
      </Field>
      <Field label="Confirmar contraseña" htmlFor="confirmPassword" required>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} disabled={pending} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending} leftIcon={<KeyRound className="size-4" />}>
        Guardar y continuar
      </Button>
    </form>
  );
}
