import {
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  Presentation,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";

const MAP: Record<string, { icon: LucideIcon; className: string }> = {
  pdf: { icon: FileText, className: "bg-rose-500/12 text-rose-600 dark:text-rose-300" },
  doc: { icon: FileType2, className: "bg-blue-500/12 text-blue-600 dark:text-blue-300" },
  docx: { icon: FileType2, className: "bg-blue-500/12 text-blue-600 dark:text-blue-300" },
  odt: { icon: FileType2, className: "bg-blue-500/12 text-blue-600 dark:text-blue-300" },
  xls: { icon: FileSpreadsheet, className: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300" },
  xlsx: { icon: FileSpreadsheet, className: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300" },
  ods: { icon: FileSpreadsheet, className: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300" },
  csv: { icon: FileSpreadsheet, className: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300" },
  ppt: { icon: Presentation, className: "bg-orange-500/12 text-orange-600 dark:text-orange-300" },
  pptx: { icon: Presentation, className: "bg-orange-500/12 text-orange-600 dark:text-orange-300" },
  png: { icon: FileImage, className: "bg-violet-500/12 text-violet-600 dark:text-violet-300" },
  jpg: { icon: FileImage, className: "bg-violet-500/12 text-violet-600 dark:text-violet-300" },
  jpeg: { icon: FileImage, className: "bg-violet-500/12 text-violet-600 dark:text-violet-300" },
  webp: { icon: FileImage, className: "bg-violet-500/12 text-violet-600 dark:text-violet-300" },
  gif: { icon: FileImage, className: "bg-violet-500/12 text-violet-600 dark:text-violet-300" },
  svg: { icon: FileImage, className: "bg-violet-500/12 text-violet-600 dark:text-violet-300" },
  zip: { icon: FileArchive, className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  txt: { icon: FileText, className: "bg-slate-500/12 text-slate-600 dark:text-slate-300" },
  md: { icon: FileText, className: "bg-slate-500/12 text-slate-600 dark:text-slate-300" },
};

export function FileIcon({ extension, size = "md", className }: { extension: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const entry = MAP[extension.toLowerCase()] ?? { icon: File, className: "bg-surface-2 text-fg-muted" };
  const Icon = entry.icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg",
        size === "sm" ? "size-8" : size === "lg" ? "size-14" : "size-10",
        entry.className,
        className,
      )}
      aria-hidden
    >
      <Icon className={size === "sm" ? "size-4" : size === "lg" ? "size-7" : "size-5"} />
    </span>
  );
}
