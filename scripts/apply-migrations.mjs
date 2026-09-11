#!/usr/bin/env node
/**
 * Ejecuta las migraciones SQL de `supabase/migrations/` contra el proyecto
 * usando la Management API de Supabase (sin psql ni CLI).
 *
 *   npm run db:migrate            # aplica todas en orden
 *   npm run db:migrate -- 003     # aplica solo las que empiezan por 003
 *
 * Requiere en .env.local:
 *   SUPABASE_PROJECT_REF   (p.ej. tlxxvcqxhwcpspezssdn)
 *   SUPABASE_ACCESS_TOKEN  (token personal, sbp_...)
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadEnv, requireEnv } from "./lib/env.mjs";

loadEnv();

const ref = requireEnv("SUPABASE_PROJECT_REF");
const token = requireEnv("SUPABASE_ACCESS_TOKEN");
const filter = process.argv[2];

const dir = resolve(process.cwd(), "supabase/migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .filter((f) => (filter ? f.startsWith(filter) : true))
  .sort();

if (files.length === 0) {
  console.error("✖ No se encontraron migraciones.");
  process.exit(1);
}

async function runSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      msg = JSON.parse(text).message ?? text;
    } catch {
      /* texto plano */
    }
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  return text;
}

for (const file of files) {
  const sql = readFileSync(resolve(dir, file), "utf8");
  process.stdout.write(`→ ${file} … `);
  try {
    await runSql(sql);
    console.log("✔");
  } catch (err) {
    console.log("✖");
    console.error(`\n${err.message}\n`);
    process.exit(1);
  }
}

console.log("\n✔ Migraciones aplicadas.\n");
