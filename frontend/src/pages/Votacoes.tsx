import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, Vote } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAssembleias } from '@/hooks/useAssembleias';
import { dataCurta } from '@/lib/format';
import { EmptyState } from '@/components/shared/EmptyState';
import { ListSkeleton } from '@/components/shared/ListSkeleton';
import { PageHeader, Resumo } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormAssembleia } from '@/components/votacoes/FormAssembleia';

/** Assembleias do condomínio: síndico cria e conduz; condômino entra para fazer check-in e votar. */
export default function Votacoes() {
  const { isSindico } = useAuth();
  const navigate = useNavigate();
  const { assembleias, carregando } = useAssembleias();
  const [formAberto, setFormAberto] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Votações"
        description={
          isSindico
            ? 'Crie a assembleia, projete o código de presença e abra a votação de cada pauta.'
            : 'Na reunião, entre na assembleia, digite o código mostrado na tela e vote.'
        }
        actions={
          isSindico && (
            <Button variant="brand" onClick={() => setFormAberto(true)}>
              <Plus className="h-4 w-4" /> Nova assembleia
            </Button>
          )
        }
      >
        {!carregando && <Resumo n={assembleias.length} um="assembleia" varios="assembleias" />}
      </PageHeader>
      {isSindico && (
        <FormAssembleia
          aberto={formAberto}
          onFechar={() => setFormAberto(false)}
          onCriada={(id) => navigate(`/votacoes/${id}`)}
        />
      )}

      {carregando ? (
        <ListSkeleton />
      ) : assembleias.length === 0 ? (
        <EmptyState icon={Vote} title="Nenhuma assembleia ainda" />
      ) : (
        <div className="space-y-3">
          {assembleias.map((a) => (
            <Link key={a.id} to={`/votacoes/${a.id}`} className="block">
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="flex items-center justify-between gap-3 pt-5">
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold">{a.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {dataCurta(a.criadoEm)} · {a.pautas} pauta(s) · {a.presentes} unidade(s) presentes
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {a.status === 'aberta' ? (
                      <Badge variant="success">Acontecendo</Badge>
                    ) : (
                      <Badge variant="muted">Encerrada</Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
