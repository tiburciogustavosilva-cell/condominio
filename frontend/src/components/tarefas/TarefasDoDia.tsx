import { CheckCircle2, ClipboardCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { fotoTarefaUrl, useTarefasDoDia } from '@/hooks/useTarefas';
import { dataCurta, dataHora } from '@/lib/format';
import { LABEL, nomeComFuncao, textoRecorrencia } from '@/types/condominio';
import { EmptyState } from '@/components/shared/EmptyState';
import { ListSkeleton } from '@/components/shared/ListSkeleton';
import { MiniaturaFoto } from '@/components/shared/FotoAutenticada';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ConcluirTarefa } from './ConcluirTarefa';

/** Tarefas que vencem hoje: funcionário vê as do cargo dele e conclui; síndico acompanha todas. */
export function TarefasDoDia() {
  const { isFuncionario } = useAuth();
  const { data, tarefas, carregando, recarregar, agora, concluir } = useTarefasDoDia();

  if (carregando) return <ListSkeleton />;

  const feitas = tarefas.filter((t) => t.execucao).length;

  return (
    <div className="space-y-3">
      {tarefas.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {dataCurta(data)} · {feitas} de {tarefas.length} concluída(s)
        </p>
      )}
      {tarefas.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Nenhuma tarefa para hoje" />
      ) : (
        tarefas.map((t) => (
          <Card key={t.id} className={t.execucao ? 'opacity-80' : undefined}>
            <CardContent className="space-y-3 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold">{t.titulo}</p>
                  {t.descricao && <p className="text-sm text-muted-foreground">{t.descricao}</p>}
                  <div className="flex flex-wrap gap-2">
                    {!isFuncionario && <Badge variant="secondary">{LABEL.cargo[t.cargo] ?? t.cargo}</Badge>}
                    <Badge variant="muted">{textoRecorrencia(t)}</Badge>
                    {t.atrasada && <Badge variant="destructive">Atrasada desde {dataCurta(t.devidaEm)}</Badge>}
                  </div>
                </div>
                {t.execucao ? (
                  <Badge variant="success" className="shrink-0">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Feita
                  </Badge>
                ) : isFuncionario ? (
                  <ConcluirTarefa tarefa={t} agora={agora} onConcluir={(d) => concluir(t.id, d).then(recarregar)} />
                ) : (
                  <Badge variant="warning" className="shrink-0">
                    Pendente
                  </Badge>
                )}
              </div>

              {t.execucao && (
                <div className="space-y-2 border-t border-border pt-3 text-sm">
                  <p className="text-muted-foreground">
                    {t.execucao.concluidaPor ? nomeComFuncao(t.execucao.concluidaPor) : '—'} ·{' '}
                    {dataHora(t.execucao.concluidaEm)}
                  </p>
                  {t.execucao.observacao && <p>{t.execucao.observacao}</p>}
                  <div className="flex flex-wrap gap-2">
                    {t.execucao.fotos.map((id, i) => (
                      <MiniaturaFoto key={id} carregar={() => fotoTarefaUrl(id)} alt={`${t.titulo} — foto ${i + 1}`} />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
