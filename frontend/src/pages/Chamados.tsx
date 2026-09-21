import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Wrench } from 'lucide-react';
import { useChamados } from '@/hooks/useChamados';
import { dataCurta } from '@/lib/format';
import { PageHeader } from '@/components/shared/PageHeader';
import { FilterPills } from '@/components/shared/FilterPills';
import { ListCard } from '@/components/shared/ListCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge, PrioridadeBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const FILTROS = [
  { value: '', label: 'Todos' },
  { value: 'aberto', label: 'Abertos' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluido', label: 'Concluídos' }
];

export default function Chamados() {
  const [filtro, setFiltro] = useState('');
  const { chamados, carregando } = useChamados(filtro);

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

      <FilterPills options={FILTROS} value={filtro} onChange={setFiltro} />

      {carregando ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
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
        <div className="space-y-3">
          {chamados?.map((c) => (
            <ListCard
              key={c.id}
              to={`/chamados/${c.id}`}
              title={c.titulo}
              subtitle={c.descricao}
              meta={
                <>
                  <span className="capitalize">{c.categoria}</span>
                  <span>·</span>
                  <span>{c.autorNome}</span>
                  <span>·</span>
                  <span>{dataCurta(c.criadoEm)}</span>
                </>
              }
              trailing={
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge status={c.status} />
                  <PrioridadeBadge nivel={c.prioridade} />
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
