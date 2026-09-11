import { NextResponse, type NextRequest } from "next/server";

import { can } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { AUDIT_ACTIONS } from "@/lib/constants/audit";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createSignedFileUrl } from "@/lib/storage/server";
import { createClient } from "@/lib/supabase/server";
import { safeFileName } from "@/lib/utils/files";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/documents/:id/download[?version=<versionId>]
 *
 * Descarga segura: valida sesión y permiso `documents.download`, genera una
 * Signed URL de corta duración con Content-Disposition attachment, registra
 * la descarga en auditoría y redirige.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (!can(user, PERMISSIONS.DOCUMENTS_DOWNLOAD)) {
    return NextResponse.json({ error: "No tienes permiso para descargar documentos." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: doc, error } = await supabase
    .from("documents")
    .select("id, code, name, version, file_path, file_name")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Error al consultar el documento." }, { status: 500 });
  }
  if (!doc) {
    return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
  }

  let filePath = doc.file_path;
  let fileName = doc.file_name;
  let version = doc.version;

  const versionId = request.nextUrl.searchParams.get("version");
  if (versionId && UUID_RE.test(versionId)) {
    const { data: v } = await supabase
      .from("document_versions")
      .select("file_path, file_name, version")
      .eq("id", versionId)
      .eq("document_id", id)
      .maybeSingle();
    if (!v) {
      return NextResponse.json({ error: "Versión no encontrada." }, { status: 404 });
    }
    filePath = v.file_path;
    fileName = v.file_name;
    version = v.version;
  }

  const signedUrl = await createSignedFileUrl(supabase, filePath, {
    expiresIn: 60,
    downloadAs: safeFileName(fileName),
  });

  if (!signedUrl) {
    return NextResponse.json(
      { error: "No se pudo generar el enlace de descarga. El archivo puede no existir en Storage." },
      { status: 404 },
    );
  }

  await supabase.rpc("log_audit", {
    p_action: AUDIT_ACTIONS.DOCUMENT_DOWNLOADED,
    p_entity_type: "document",
    p_entity_id: doc.id,
    p_metadata: { name: doc.name, code: doc.code, version, file_name: fileName },
  });

  return NextResponse.redirect(signedUrl, { status: 302 });
}
