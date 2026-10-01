import { Skeleton } from '@/components/ui/skeleton';

/** Placeholder de lista enquanto carrega — evita mostrar o EmptyState antes dos dados chegarem.
 * Só aparece após 300ms: resposta rápida vai direto pro conteúdo, sem piscar o skeleton. */
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 animate-in fade-in fill-mode-both delay-300">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-20" />
      ))}
    </div>
  );
}
