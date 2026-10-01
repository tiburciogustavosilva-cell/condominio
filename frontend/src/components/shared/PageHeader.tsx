import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  /** Não aparece na tela: vai pra aba do navegador e pro leitor de tela. */
  title: string;
  /** Não é exibida (cabeçalho visual removido); mantida para não mexer nas páginas. */
  description?: ReactNode;
  actions?: ReactNode;
  /** Lado esquerdo da barra: filtros, busca ou um resumo curto da página. */
  children?: ReactNode;
  backTo?: string;
  className?: string;
};

/** Barra do topo da página: [Voltar · filtros/busca/resumo] à esquerda, ações à direita. */
export function PageHeader({ title, actions, children, backTo, className }: Props) {
  useEffect(() => {
    document.title = `${title} · Áquila Condomínios`;
  }, [title]);

  // nada visível: não ocupa espaço (o título já está na aba do navegador)
  if (!actions && !backTo && !children) return null;

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <h2 className="sr-only">{title}</h2>
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {backTo && (
          <Link
            to={backTo}
            className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Link>
        )}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Resumo discreto pro lado esquerdo da barra, ex.: "3 avisos". */
export function Resumo({ n, um, varios }: { n: number; um: string; varios: string }) {
  return <p className="text-sm text-muted-foreground">{n === 1 ? `1 ${um}` : `${n} ${varios}`}</p>;
}
