"use client";

import { Star } from "lucide-react";
import { useOptimistic, useTransition } from "react";

import { toggleFavorite } from "@/lib/actions/favorites.actions";
import { cn } from "@/lib/utils/cn";

import { useToast } from "../providers/toast-provider";
import { Button } from "../ui/button";

export function FavoriteButton({ documentId, initial, showLabel = false }: { documentId: string; initial: boolean; showLabel?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [favorite, setOptimistic] = useOptimistic(initial);
  const toast = useToast();

  const onClick = () => {
    startTransition(async () => {
      setOptimistic(!favorite);
      const result = await toggleFavorite(documentId);
      if (!result.ok) {
        toast.error("No se pudo actualizar favoritos", result.error);
      }
    });
  };

  return (
    <Button
      variant="outline"
      size={showLabel ? "md" : "icon"}
      onClick={onClick}
      disabled={pending}
      aria-pressed={favorite}
      aria-label={favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
      leftIcon={
        <Star className={cn("size-4 transition-colors", favorite ? "fill-warning text-warning" : "text-fg-muted")} />
      }
    >
      {showLabel ? (favorite ? "Favorito" : "Añadir a favoritos") : null}
    </Button>
  );
}
