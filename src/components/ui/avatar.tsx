import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/format";

export type AvatarTone = "auto" | "brand" | "soft";

export interface AvatarProps {
  name: string | null | undefined;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  /** auto: color derivado del nombre · brand: azul marino · soft: azul claro. */
  tone?: AvatarTone;
  className?: string;
}

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-7 text-[11px]",
  md: "size-9 text-xs",
  lg: "size-12 text-sm",
};

const TONES: Record<Exclude<AvatarTone, "auto">, string> = {
  brand: "bg-brand-900 text-white ring-0",
  soft: "bg-brand-100 text-brand-800 ring-0",
};

/** Avatar con iniciales de respaldo. */
export function Avatar({ name, src, size = "md", tone = "auto", className }: AvatarProps) {
  const label = name || "Usuario";
  const hue = Array.from(label).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
  const auto = tone === "auto" && !src;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-extrabold",
        tone === "auto" ? "text-white ring-1 ring-border" : TONES[tone],
        SIZES[size],
        className,
      )}
      style={auto ? { backgroundColor: `oklch(55% 0.11 ${hue})` } : undefined}
      aria-label={label}
      role="img"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatares externos de tamaño mínimo
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        initials(label)
      )}
    </span>
  );
}
