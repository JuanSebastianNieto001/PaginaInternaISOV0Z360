import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca */}
      <aside className="relative hidden overflow-hidden bg-fg text-fg-inverted lg:flex lg:flex-col lg:justify-between lg:p-12 dark:bg-surface dark:text-fg">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at 30% 20%, black 20%, transparent 70%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-fg">
            <ShieldCheck className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="text-base font-semibold">ISO DMS</p>
            <p className="text-xs opacity-70">Sistema de Gestión Documental</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-balance text-3xl font-semibold tracking-tight">
            Control documental con trazabilidad completa.
          </h2>
          <p className="mt-4 text-sm leading-relaxed opacity-75">
            Repositorio central de políticas, procedimientos y registros para tus sistemas de gestión
            ISO. Versiones, permisos por rol y auditoría de cada acción.
          </p>
          <dl className="mt-8 grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="opacity-60">Acceso</dt>
              <dd className="font-medium">Por rol</dd>
            </div>
            <div>
              <dt className="opacity-60">Archivos</dt>
              <dd className="font-medium">Privados</dd>
            </div>
            <div>
              <dt className="opacity-60">Historial</dt>
              <dd className="font-medium">Auditado</dd>
            </div>
          </dl>
        </div>

        <p className="relative text-xs opacity-60">© {new Date().getFullYear()} · Uso interno</p>
      </aside>

      {/* Formulario */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-fg">
              <ShieldCheck className="size-4.5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-fg">ISO DMS</p>
              <p className="text-[11px] text-fg-subtle">Gestión documental</p>
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
