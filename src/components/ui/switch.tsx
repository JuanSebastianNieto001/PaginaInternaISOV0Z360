"use client";

import { cn } from "@/lib/utils/cn";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  id?: string;
  size?: "sm" | "md";
}

export function Switch({ checked, onCheckedChange, disabled, label, description, id, size = "md" }: SwitchProps) {
  const control = (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full border-2 border-transparent transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-5 w-9" : "h-6 w-11",
        checked ? "bg-primary" : "bg-surface-3",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block rounded-full bg-white shadow transition-transform",
          size === "sm" ? "size-4" : "size-5",
          checked ? (size === "sm" ? "translate-x-4" : "translate-x-5") : "translate-x-0",
        )}
      />
    </button>
  );

  if (!label) return control;

  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-fg-muted">{description}</span> : null}
      </span>
      {control}
    </label>
  );
}
