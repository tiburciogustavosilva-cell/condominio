import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { salvarTarefa, type DadosTarefa } from '@/hooks/useTarefas';
import { LABEL, type Tarefa } from '@/types/condominio';
import { cn } from '@/lib/utils';
import { Field } from '@/components/shared/Field';
import { BotaoDitado, juntarDitado } from '@/components/shared/BotaoDitado';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const selectCls =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const VAZIO: DadosTarefa = {
  titulo: '',
  descricao: '',
  cargo: 'zelador',
  recorrencia: 'semanal',
  diasSemana: [1],
  diaMes: 1,
  data: null,
  ativa: true
};

type Props = {
  aberto: boolean;
  /** Tarefa a editar; sem ela, cria uma nova. */
  tarefa?: Tarefa | null;
  onFechar: () => void;
  onSalvo: () => void;
};

/** Modal de criar/editar tarefa (usado pelo botão do cabeçalho e pelo "Editar" da lista). */
export function FormTarefa({ aberto, tarefa, onFechar, onSalvo }: Props) {
  const [form, setForm] = useState<DadosTarefa>(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const editandoId = tarefa?.id ?? null;
  // já executada: a agenda fica travada (o backend recusa), senão o relatório de perdidas mudaria o passado
  const agendaTravada = !!tarefa?.execucoes;

  // a cada abertura, começa do zero ou dos dados da tarefa editada
  useEffect(() => {
    if (aberto) setForm(tarefa ? { ...VAZIO, ...tarefa, diaMes: tarefa.diaMes ?? 1 } : VAZIO);
  }, [aberto, tarefa]);

  const set = <K extends keyof DadosTarefa>(campo: K, valor: DadosTarefa[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  function alternarDia(dia: number) {
    set(
      'diasSemana',
      form.diasSemana.includes(dia) ? form.diasSemana.filter((d) => d !== dia) : [...form.diasSemana, dia]
    );
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await salvarTarefa(editandoId, form);
      toast.success(editandoId ? 'Tarefa atualizada' : 'Tarefa criada');
      onFechar();
      onSalvo();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !salvando && !v && onFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editandoId ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <Field label="Tarefa" htmlFor="t-titulo">
            <Input
              id="t-titulo"
              placeholder="Ex.: Lavar a garagem"
              value={form.titulo}
              onChange={(e) => set('titulo', e.target.value)}
              required
            />
          </Field>
          <Field label="Instruções (opcional)" htmlFor="t-desc">
            <div className="flex gap-2">
              <Input id="t-desc" value={form.descricao} onChange={(e) => set('descricao', e.target.value)} />
              <BotaoDitado
                onTexto={(texto) =>
                  setForm((f) => ({
                    ...f,
                    descricao: juntarDitado(f.descricao, texto)
                  }))
                }
              />
            </div>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cargo" htmlFor="t-cargo" hint="Qualquer funcionário desse cargo pode concluir.">
              <select
                id="t-cargo"
                className={selectCls}
                value={form.cargo}
                onChange={(e) => set('cargo', e.target.value as DadosTarefa['cargo'])}
              >
                {Object.entries(LABEL.cargo).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Repetição"
              htmlFor="t-rec"
              hint={agendaTravada ? 'Já foi feita antes: para mudar, pause esta e crie outra.' : undefined}
            >
              <select
                id="t-rec"
                className={selectCls}
                disabled={agendaTravada}
                value={form.recorrencia}
                onChange={(e) => set('recorrencia', e.target.value as DadosTarefa['recorrencia'])}
              >
                {Object.entries(LABEL.recorrencia).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {form.recorrencia === 'semanal' && (
            <Field label="Dias" htmlFor="t-dias">
              <fieldset id="t-dias" disabled={agendaTravada} className="flex flex-wrap gap-2 disabled:opacity-60">
                {LABEL.diaSemana.map((rotulo, dia) => (
                  <button
                    key={dia}
                    type="button"
                    aria-pressed={form.diasSemana.includes(dia)}
                    onClick={() => alternarDia(dia)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                      form.diasSemana.includes(dia)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-muted-foreground hover:bg-accent'
                    )}
                  >
                    {rotulo}
                  </button>
                ))}
              </fieldset>
            </Field>
          )}
          {form.recorrencia === 'mensal' && (
            <Field label="Dia do mês" htmlFor="t-diames" hint="Em meses mais curtos, cai no último dia.">
              <Input
                id="t-diames"
                type="number"
                min={1}
                max={31}
                value={form.diaMes ?? 1}
                onChange={(e) => set('diaMes', Number(e.target.value))}
                disabled={agendaTravada}
                required
              />
            </Field>
          )}
          {form.recorrencia === 'unica' && (
            <Field label="Data" htmlFor="t-data">
              <Input
                id="t-data"
                type="date"
                value={form.data ?? ''}
                onChange={(e) => set('data', e.target.value)}
                disabled={agendaTravada}
                required
              />
            </Field>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={form.ativa}
              onChange={(e) => set('ativa', e.target.checked)}
            />
            Ativa (desmarque para pausar sem perder o histórico)
          </label>

          <div className="flex justify-end">
            <Button type="submit" variant="brand" disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
              {editandoId ? 'Salvar' : 'Criar tarefa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
