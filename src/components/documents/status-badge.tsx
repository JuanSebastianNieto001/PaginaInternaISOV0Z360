import { DOCUMENT_STATUS_LABELS } from "@/lib/constants/documents";
import type { DocumentStatus } from "@/types";

import { Badge, type BadgeTone } from "../ui/badge";

const TONES: Record<DocumentStatus, BadgeTone> = {
  draft: "neutral",
  review: "warning",
  approved: "success",
  obsolete: "danger",
};

const DOTS: Record<DocumentStatus, string> = {
  draft: "bg-fg-subtle",
  review: "bg-warning",
  approved: "bg-success",
  obsolete: "bg-danger",
};

export function StatusBadge({ status, size = "md" }: { status: DocumentStatus; size?: "sm" | "md" }) {
  return (
    <Badge tone={TONES[status]} size={size}>
      <span className={`size-1.5 rounded-full ${DOTS[status]}`} aria-hidden />
      {DOCUMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
