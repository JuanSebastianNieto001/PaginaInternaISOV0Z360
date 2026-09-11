import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info" | "outline";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-fg-muted border-transparent",
  primary: "bg-primary-soft text-primary border-transparent",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  info: "bg-info-soft text-info border-transparent",
  outline: "bg-transparent text-fg-muted border-border",
};

/** Colores nominales usados por normas y etiquetas (almacenados en BD). */
const NAMED_COLORS: Record<string, string> = {
  blue: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
  emerald: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  violet: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  rose: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
  cyan: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
  slate: "bg-slate-500/12 text-slate-700 dark:text-slate-300",
  orange: "bg-orange-500/12 text-orange-700 dark:text-orange-300",
};

export function namedColorClasses(color: string | null | undefined): string {
  return (color && NAMED_COLORS[color]) || NAMED_COLORS.slate!;
}

export function namedColorDot(color: string | null | undefined): string {
  const map: Record<string, string> = {
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    violet: "bg-violet-500",
    rose: "bg-rose-500",
    cyan: "bg-cyan-500",
    slate: "bg-slate-500",
    orange: "bg-orange-500",
  };
  return (color && map[color]) || "bg-slate-400";
}

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "color"> {
  tone?: BadgeTone;
  /** Color nominal (blue, emerald, …) que sobreescribe el tono. */
  color?: string | null;
  size?: "sm" | "md";
}

export function Badge({ className, tone = "neutral", color, size = "md", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border font-medium",
        size === "sm" ? "px-1.5 py-px text-[11px]" : "px-2 py-0.5 text-xs",
        color ? cn("border-transparent", namedColorClasses(color)) : TONES[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
