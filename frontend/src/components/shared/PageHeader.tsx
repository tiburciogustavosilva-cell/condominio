import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  backTo?: string;
  className?: string;
};

/** Cabeçalho de página padrão — título Nunito + descrição + ações à direita. */
export function PageHeader({ title, description, actions, backTo, className }: Props) {
  return (
    <div className={cn('mb-6 space-y-3', className)}>
      {backTo && (
        <Link
          to={backTo}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="font-heading text-2xl font-extrabold tracking-tight">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
