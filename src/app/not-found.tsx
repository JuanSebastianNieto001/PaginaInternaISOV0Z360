import { NotFoundState } from "@/components/ui/states";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
      <NotFoundState
        className="w-full"
        title="Página no encontrada"
        description="La dirección que has introducido no existe o ha cambiado."
      />
    </div>
  );
}
