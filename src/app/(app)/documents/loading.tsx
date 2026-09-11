import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function DocumentsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando repositorio">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-9 w-full" />
      <div className="hidden gap-3 md:grid md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
      <SkeletonTable rows={8} cols={6} />
    </div>
  );
}
