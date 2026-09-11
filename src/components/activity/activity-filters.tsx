"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AUDIT_ACTION_OPTIONS } from "@/lib/constants/audit";

import { Button } from "../ui/button";
import { Field } from "../ui/field";
import { Input } from "../ui/input";
import { Select } from "../ui/select";

export function ActivityFilters({ action, dateFrom, dateTo }: { action?: string; dateFrom?: string; dateTo?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = (patch: Record<string, string | undefined>) => {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const hasFilters = Boolean(action || dateFrom || dateTo);

  return (
    <div className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
      <Field label="Acción">
        <Select value={action ?? ""} onChange={(e) => update({ action: e.target.value })} placeholder="Todas las acciones" options={AUDIT_ACTION_OPTIONS} />
      </Field>
      <Field label="Desde">
        <Input type="date" value={dateFrom ?? ""} onChange={(e) => update({ from: e.target.value })} />
      </Field>
      <Field label="Hasta">
        <Input type="date" value={dateTo ?? ""} onChange={(e) => update({ to: e.target.value })} />
      </Field>
      <Button variant="ghost" disabled={!hasFilters} onClick={() => router.replace(pathname)}>
        Limpiar
      </Button>
    </div>
  );
}
