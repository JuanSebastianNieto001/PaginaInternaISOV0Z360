import { FileSearch, Inbox, Lock, SearchX, ShieldAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import { ButtonLink } from "./button";

interface StateProps {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  tone?: "neutral" | "danger" | "warning";
  compact?: boolean;
}

export function StateBlock({ icon: Icon = Inbox, title, description, action, className, tone = "neutral", compact }: StateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface text-center",
        compact ? "px-4 py-8" : "px-6 py-14",
        className,
      )}
    >
      <div
        className={cn(
          "mb-4 flex size-12 items-center justify-center rounded-xl",
          tone === "danger" ? "bg-danger-soft text-danger" : tone === "warning" ? "bg-warning-soft text-warning" : "bg-surface-2 text-fg-muted",
        )}
      >
        <Icon className="size-6" />
      </div>
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      {description ? <p className="mt-1.5 max-w-md text-sm text-fg-muted">{description}</p> : null}
      {action ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function EmptyState(props: Omit<StateProps, "tone">) {
  return <StateBlock icon={Inbox} {...props} />;
}

export function NoResultsState({ onResetHref = "/documents", ...props }: Partial<StateProps> & { onResetHref?: string }) {
  return (
    <StateBlock
      icon={SearchX}
      title="Sin resultados"
      description="Ningún documento coincide con la búsqueda o los filtros aplicados."
      action={
        <ButtonLink href={onResetHref} variant="outline" size="sm">
          Limpiar filtros
        </ButtonLink>
      }
      {...props}
    />
  );
}

export function ErrorState({
  title = "No se pudo cargar la información",
  description = "Ha ocurrido un error al consultar los datos. Inténtalo de nuevo en unos segundos.",
  ...props
}: Partial<StateProps>) {
  return <StateBlock icon={TriangleAlert} tone="danger" title={title} description={description} {...props} />;
}

export function ForbiddenState({
  title = "Acceso denegado",
  description = "Tu rol no tiene permisos para acceder a esta sección. Si crees que es un error, contacta con un administrador.",
  ...props
}: Partial<StateProps>) {
  return (
    <StateBlock
      icon={ShieldAlert}
      tone="warning"
      title={title}
      description={description}
      action={
        <ButtonLink href="/dashboard" variant="outline" size="sm">
          Volver al dashboard
        </ButtonLink>
      }
      {...props}
    />
  );
}

export function UnauthorizedState(props: Partial<StateProps>) {
  return (
    <StateBlock
      icon={Lock}
      tone="warning"
      title="Sesión requerida"
      description="Debes iniciar sesión para continuar."
      action={
        <ButtonLink href="/login" size="sm">
          Iniciar sesión
        </ButtonLink>
      }
      {...props}
    />
  );
}

export function NotFoundState({
  title = "No encontrado",
  description = "El recurso solicitado no existe o ha sido eliminado.",
  ...props
}: Partial<StateProps>) {
  return (
    <StateBlock
      icon={FileSearch}
      title={title}
      description={description}
      action={
        <ButtonLink href="/documents" variant="outline" size="sm">
          Ir al repositorio
        </ButtonLink>
      }
      {...props}
    />
  );
}
