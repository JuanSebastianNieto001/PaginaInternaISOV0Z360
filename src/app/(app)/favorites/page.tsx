import { Star } from "lucide-react";
import type { Metadata } from "next";

import { DocumentCard } from "@/components/documents/document-card";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, StateBlock } from "@/components/ui/states";
import { requireUser } from "@/lib/auth/session";
import { getFavoriteDocuments } from "@/lib/services/favorites.service";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Favoritos" };

export default async function FavoritesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  let favorites;
  try {
    favorites = await getFavoriteDocuments(supabase, user.id);
  } catch {
    return <ErrorState />;
  }

  return (
    <>
      <PageHeader title="Favoritos" description="Tu selección personal de documentos. Solo tú puedes verla." />
      {favorites.length === 0 ? (
        <StateBlock
          icon={Star}
          title="No tienes favoritos"
          description="Marca documentos con la estrella desde su página de detalle para tenerlos siempre a mano."
          action={<ButtonLink href="/documents" variant="outline" size="sm">Explorar el repositorio</ButtonLink>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      )}
    </>
  );
}
