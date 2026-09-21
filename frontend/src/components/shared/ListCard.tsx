import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

type Props = {
  to?: string;
  onClick?: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

/** Card de lista clicável — título + subtítulo + meta, chevron à direita. */
export function ListCard({ to, onClick, title, subtitle, meta, trailing, className }: Props) {
  const inner = (
    <Card
      className={cn(
        'flex items-center gap-4 p-4 transition-all',
        (to || onClick) && 'cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md',
        className
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold">{title}</p>
        </div>
        {subtitle && <p className="line-clamp-2 text-sm text-muted-foreground">{subtitle}</p>}
        {meta && <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">{meta}</div>}
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
      {(to || onClick) && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </Card>
  );

  if (to) return <Link to={to}>{inner}</Link>;
  if (onClick)
    return (
      <button type="button" onClick={onClick} className="w-full text-left">
        {inner}
      </button>
    );
  return inner;
}
