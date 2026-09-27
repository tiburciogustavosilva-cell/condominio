import { useParams } from 'react-router-dom';
import { Vote } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAssembleia } from '@/hooks/useAssembleias';
import { dataCurta } from '@/lib/format';
import { EmptyState } from '@/components/shared/EmptyState';
import { ListSkeleton } from '@/components/shared/ListSkeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { PainelSindico } from '@/components/votacoes/PainelSindico';
import { VotacaoCondomino } from '@/components/votacoes/VotacaoCondomino';
import { ResumoAssembleia } from '@/components/votacoes/ResultadoPauta';

/** Uma assembleia ao vivo (atualiza sozinha a cada 2 s). */
export default function Assembleia() {
  const { id } = useParams();
  const { isSindico } = useAuth();
  const acoes = useAssembleia(id);
  const { assembleia: a, erro, carregando } = acoes;

  if (carregando) return <ListSkeleton />;
  if (!a) return <EmptyState icon={Vote} title={erro ?? 'Assembleia não encontrada'} />;

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/votacoes"
        title={a.titulo}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {dataCurta(a.criadoEm)}
            {a.status === 'aberta' ? (
              <Badge variant="success">Acontecendo</Badge>
            ) : (
              <Badge variant="muted">Encerrada · resultado final</Badge>
            )}
          </span>
        }
      />
      {a.status === 'encerrada' && <ResumoAssembleia assembleia={a} />}
      {isSindico ? <PainelSindico assembleia={a} acoes={acoes} /> : <VotacaoCondomino assembleia={a} acoes={acoes} />}
    </div>
  );
}
