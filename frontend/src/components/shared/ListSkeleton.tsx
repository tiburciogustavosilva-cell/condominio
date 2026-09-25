import { Skeleton } from '@/components/ui/skeleton';

/** Placeholder de lista enquanto carrega — evita mostrar o EmptyState antes dos dados chegarem. */
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-20" />
      ))}
    </div>
  );
}
