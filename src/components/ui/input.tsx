import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export const inputClasses = (invalid?: boolean, className?: string) =>
  cn(
    "flex h-9 w-full rounded-md border bg-surface px-3 text-sm text-fg shadow-xs transition-colors",
    "placeholder:text-fg-subtle",
    "focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring",
    "disabled:cursor-not-allowed disabled:opacity-60",
    invalid ? "border-danger" : "border-border hover:border-border-strong",
    className,
  );

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, type = "text", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={inputClasses(invalid, className)}
      {...props}
    />
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(inputClasses(invalid), "h-auto min-h-[5.5rem] resize-y py-2 leading-relaxed", className)}
      {...props}
    />
  );
});
