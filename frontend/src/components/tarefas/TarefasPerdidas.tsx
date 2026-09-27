import { useState } from 'react';
import { CalendarX2 } from 'lucide-react';
import { useTarefasPerdidas } from '@/hooks/useTarefas';
import { dataCurta } from '@/lib/format';
import { LABEL, textoRecorrencia } from '@/types/condominio';
import { EmptyState } from '@/components/shared/EmptyState';
import { Field } from '@/components/shared/Field';
import { ListSkeleton } from '@/components/shared/ListSkeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

/** Relatório de dias em que a tarefa venceu e ninguém concluiu (até ontem — hoje ainda dá tempo). */
export function TarefasPerdidas() {
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const { dados, carregando } = useTarefasPerdidas(de, ate);
  const total = dados?.tarefas.reduce((soma, t) => soma + t.diasPerdidos.length, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:max-w-md sm:grid-cols-2">
        <Field label="De" htmlFor="perd-de">
          <Input id="perd-de" type="date" value={de || dados?.de || ''} onChange={(e) => setDe(e.target.value)} />
        </Field>
        <Field label="Até" htmlFor="perd-ate">
          <Input id="perd-ate" type="date" value={ate || dados?.ate || ''} onChange={(e) => setAte(e.target.value)} />
        </Field>
      </div>

      {carregando || !dados ? (
        <ListSkeleton />
      ) : dados.tarefas.length === 0 ? (
        <EmptyState icon={CalendarX2} title="Nenhum dia sem fazer nesse período" />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {dataCurta(dados.de)} a {dataCurta(dados.ate)} · {total} dia(s) sem fazer em {dados.tarefas.length}{' '}
            tarefa(s)
          </p>
          {dados.tarefas.map((t) => (
            <Card key={t.id}>
              <CardContent className="space-y-3 pt-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-semibold">{t.titulo}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{LABEL.cargo[t.cargo] ?? t.cargo}</Badge>
                      <Badge variant="muted">{textoRecorrencia(t)}</Badge>
                    </div>
                  </div>
                  <Badge variant="destructive">{t.diasPerdidos.length} dia(s) sem fazer</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[...t.diasPerdidos].reverse().map((dia) => (
                    <span
                      key={dia}
                      className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive"
                    >
                      {LABEL.diaSemana[new Date(`${dia}T00:00:00Z`).getUTCDay()]} {dataCurta(dia)}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
