import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { useChamados } from '@/hooks/useChamados';
import { useAuth } from '@/hooks/useAuth';
import { dataCurta } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Chamado, StatusChamado } from '@/types/condominio';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { PrioridadeBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const COLUNAS: { status: StatusChamado; titulo: string }[] = [
  { status: 'aberto', titulo: 'Em aberto' },
  { status: 'em_andamento', titulo: 'Pendente' },
  { status: 'concluido', titulo: 'Encerrado' }
];

const BORDA_PRIORIDADE: Record<string, string> = {
  alta: 'border-l-destructive',
  media: 'border-l-warning',
  baixa: 'border-l-info'
};

export default function Chamados() {
  const { isSindico } = useAuth();
  const { chamados, carregando, atualizarStatus } = useChamados();
  const [colunaSobre, setColunaSobre] = useState<StatusChamado | null>(null);

  const porStatus = useMemo(() => {
    const grupos: Record<StatusChamado, Chamado[]> = { aberto: [], em_andamento: [], concluido: [] };
    for (const c of chamados ?? []) grupos[c.status]?.push(c);
    return grupos;
  }, [chamados]);

  async function soltarEm(status: StatusChamado, e: React.DragEvent) {
    e.preventDefault();
    setColunaSobre(null);
    if (!isSindico) return;
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    try {
      await atualizarStatus(id, status);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao mover o chamado');
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Chamados"
        description="Solicitações de manutenção e ocorrências."
        actions={
          <Button asChild variant="brand">
            <Link to="/chamados/novo">
              <Plus className="h-4 w-4" /> Novo chamado
            </Link>
          </Button>
        }
      />

      {carregando ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {COLUNAS.map((col) => (
            <div key={col.status} className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ))}
        </div>
      ) : chamados?.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Nenhum chamado por aqui"
          description="Abra um chamado para registrar uma ocorrência ou pedido de manutenção."
          action={
            <Button asChild variant="brand">
              <Link to="/chamados/novo">
                <Plus className="h-4 w-4" /> Novo chamado
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible">
          {COLUNAS.map((col) => {
            const itens = porStatus[col.status];
            return (
              <div
                key={col.status}
                onDragOver={(e) => {
                  if (!isSindico) return;
                  e.preventDefault();
                  setColunaSobre(col.status);
                }}
                onDragLeave={() => setColunaSobre((atual) => (atual === col.status ? null : atual))}
                onDrop={(e) => soltarEm(col.status, e)}
                className={cn(
                  'w-72 shrink-0 space-y-3 rounded-lg border border-transparent p-1 transition-colors sm:w-auto',
                  colunaSobre === col.status && 'border-primary/40 bg-primary/5'
                )}
              >
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-sm font-bold">{col.titulo}</h3>
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-muted px-1.5 text-xs font-semibold text-muted-foreground">
                    {itens.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {itens.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                      Nenhum chamado aqui
                    </div>
                  )}
                  {itens.map((c) => (
                    <CartaoChamado
                      key={c.id}
                      chamado={c}
                      arrastavel={isSindico}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CartaoChamado({ chamado, arrastavel }: { chamado: Chamado; arrastavel: boolean }) {
  return (
    <div
      draggable={arrastavel}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', chamado.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={cn(
        'rounded-lg border border-l-4 border-border bg-card shadow-sm transition-shadow hover:shadow-md',
        BORDA_PRIORIDADE[chamado.prioridade] ?? 'border-l-muted',
        arrastavel && 'cursor-grab active:cursor-grabbing'
      )}
    >
      <Link to={`/chamados/${chamado.id}`} draggable={false} className="block space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-snug">{chamado.titulo}</p>
          <PrioridadeBadge nivel={chamado.prioridade} className="shrink-0" />
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">{chamado.descricao}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="capitalize">{chamado.categoria}</span>
          <span>{dataCurta(chamado.criadoEm)}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{chamado.autorNome}</p>
      </Link>
    </div>
  );
}
