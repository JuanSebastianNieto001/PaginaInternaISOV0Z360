import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { CurrentUser, PermissionCode } from "@/types";

import { can, canAny } from "./permissions";

interface ProfileWithRole {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  is_active: boolean;
  role: {
    id: string;
    code: string;
    name: string;
    level: number;
    role_permissions: { permission: { code: string } | null }[];
  } | null;
}

/**
 * Devuelve el usuario autenticado con su perfil, rol y permisos, o `null`.
 * Cacheado por petición (React cache) para evitar consultas repetidas entre
 * layout y páginas.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `id, email, full_name, avatar_url, is_active,
       role:roles ( id, code, name, level,
         role_permissions ( permission:permissions ( code ) )
       )`,
    )
    .eq("id", user.id)
    .maybeSingle<ProfileWithRole>();

  if (!profile || !profile.role) return null;

  const permissions = profile.role.role_permissions
    .map((rp) => rp.permission?.code)
    .filter((c): c is PermissionCode => Boolean(c));

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    isActive: profile.is_active,
    role: {
      id: profile.role.id,
      code: profile.role.code,
      name: profile.role.name,
      level: profile.role.level,
    },
    permissions,
  };
});

/**
 * Exige sesión válida y perfil activo; redirige a /login en caso contrario.
 * Usar en layouts/pages del servidor.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    // Sesión válida pero sin perfil (caso anómalo): evitar bucle con el proxy.
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser) redirect("/account-disabled?reason=missing_profile");
    redirect("/login?reason=session");
  }
  if (!user.isActive) redirect("/account-disabled");
  return user;
}

/**
 * Comprueba permiso. Devuelve el usuario y un flag para que la página pueda
 * renderizar un estado "Forbidden" en lugar de redirigir.
 */
export async function requirePermission(
  permission: PermissionCode,
): Promise<{ user: CurrentUser; allowed: boolean }> {
  const user = await requireUser();
  return { user, allowed: can(user, permission) };
}

export async function requireAnyPermission(
  permissions: PermissionCode[],
): Promise<{ user: CurrentUser; allowed: boolean }> {
  const user = await requireUser();
  return { user, allowed: canAny(user, permissions) };
}
