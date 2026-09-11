import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/** Rutas accesibles sin sesión. */
const PUBLIC_PATHS = ["/login", "/forgot-password", "/auth"];

/** Rutas de autenticación a las que un usuario ya autenticado no debe volver. */
const AUTH_ONLY_PATHS = ["/login", "/forgot-password"];

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refresca la sesión de Supabase en cada petición y aplica una comprobación
 * optimista de autenticación. La autorización real (roles/permisos) se aplica
 * en RLS y en los layouts/pages del servidor.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims valida el JWT localmente (sin ida y vuelta a Auth en cada request).
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);

  const { pathname, search } = request.nextUrl;

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = isAuthenticated ? "/dashboard" : "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!isAuthenticated && !matches(pathname, PUBLIC_PATHS)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const next = `${pathname}${search}`;
    if (next !== "/dashboard") url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && matches(pathname, AUTH_ONLY_PATHS)) {
    // El JWT puede seguir siendo válido localmente y estar ya revocado en Auth
    // (por ejemplo, si un administrador restablece la contraseña mientras la
    // persona tiene la sesión abierta). Sin esta comprobación, /login devuelve
    // a /dashboard, /dashboard vuelve a /login y el navegador acaba con un
    // error de demasiadas redirecciones.
    const { data: fresh, error } = await supabase.auth.getUser();
    if (error || !fresh.user) {
      await supabase.auth.signOut({ scope: "local" });
      return response;
    }

    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
