import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/** Palabras del titular con su retardo de animación (escalonado). */
const HEADLINE: { text: string; delay: string; accent?: boolean; breakAfter?: boolean }[] = [
  { text: "Cada", delay: ".05s" },
  { text: "documento,", delay: ".15s", breakAfter: true },
  { text: "una", delay: ".3s" },
  { text: "versión", delay: ".4s" },
  { text: "vigente.", delay: ".5s", accent: true },
];

const GRID_PATTERN: CSSProperties = {
  backgroundImage:
    "linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px)",
  backgroundSize: "64px 64px",
};

const DIVIDER = "border-white/30";

function BrandLogos({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <Image
        src="/brand/voz360-logo-white.png"
        alt="VOZ360"
        width={1536}
        height={564}
        priority
        sizes={compact ? "144px" : "(min-width: 900px) 35vw, 144px"}
        className={cn("block w-auto", compact ? "h-9" : "h-[clamp(56px,14vh,150px)] max-w-[65%]")}
      />
      <div
        className={cn(
          "relative flex-none overflow-hidden rounded-full shadow-[0_0_0_5px_rgba(255,255,255,.15)] animate-spin-slow",
          compact ? "size-10" : "size-[clamp(64px,14vh,150px)]",
        )}
      >
        <Image
          src="/brand/logo-circular.jpeg"
          alt="Conecta con soluciones"
          fill
          sizes={compact ? "40px" : "150px"}
          priority={!compact}
          className="object-cover"
        />
      </div>
    </>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "light-scope grid min-h-dvh grid-cols-1 bg-white font-brand text-[#0f1b2d]",
        "min-[900px]:h-dvh min-[900px]:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] min-[900px]:overflow-hidden",
      )}
    >
      {/* Panel izquierdo: marca */}
      <aside className="relative hidden h-dvh flex-col justify-between overflow-hidden bg-[#0f2159] px-10 py-[clamp(16px,3vh,28px)] text-white min-[900px]:flex">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={GRID_PATTERN} />

        <div className={cn("relative flex items-center justify-between gap-6 border-b-2 pb-[18px]", DIVIDER)}>
          <BrandLogos />
        </div>

        <div className="relative flex min-h-0 max-w-full flex-1 flex-col justify-center py-3">
          <div
            className="mb-[clamp(8px,1.5vh,16px)] inline-block text-[11px] uppercase tracking-[.12em] text-[#7ea6f2] animate-float"
            style={{ animationDelay: ".9s" }}
          >
            Repositorio controlado
          </div>
          <p className="mb-[clamp(10px,2vh,20px)] text-balance text-[clamp(34px,9.5vh,104px)] font-extrabold leading-[.98] tracking-[-0.04em] text-white">
            {HEADLINE.map((word, index) => (
              <span key={word.text}>
                <span
                  className={cn("inline-block animate-float", word.accent && "text-[#7ea6f2]")}
                  style={{ animationDelay: word.delay }}
                >
                  {word.text}
                </span>
                {word.breakAfter ? <br /> : index < HEADLINE.length - 1 ? " " : null}
              </span>
            ))}
          </p>
          <p
            className="max-w-[560px] text-pretty text-[clamp(14px,2.3vh,20px)] leading-[1.5] opacity-75 animate-float"
            style={{ animationDuration: "6s", animationDelay: ".7s" }}
          >
            Políticas, procedimientos y registros del sistema de gestión, con trazabilidad completa y control de
            acceso por rol.
          </p>
        </div>

        <div className={cn("relative flex flex-wrap justify-between gap-4 border-t-2 pt-4 text-xs opacity-70", DIVIDER)}>
          <span className="font-semibold">DocumentosV0Z360 · Uso interno</span>
          <span>Conexión cifrada · Sesión auditada</span>
        </div>
      </aside>

      {/* Panel derecho: formulario */}
      <main className="flex flex-col bg-[linear-gradient(180deg,#f4f7fb_0%,#ffffff_60%)] min-[900px]:h-dvh min-[900px]:overflow-auto">
        <div className="flex items-center justify-between gap-4 bg-[#0f2159] px-5 py-3 text-white min-[900px]:hidden">
          <BrandLogos compact />
        </div>

        <div className="flex flex-1 px-4 py-6 sm:px-8 min-[900px]:px-8 min-[900px]:py-5">
          <div className="m-auto w-full max-w-[420px] rounded-[20px] border border-[#eaeef5] bg-white px-6 py-6 shadow-[0_20px_50px_rgba(15,33,89,.10)] animate-fade-in-up sm:px-8 sm:py-7">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
