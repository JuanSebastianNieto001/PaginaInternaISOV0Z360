import type { LabelHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export function Label({ className, children, required, ...props }: LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn("text-sm font-medium text-fg", className)} {...props}>
      {children}
      {required ? <span className="ml-0.5 text-danger" aria-hidden>*</span> : null}
    </label>
  );
}

export interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string | string[] | null;
  className?: string;
  children: ReactNode;
}

/** Agrupa etiqueta, control, ayuda y error con espaciado coherente. */
export function Field({ label, htmlFor, required, hint, error, className, children }: FieldProps) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      ) : null}
      {children}
      {message ? (
        <p className="text-xs text-danger" role="alert">
          {message}
        </p>
      ) : hint ? (
        <p className="text-xs text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
    >
      {message}
    </div>
  );
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="rounded-md border border-success/30 bg-success-soft px-3 py-2 text-sm text-success"
    >
      {message}
    </div>
  );
}
