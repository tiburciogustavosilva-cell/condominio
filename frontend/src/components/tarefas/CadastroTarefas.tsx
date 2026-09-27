import { ClipboardCheck } from 'lucide-react';
import { useCadastroTarefas } from '@/hooks/useTarefas';
import { LABEL, textoRecorrencia, type Tarefa } from '@/types/condominio';
import { EmptyState } from '@/components/shared/EmptyState';
import { ListSkeleton } from '@/components/shared/ListSkeleton';
import { AsyncConfirmDialog } from '@/components/shared/AsyncConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/** Lista de tarefas cadastradas (síndico). Criar/editar abre o FormTarefa da página. */
export function CadastroTarefas({ onEditar }: { onEditar: (tarefa: Tarefa) => void }) {
  const { tarefas, carregando, recarregar, remover } = useCadastroTarefas();

  return (
    <div className="space-y-3">
      {carregando ? (
        <ListSkeleton />
      ) : tarefas.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Nenhuma tarefa cadastrada" />
      ) : (
        tarefas.map((t) => (
          <Card key={t.id} className={t.ativa ? undefined : 'opacity-60'}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
              <div className="min-w-0 space-y-1">
                <p className="font-semibold">{t.titulo}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{LABEL.cargo[t.cargo] ?? t.cargo}</Badge>
                  <Badge variant="muted">{textoRecorrencia(t)}</Badge>
                  {!t.ativa && <Badge variant="outline">Pausada</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">Concluída {t.execucoes ?? 0} vez(es)</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => onEditar(t)}>
                  Editar
                </Button>
                <AsyncConfirmDialog
                  trigger={
                    <Button size="sm" variant="ghost">
                      Excluir
                    </Button>
                  }
                  title={`Excluir "${t.titulo}"?`}
                  description={
                    t.execucoes
                      ? 'Essa tarefa já tem execuções com fotos e não pode ser excluída. Edite e desmarque "Ativa" para pausá-la.'
                      : 'A tarefa some da lista dos funcionários.'
                  }
                  confirmLabel="Excluir"
                  confirmVariant="destructive"
                  successMessage="Tarefa excluída"
                  onConfirm={() => remover(t.id).then(recarregar)}
                />
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
