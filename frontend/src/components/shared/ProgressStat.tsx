import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

type Props = {
  label: string;
  value: number;
  total: number;
  hint?: string;
  indicatorClassName?: string;
  className?: string;
};

/** Barra de progresso rotulada — ex.: chamados resolvidos, cobranças pagas. */
export function ProgressStat({ label, value, total, hint, indicatorClassName, className }: Props) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">
          {value}/{total} · {pct}%
        </span>
      </div>
      <Progress value={pct} indicatorClassName={indicatorClassName} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
