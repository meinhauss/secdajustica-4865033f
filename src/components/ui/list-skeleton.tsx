import { Skeleton } from "@/components/ui/skeleton";

interface ListSkeletonProps {
  rows?: number;
  /** Altura de cada linha em px */
  height?: number;
  /** Mostrar segunda linha menor (subtítulo) */
  withSubline?: boolean;
}

/**
 * Skeleton reutilizável para listas (processos, audiências, ranking, etc).
 * Substitui spinners genéricos por placeholders com percepção de velocidade.
 */
export function ListSkeleton({ rows = 6, height = 72, withSubline = true }: ListSkeletonProps) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card/40 p-4 flex items-center gap-4"
          style={{ minHeight: height }}
        >
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5" />
            {withSubline && <Skeleton className="h-3 w-2/5" />}
          </div>
          <Skeleton className="h-6 w-16 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}
