import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/format";

export interface AvatarProps {
  name: string | null | undefined;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-7 text-[11px]",
  md: "size-9 text-xs",
  lg: "size-12 text-sm",
};

/** Avatar con iniciales de respaldo y color derivado del nombre. */
export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const label = name || "Usuario";
  const hue = Array.from(label).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold text-white ring-1 ring-border",
        SIZES[size],
        className,
      )}
      style={src ? undefined : { backgroundColor: `oklch(55% 0.11 ${hue})` }}
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
