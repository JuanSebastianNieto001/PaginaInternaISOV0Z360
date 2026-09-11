import type { Metadata } from "next";
import { Suspense } from "react";

import { CategoriesManager } from "@/components/admin/categories-manager";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getTaxonomyCounts, getTaxonomyTree } from "@/lib/services/taxonomy.service";
import { createClient } from "@/lib/supabase/server";
import { asUuid, type SearchParams } from "@/lib/utils/url";

export const metadata: Metadata = { title: "Categorías" };

export default async function AdminCategoriesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [{ user, allowed }, params] = await Promise.all([requirePermission(PERMISSIONS.CATEGORIES_MANAGE), searchParams]);
  if (!allowed) return <ForbiddenState description="Tu rol no permite gestionar categorías." />;

  const supabase = await createClient();
  let tree, counts;
  try {
    [tree, counts] = await Promise.all([getTaxonomyTree(supabase, { includeInactive: true }), getTaxonomyCounts(supabase)]);
  } catch {
    return <ErrorState />;
  }

  const byCategory: Record<string, number> = {};
  const bySubcategory: Record<string, number> = {};
  for (const c of counts) {
    byCategory[c.category_id] = (byCategory[c.category_id] ?? 0) + c.total;
    if (c.subcategory_id) bySubcategory[c.subcategory_id] = (bySubcategory[c.subcategory_id] ?? 0) + c.total;
  }

  const selected = asUuid(params.standard) ?? tree[0]?.id;

  return (
    <>
      <PageHeader title="Categorías y subcategorías" description="Estructura jerárquica por norma. Las categorías inactivas se ocultan en filtros y formularios sin perder los documentos." />
      {tree.length === 0 ? (
        <EmptyState title="Primero crea una norma" description="Las categorías dependen de una norma." action={can(user, PERMISSIONS.STANDARDS_MANAGE) ? <ButtonLink href="/admin/standards" size="sm">Ir a normas</ButtonLink> : undefined} />
      ) : (
        <Suspense>
          <CategoriesManager tree={tree} selectedStandardId={selected ?? ""} categoryCounts={byCategory} subcategoryCounts={bySubcategory} />
        </Suspense>
      )}
    </>
  );
}
