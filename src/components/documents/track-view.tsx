"use client";

import { useEffect } from "react";

import { trackDocumentView } from "@/lib/actions/recent.actions";

/** Registra la visualización del documento en "Recientes" (sin UI). */
export function TrackView({ documentId }: { documentId: string }) {
  useEffect(() => {
    void trackDocumentView(documentId);
  }, [documentId]);
  return null;
}
