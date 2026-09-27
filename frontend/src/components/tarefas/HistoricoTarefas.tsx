import { useState } from "react";
import { History } from "lucide-react";
import {
  fotoTarefaUrl,
  useCadastroTarefas,
  useHistoricoTarefas,
} from "@/hooks/useTarefas";
import { dataHora } from "@/lib/format";
import { LABEL, nomeComFuncao } from "@/types/condominio";
import { EmptyState } from "@/components/shared/EmptyState";
import { Field } from "@/components/shared/Field";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
import { MiniaturaFoto } from "@/components/shared/FotoAutenticada";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Últimas execuções (síndico): quem fez, quando (hora do servidor) e as fotos carimbadas. */
export function HistoricoTarefas() {
  const [tarefaId, setTarefaId] = useState("");
  const [dia, setDia] = useState("");
  const { tarefas } = useCadastroTarefas();
  const { execucoes, carregando } = useHistoricoTarefas(tarefaId, dia);
  const filtrando = !!(tarefaId || dia);

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:max-w-md sm:grid-cols-2">
        <Field label="Tarefa" htmlFor="hist-tarefa">
          <select
            id="hist-tarefa"
            className={selectCls}
            value={tarefaId}
            onChange={(e) => setTarefaId(e.target.value)}
          >
            <option value="">Todas</option>
            {tarefas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.titulo}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dia" htmlFor="hist-dia">
          <Input
            id="hist-dia"
            type="date"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
          />
        </Field>
      </div>

      {carregando ? (
        <ListSkeleton />
      ) : !execucoes.length ? (
        <EmptyState
          icon={History}
          title={
            filtrando
              ? "Nada concluído com esse filtro"
              : "Nenhuma tarefa concluída ainda"
          }
        />
      ) : (
        execucoes.map((e) => (
          <Card key={e.id}>
            <CardContent className="space-y-3 pt-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-semibold">{e.tarefa?.titulo}</p>
                  <p className="text-sm text-muted-foreground">
                    {e.concluidaPor
                      ? nomeComFuncao(e.concluidaPor)
                      : "Funcionário removido"}{" "}
                    · {dataHora(e.concluidaEm)}
                  </p>
                </div>
                {e.tarefa && (
                  <Badge variant="secondary">
                    {LABEL.cargo[e.tarefa.cargo] ?? e.tarefa.cargo}
                  </Badge>
                )}
              </div>
              {e.observacao && <p className="text-sm">{e.observacao}</p>}
              <div className="flex flex-wrap gap-2">
                {e.fotos.map((id, i) => (
                  <MiniaturaFoto
                    key={id}
                    carregar={() => fotoTarefaUrl(id)}
                    alt={`${e.tarefa?.titulo ?? "Tarefa"} — foto ${i + 1}`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
