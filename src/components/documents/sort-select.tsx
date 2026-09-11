"use client";

import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DOCUMENT_SORT_FIELDS } from "@/lib/constants/documents";
import type { DocumentSortField, SortDirection } from "@/types";

import { Button } from "../ui/button";
import { Select } from "../ui/select";

export function SortSelect({ sort, direction }: { sort: DocumentSortField; direction: SortDirection }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = (nextSort: string, nextDir: SortDirection) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("sort", nextSort);
    sp.set("dir", nextDir);
    sp.delete("page");
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  };

  return (
    <div className="flex items-center gap-1.5">
      <Select
        aria-label="Ordenar por"
        value={sort}
        onChange={(e) => update(e.target.value, direction)}
        options={DOCUMENT_SORT_FIELDS}
        className="h-8 w-44 text-xs"
      />
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => update(sort, direction === "asc" ? "desc" : "asc")}
        aria-label={direction === "asc" ? "Orden ascendente" : "Orden descendente"}
      >
        {direction === "asc" ? <ArrowUpAZ className="size-4" /> : <ArrowDownAZ className="size-4" />}
      </Button>
    </div>
  );
}
