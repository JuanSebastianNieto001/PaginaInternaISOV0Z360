"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme, type Theme } from "@/components/providers/theme-provider";

import { Button } from "../ui/button";
import { Tooltip } from "../ui/tooltip";

const ORDER: Theme[] = ["light", "dark", "system"];
const LABELS: Record<Theme, string> = { light: "Tema claro", dark: "Tema oscuro", system: "Tema del sistema" };

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length] ?? "system";

  return (
    <Tooltip content={LABELS[theme]} side="bottom">
      <Button variant="ghost" size="icon" onClick={() => setTheme(next)} aria-label={`Cambiar tema (actual: ${LABELS[theme]})`}>
        <Icon className="size-4.5" />
      </Button>
    </Tooltip>
  );
}
