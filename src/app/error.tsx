"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
      <ErrorState
        className="w-full"
        title="Algo ha salido mal"
        description="Se ha producido un error inesperado. Puedes intentarlo de nuevo."
        action={
          <Button onClick={reset} variant="outline" size="sm">
            Reintentar
          </Button>
        }
      />
    </div>
  );
}
