#!/usr/bin/env node
/**
 * Crea documentos de demostración con archivos REALES en Storage.
 *
 *   npm run seed:demo
 *
 * - Requiere SUPABASE_SERVICE_ROLE_KEY y al menos un SUPER_ADMIN (seed:admin).
 * - Idempotente: omite los códigos que ya existen.
 * - Todos los documentos llevan el prefijo "[DEMO]" para identificarlos.
 */
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { loadEnv, requireEnv } from "./lib/env.mjs";

loadEnv();

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const BUCKET = "documents";

/** Genera un PDF mínimo válido (una página, texto) sin dependencias. */
function makePdf(title, lines) {
  const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const content = [
    "BT",
    "/F1 18 Tf 50 760 Td",
    `(${esc(title)}) Tj`,
    "/F1 11 Tf 0 -30 Td",
    ...lines.flatMap((l, i) => [i === 0 ? "" : "0 -16 Td", `(${esc(l)}) Tj`]).filter(Boolean),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

const DEMO_DOCS = [
  { code: "DEMO-POL-SI-001", name: "[DEMO] Política de Seguridad de la Información", std: "ISO-27001", cat: "SGSI", sub: "POL", type: "policy", status: "approved", version: "2.0", tags: ["Seguridad", "Obligatorio"], desc: "Declaración de la dirección sobre la protección de la información. Documento de ejemplo generado por el seed." },
  { code: "DEMO-PRO-SI-004", name: "[DEMO] Procedimiento de Control de Accesos", std: "ISO-27001", cat: "SEG", sub: "ACC", type: "procedure", status: "approved", version: "1.3", tags: ["Seguridad"], desc: "Alta, modificación y baja de accesos lógicos. Documento de ejemplo." },
  { code: "DEMO-MAT-RI-001", name: "[DEMO] Matriz de Riesgos de Seguridad", std: "ISO-27001", cat: "RIES", sub: "MET", type: "matrix", status: "review", version: "1.0", tags: ["Seguridad", "Auditoría 2026"], desc: "Inventario de riesgos y tratamiento. Documento de ejemplo." },
  { code: "DEMO-PLA-BC-001", name: "[DEMO] Plan de Continuidad del Negocio", std: "ISO-27001", cat: "CONT", sub: "BCP", type: "plan", status: "draft", version: "0.1", tags: ["Confidencial"], desc: "Borrador inicial del plan de continuidad. Documento de ejemplo." },
  { code: "DEMO-MAN-CA-001", name: "[DEMO] Manual de Calidad", std: "ISO-9001", cat: "SGC", sub: "MAN", type: "manual", status: "approved", version: "3.0", tags: ["Calidad", "Obligatorio"], desc: "Descripción del sistema de gestión de la calidad. Documento de ejemplo." },
  { code: "DEMO-PRO-CO-002", name: "[DEMO] Procedimiento de Evaluación de Proveedores", std: "ISO-9001", cat: "PROC", sub: "COMP", type: "procedure", status: "approved", version: "1.1", tags: ["Calidad"], desc: "Criterios de selección y reevaluación de proveedores. Documento de ejemplo." },
  { code: "DEMO-FOR-NC-001", name: "[DEMO] Formato de No Conformidad y Acción Correctiva", std: "ISO-9001", cat: "MEJ", sub: "NC", type: "form", status: "approved", version: "1.0", tags: ["Calidad"], desc: "Plantilla para el registro de no conformidades. Documento de ejemplo.", ext: "txt" },
  { code: "DEMO-INF-AI-2025", name: "[DEMO] Informe de Auditoría Interna 2025", std: "ISO-9001", cat: "MEJ", sub: "AUD", type: "report", status: "obsolete", version: "1.0", tags: ["Calidad"], desc: "Informe del ciclo anterior, reemplazado. Documento de ejemplo." },
  { code: "DEMO-POL-SST-001", name: "[DEMO] Política de Seguridad y Salud en el Trabajo", std: "ISO-45001", cat: "SGSST", sub: "POLSST", type: "policy", status: "approved", version: "1.0", tags: ["SST", "Obligatorio"], desc: "Compromisos de la organización en seguridad y salud en el trabajo. Documento de ejemplo." },
  { code: "DEMO-MAT-LE-001", name: "[DEMO] Matriz de Requisitos Legales de SST", std: "ISO-45001", cat: "LEGS", sub: "MLEG", type: "matrix", status: "review", version: "2.1", tags: ["SST", "Auditoría 2026"], desc: "Identificación y evaluación del cumplimiento legal en SST. Documento de ejemplo.", ext: "md" },
];

async function main() {
  const { data: admin } = await supabase
    .from("profiles")
    .select("id, email, role:roles!inner(code)")
    .eq("roles.code", "SUPER_ADMIN")
    .limit(1)
    .maybeSingle();

  if (!admin) {
    console.error("\n✖ No existe ningún SUPER_ADMIN. Ejecuta primero: npm run seed:admin -- <email> <password>\n");
    process.exit(1);
  }
  console.log(`ℹ Autor de los documentos demo: ${admin.email}`);

  const [{ data: standards }, { data: categories }, { data: subcategories }, { data: types }, { data: tags }] = await Promise.all([
    supabase.from("standards").select("id, code"),
    supabase.from("categories").select("id, code, standard_id"),
    supabase.from("subcategories").select("id, code, category_id"),
    supabase.from("document_types").select("id, code"),
    supabase.from("tags").select("id, name"),
  ]);

  const stdByCode = new Map(standards.map((s) => [s.code, s.id]));
  const typeByCode = new Map(types.map((t) => [t.code, t.id]));
  const tagByName = new Map(tags.map((t) => [t.name, t.id]));

  let created = 0;
  for (const d of DEMO_DOCS) {
    const { data: exists } = await supabase.from("documents").select("id").eq("code", d.code).maybeSingle();
    if (exists) {
      console.log(`· ${d.code} ya existe, omitido.`);
      continue;
    }

    const standardId = stdByCode.get(d.std);
    const category = categories.find((c) => c.standard_id === standardId && c.code === d.cat);
    const subcategory = subcategories.find((s) => s.category_id === category?.id && s.code === d.sub);
    const typeId = typeByCode.get(d.type);
    if (!standardId || !category || !typeId) {
      console.warn(`! ${d.code}: taxonomía no encontrada (¿ejecutaste 004_seed.sql?). Omitido.`);
      continue;
    }

    const id = randomUUID();
    const ext = d.ext ?? "pdf";
    const path = `${id}/v${d.version}/${randomUUID()}.${ext}`;
    const fileName = `${d.code}_v${d.version}.${ext}`;

    let body, mime;
    if (ext === "pdf") {
      body = makePdf(d.name, [`Codigo: ${d.code}`, `Version: ${d.version}`, `Norma: ${d.std}`, "", "Documento de demostracion generado por scripts/seed-demo.mjs.", "Sustituyelo por documentacion real de tu organizacion."]);
      mime = "application/pdf";
    } else if (ext === "md") {
      body = Buffer.from(`# ${d.name}\n\n- Código: ${d.code}\n- Versión: ${d.version}\n- Norma: ${d.std}\n\n${d.desc}\n`, "utf8");
      mime = "text/markdown";
    } else {
      body = Buffer.from(`${d.name}\nCódigo: ${d.code}\nVersión: ${d.version}\n\n${d.desc}\n`, "utf8");
      mime = "text/plain";
    }

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: mime, upsert: false });
    if (upErr) {
      console.error(`✖ ${d.code}: error subiendo archivo: ${upErr.message}`);
      continue;
    }

    const { error: docErr } = await supabase.from("documents").insert({
      id,
      code: d.code,
      name: d.name,
      description: d.desc,
      standard_id: standardId,
      category_id: category.id,
      subcategory_id: subcategory?.id ?? null,
      document_type_id: typeId,
      status: d.status,
      version: d.version,
      file_path: path,
      file_name: fileName,
      file_extension: ext,
      file_size: body.length,
      mime_type: mime,
      approved_at: d.status === "approved" ? new Date().toISOString() : null,
      created_by: admin.id,
      updated_by: admin.id,
    });
    if (docErr) {
      console.error(`✖ ${d.code}: ${docErr.message}`);
      await supabase.storage.from(BUCKET).remove([path]);
      continue;
    }

    await supabase.from("document_versions").insert({
      document_id: id,
      version: d.version,
      status: d.status,
      file_path: path,
      file_name: fileName,
      file_extension: ext,
      file_size: body.length,
      mime_type: mime,
      change_summary: "Versión inicial (seed demo)",
      created_by: admin.id,
    });

    const tagIds = d.tags.map((t) => tagByName.get(t)).filter(Boolean);
    if (tagIds.length > 0) {
      await supabase.from("document_tags").insert(tagIds.map((tag_id) => ({ document_id: id, tag_id })));
    }

    created += 1;
    console.log(`✔ ${d.code} creado (${ext.toUpperCase()}, ${body.length} bytes).`);
  }

  console.log(`\n✔ Listo. ${created} documento(s) demo creado(s).\n`);
}

main().catch((err) => {
  console.error("\n✖ Error:", err.message ?? err, "\n");
  process.exit(1);
});
