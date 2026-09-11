"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import { Button } from "./button";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Evita cerrar con Escape/click fuera (p.ej. mientras se sube un archivo). */
  locked?: boolean;
}

const SIZES = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

/**
 * Diálogo modal accesible basado en <dialog> nativo.
 * En móvil se presenta como bottom sheet; en escritorio, centrado.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = "md", locked }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      if (!locked) onClose();
    };
    const handleClick = (e: MouseEvent) => {
      if (locked) return;
      if (e.target === el) onClose();
    };
    el.addEventListener("cancel", handleCancel);
    el.addEventListener("click", handleClick);
    return () => {
      el.removeEventListener("cancel", handleCancel);
      el.removeEventListener("click", handleClick);
    };
  }, [onClose, locked]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      className={cn(
        "m-0 h-dvh max-h-dvh w-full max-w-full bg-transparent p-0 backdrop:bg-black/40 backdrop:backdrop-blur-[2px]",
        "open:flex open:flex-col open:justify-end sm:open:justify-center sm:open:items-center",
      )}
    >
      {open ? (
        <div
          className={cn(
            "flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-border bg-surface shadow-pop animate-slide-up",
            "sm:max-h-[85dvh] sm:rounded-xl sm:animate-fade-in",
            SIZES[size],
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold text-fg">
                {title}
              </h2>
              {description ? (
                <p id={descId} className="mt-1 text-sm text-fg-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} disabled={locked} aria-label="Cerrar">
              <X className="size-4" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer ? (
            <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-3 sm:flex-row sm:justify-end">
              {footer}
            </div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive,
  loading,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      locked={loading}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={() => void onConfirm()} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
