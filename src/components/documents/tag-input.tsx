"use client";

import { X } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "@/lib/utils/cn";
import { inputClasses } from "../ui/input";

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  max?: number;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
}

/** Entrada de etiquetas con chips, sugerencias y creación libre (Enter / coma). */
export function TagInput({ value, onChange, suggestions = [], max = 15, disabled, id, placeholder = "Añade una etiqueta y pulsa Enter" }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const listId = useId();

  const add = (raw: string) => {
    const name = raw.trim().replace(/,+$/, "").slice(0, 40);
    if (!name) return;
    const exists = value.some((t) => t.toLowerCase() === name.toLowerCase());
    if (exists || value.length >= max) {
      setDraft("");
      return;
    }
    onChange([...value, name]);
    setDraft("");
  };

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  const filtered = suggestions
    .filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()))
    .filter((s) => (draft ? s.toLowerCase().includes(draft.toLowerCase()) : true))
    .slice(0, 8);

  return (
    <div className={cn(inputClasses(false), "h-auto min-h-9 flex-wrap gap-1.5 py-1.5", disabled && "opacity-60")}>
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">
          {tag}
          <button
            type="button"
            onClick={() => remove(tag)}
            disabled={disabled}
            className="rounded-full p-px hover:bg-primary/15"
            aria-label={`Quitar etiqueta ${tag}`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        list={listId}
        value={draft}
        disabled={disabled || value.length >= max}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(",")) add(v);
          else setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && value.length > 0) {
            remove(value[value.length - 1] as string);
          }
        }}
        onBlur={() => draft && add(draft)}
        placeholder={value.length === 0 ? placeholder : ""}
        className="min-w-32 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-subtle"
        aria-label="Etiquetas"
      />
      <datalist id={listId}>
        {filtered.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}
