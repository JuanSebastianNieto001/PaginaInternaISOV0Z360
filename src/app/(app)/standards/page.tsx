import { ArrowRight, BookMarked, Layers } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge, namedColorDot } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, StateBlock } from "@/components/ui/states";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getTaxonomyCounts, getTaxonomyTree } from "@/lib/services/taxonomy.service";
import { createClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Normas" };

export default async function StandardsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  let tree, counts;
  try {
    [tree, counts] = await Promise.all([getTaxonomyTree(supabase), getTaxonomyCounts(supabase)]);
  } catch {
    return <ErrorState />;
  }

  const byStandard = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const bySubcategory = new Map<string, number>();
  for (const c of counts) {
    byStandard.set(c.standard_id, (byStandard.get(c.standard_id) ?? 0) + c.total);
    byCategory.set(c.category_id, (byCategory.get(c.category_id) ?? 0) + c.total);
    if (c.subcategory_id) bySubcategory.set(c.subcategory_id, (bySubcategory.get(c.subcategory_id) ?? 0) + c.total);
  }

  const canManage = can(user, PERMISSIONS.STANDARDS_MANAGE);

  return (
    <>
      <PageHeader
        title="Normas"
        description="Estructura documental por norma, categoría y subcategoría. Haz clic en cualquier nivel para ver sus documentos."
        actions={canManage ? <ButtonLink href="/admin/standards" variant="outline">Gestionar normas</ButtonLink> : undefined}
      />

      {tree.length === 0 ? (
        <StateBlock icon={BookMarked} title="No hay normas configuradas" description="Un administrador debe crear las normas (p. ej. ISO 27001, ISO 9001) para poder clasificar la documentación." action={canManage ? <ButtonLink href="/admin/standards" size="sm">Crear normas</ButtonLink> : undefined} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {tree.map((standard) => (
            <Card key={standard.id} className="overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`mt-1 size-3 shrink-0 rounded-full ${namedColorDot(standard.color)}`} aria-hidden />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-fg">{standard.name}</h2>
                      <Badge color={standard.color} size="sm">{standard.code}</Badge>
                    </div>
                    {standard.description ? <p className="mt-1 text-sm text-fg-muted">{standard.description}</p> : null}
                  </div>
                </div>
                <Link href={`/documents?standard=${standard.id}`} className="shrink-0 text-right">
                  <span className="block text-2xl font-semibold tabular-nums text-fg">{formatNumber(byStandard.get(standard.id) ?? 0)}</span>
                  <span className="text-xs text-fg-subtle">documentos</span>
                </Link>
              </div>
              <CardContent className="p-0">
                {standard.categories.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-fg-subtle">Esta norma aún no tiene categorías.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {standard.categories.map((cat) => (
                      <li key={cat.id} className="px-5 py-3">
                        <Link href={`/documents?standard=${standard.id}&category=${cat.id}`} className="group flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-fg group-hover:text-primary">
                            <Layers className="size-4 shrink-0 text-fg-subtle" />
                            <span className="truncate">{cat.name}</span>
                            <span className="font-mono text-[11px] text-fg-subtle">{cat.code}</span>
                          </span>
                          <span className="flex items-center gap-2 text-sm tabular-nums text-fg-muted">
                            {formatNumber(byCategory.get(cat.id) ?? 0)}
                            <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                          </span>
                        </Link>
                        {cat.subcategories.length > 0 ? (
                          <ul className="mt-2 flex flex-wrap gap-1.5 pl-6">
                            {cat.subcategories.map((sub) => (
                              <li key={sub.id}>
                                <Link href={`/documents?standard=${standard.id}&category=${cat.id}&subcategory=${sub.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-fg-muted transition-colors hover:border-border-strong hover:text-fg">
                                  {sub.name}
                                  <span className="tabular-nums text-fg-subtle">{bySubcategory.get(sub.id) ?? 0}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
