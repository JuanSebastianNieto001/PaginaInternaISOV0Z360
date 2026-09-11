"use server";

import { redirect } from "next/navigation";

import { AUDIT_ACTIONS } from "@/lib/constants/audit";
import { publicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema } from "@/lib/validation/auth";

export interface AuthFormState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
}

function safeNextPath(next: string | undefined | null): string {
  if (!next) return "/dashboard";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/login")) return "/dashboard";
  return next;
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? "Revisa los datos introducidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { error: "Email o contraseña incorrectos." };
  }

  // Comprobación de perfil activo (RLS permite leer el propio perfil).
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active, must_change_password")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: "Tu cuenta no está configurada. Contacta con el administrador." };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return { error: "Tu cuenta está desactivada. Contacta con el administrador." };
  }

  await Promise.all([
    supabase.rpc("touch_last_sign_in"),
    supabase.rpc("log_audit", {
      p_action: AUDIT_ACTIONS.AUTH_LOGIN,
      p_entity_type: "auth",
      p_entity_id: data.user.id,
      p_metadata: { email: parsed.data.email },
    }),
  ]);

  if (profile.must_change_password) redirect("/change-password");

  redirect(safeNextPath(parsed.data.next));
}

/**
 * Cambio de contraseña obligatorio (contraseña temporal asignada por un
 * administrador). Actualiza la contraseña y retira la marca en el servidor
 * mediante service_role; el usuario no puede retirarla por sí mismo.
 */
export async function completeForcedPasswordChange(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos introducidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha expirado. Inicia sesión de nuevo." };

  const admin = createAdminClient();
  if (!admin) {
    return { error: "El servidor no tiene configurada SUPABASE_SERVICE_ROLE_KEY. Contacta con el administrador." };
  }

  // El cambio se hace con la sesión del propio usuario. Hacerlo con
  // service_role revoca de inmediato el token del navegador y dejaría al
  // usuario rebotando entre /login y /dashboard.
  const { error: pwdError } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (pwdError) {
    return {
      error: /different|same/i.test(pwdError.message)
        ? "La nueva contraseña debe ser distinta de la temporal."
        : "No se pudo actualizar la contraseña. Inténtalo de nuevo.",
    };
  }

  const { error: flagError } = await admin
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);
  if (flagError) return { error: "La contraseña se cambió pero no se pudo actualizar tu perfil. Vuelve a iniciar sesión." };

  await supabase.rpc("log_audit", {
    p_action: AUDIT_ACTIONS.AUTH_PASSWORD_RESET,
    p_entity_type: "auth",
    p_entity_id: user.id,
    p_metadata: { forced: true },
  });

  redirect("/dashboard?notice=password_updated");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.rpc("log_audit", {
      p_action: AUDIT_ACTIONS.AUTH_LOGOUT,
      p_entity_type: "auth",
      p_entity_id: user.id,
      p_metadata: {},
    });
  }

  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Introduce un email válido." };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/reset-password`,
  });

  // Respuesta neutra: no revelamos si el email existe.
  return {
    success:
      "Si el email está registrado recibirás un enlace para restablecer tu contraseña en unos minutos.",
  };
}

export async function updatePassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? "Revisa los datos introducidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "El enlace ha expirado o no es válido. Solicita uno nuevo." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: error.message.includes("different") ? "La nueva contraseña debe ser distinta de la anterior." : "No se pudo actualizar la contraseña. Inténtalo de nuevo." };
  }

  await supabase.rpc("log_audit", {
    p_action: AUDIT_ACTIONS.AUTH_PASSWORD_RESET,
    p_entity_type: "auth",
    p_entity_id: user.id,
    p_metadata: {},
  });

  redirect("/dashboard?notice=password_updated");
}
