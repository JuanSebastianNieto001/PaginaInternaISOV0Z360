#!/usr/bin/env node
/**
 * Configura Supabase Auth vía Management API:
 *   - Site URL
 *   - Redirect URLs permitidas
 *   - Deshabilita el registro público (las altas las hace un administrador)
 *
 *   npm run auth:configure -- https://pagina-interna-iso-v0z360.vercel.app
 *
 * Requiere SUPABASE_PROJECT_REF y SUPABASE_ACCESS_TOKEN en .env.local.
 */
import { loadEnv, requireEnv } from "./lib/env.mjs";

loadEnv();

const ref = requireEnv("SUPABASE_PROJECT_REF");
const token = requireEnv("SUPABASE_ACCESS_TOKEN");
const siteUrl = (process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const redirects = new Set([
  `${siteUrl}/auth/callback`,
  `${siteUrl}/reset-password`,
  "http://localhost:3000/auth/callback",
  "http://localhost:3000/reset-password",
]);
if (siteUrl.endsWith(".vercel.app")) redirects.add("https://*.vercel.app/auth/callback");

const payload = {
  site_url: siteUrl,
  uri_allow_list: Array.from(redirects).join(","),
  disable_signup: true,
  external_email_enabled: true,
  mailer_autoconfirm: false,
};

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`\n✖ HTTP ${res.status}:`, body.message ?? body, "\n");
  process.exit(1);
}

console.log("✔ Auth configurado:");
console.log("  site_url        :", body.site_url);
console.log("  uri_allow_list  :", body.uri_allow_list);
console.log("  disable_signup  :", body.disable_signup);
console.log("  email enabled   :", body.external_email_enabled);
