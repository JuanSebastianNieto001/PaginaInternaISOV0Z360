#!/usr/bin/env node
/**
 * Crea (o promociona) el primer SUPER_ADMIN.
 *
 *   npm run seed:admin -- admin@empresa.com "ContraseñaSegura123" "Nombre Apellido"
 *
 * Requiere SUPABASE_SERVICE_ROLE_KEY en .env.local (solo local, nunca en el
 * navegador). Si el usuario ya existe, únicamente se le asigna el rol.
 */
import { createClient } from "@supabase/supabase-js";

import { loadEnv, requireEnv } from "./lib/env.mjs";

loadEnv();

const [email, password, fullName] = process.argv.slice(2);

if (!email || !password) {
  console.error("\nUso: npm run seed:admin -- <email> <password> [\"Nombre completo\"]\n");
  process.exit(1);
}
if (password.length < 8) {
  console.error("\n✖ La contraseña debe tener al menos 8 caracteres.\n");
  process.exit(1);
}

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const { data: role, error: roleError } = await supabase.from("roles").select("id").eq("code", "SUPER_ADMIN").single();
  if (roleError || !role) {
    console.error("\n✖ No se encontró el rol SUPER_ADMIN. ¿Ejecutaste las migraciones (001–004)?\n");
    process.exit(1);
  }

  let userId;
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role_code: "SUPER_ADMIN" },
    user_metadata: { full_name: fullName ?? email.split("@")[0] },
  });

  if (createError) {
    if (/already|registered|exists/i.test(createError.message)) {
      console.log(`ℹ El usuario ${email} ya existe. Se le asignará el rol SUPER_ADMIN.`);
      const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (listError) throw listError;
      const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!existing) throw new Error("No se pudo localizar el usuario existente.");
      userId = existing.id;
      await supabase.auth.admin.updateUserById(userId, { app_metadata: { role_code: "SUPER_ADMIN" } });
    } else {
      throw createError;
    }
  } else {
    userId = created.user.id;
    console.log(`✔ Usuario creado en Supabase Auth (${userId}).`);
  }

  // El trigger handle_new_user ya creó el perfil; garantizamos rol, nombre y estado.
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, email, full_name: fullName ?? email.split("@")[0], role_id: role.id, is_active: true },
      { onConflict: "id" },
    );
  if (profileError) throw profileError;

  console.log(`✔ ${email} es SUPER_ADMIN. Ya puedes iniciar sesión en /login.\n`);
}

main().catch((err) => {
  console.error("\n✖ Error:", err.message ?? err, "\n");
  process.exit(1);
});
