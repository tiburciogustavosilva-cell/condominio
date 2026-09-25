import { useState } from 'react';
import { CalendarRange, Loader2, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import { useReservas } from '@/hooks/useReservas';
import { useAuth } from '@/hooks/useAuth';
import { moeda, dataCurta } from '@/lib/format';
import { LABEL } from '@/types/condominio';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Field } from '@/components/shared/Field';
import { DatePicker } from '@/components/shared/DatePicker';
import { AsyncConfirmDialog } from '@/components/shared/AsyncConfirmDialog';
import { FilterPills } from '@/components/shared/FilterPills';
import { ReservasCalendario, type ModoCalendario } from '@/components/reservas/ReservasCalendario';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ListSkeleton } from '@/components/shared/ListSkeleton';

const VISOES = [
  { value: 'mes', label: 'Calendário' },
  { value: 'semana', label: 'Semana' },
  { value: 'dia', label: 'Dia' },
  { value: 'lista', label: 'Lista' }
];

const selectCls =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const hoje = new Date();

export default function Reservas() {
  const { isSindico } = useAuth();
  const { reservas, areas, carregando, recarregar, criar, atualizarStatus, cancelar } = useReservas();
  const [form, setForm] = useState({ areaId: '', data: '', periodo: 'tarde', observacao: '' });
  const [loading, setLoading] = useState(false);
  const [visao, setVisao] = useState<ModoCalendario | 'lista'>('mes');
  const [dataRef, setDataRef] = useState(new Date());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await criar(form);
      toast.success('Solicitação enviada');
      setForm({ areaId: '', data: '', periodo: 'tarde', observacao: '' });
      recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao solicitar');
    } finally {
      setLoading(false);
    }
  }

  async function decidir(id: string, status: string) {
    try {
      await atualizarStatus(id, status);
      toast.success('Reserva atualizada');
      recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reservas" description="Agendamento das áreas comuns do condomínio." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {areas.map((a) => (
          <Card key={a.id}>
            <CardContent className="space-y-1 pt-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{a.nome}</p>
                <Badge variant={a.taxa ? 'secondary' : 'success'}>
                  {a.taxa ? moeda(a.taxa) : 'Sem taxa'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{a.descricao}</p>
              <p className="text-xs text-muted-foreground">
                {a.horario} · até {a.capacidade} pessoas
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-4 w-4" /> Solicitar reserva
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Área" htmlFor="area">
                <select
                  id="area"
                  className={selectCls}
                  value={form.areaId}
                  onChange={(e) => setForm({ ...form, areaId: e.target.value })}
                  required
                >
                  <option value="">Selecione…</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Data">
                <DatePicker
                  value={form.data}
                  onChange={(v) => setForm({ ...form, data: v })}
                  disabledBefore={hoje}
                />
              </Field>
              <Field label="Período" htmlFor="periodo">
                <select
                  id="periodo"
                  className={selectCls}
                  value={form.periodo}
                  onChange={(e) => setForm({ ...form, periodo: e.target.value })}
                >
                  {Object.entries(LABEL.periodo).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Observação" htmlFor="obs">
              <Input
                id="obs"
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" variant="brand" disabled={loading || !form.data}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Solicitar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <FilterPills options={VISOES} value={visao} onChange={(v) => setVisao(v as ModoCalendario | 'lista')} />

        {carregando ? (
          <ListSkeleton />
        ) : visao !== 'lista' ? (
          <ReservasCalendario
            modo={visao}
            dataRef={dataRef}
            onDataRefChange={setDataRef}
            onSelecionarDia={(d) => {
              setDataRef(d);
              setVisao('dia');
            }}
            reservas={reservas}
            isSindico={isSindico}
          />
        ) : reservas.length === 0 ? (
          <EmptyState icon={PartyPopper} title="Nenhuma reserva ainda" />
        ) : (
          reservas.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
                <div className="space-y-1">
                  <p className="font-semibold">{r.areaNome}</p>
                  <p className="text-xs text-muted-foreground">
                    {dataCurta(r.data)} · {LABEL.periodo[r.periodo] ?? r.periodo}
                    {isSindico && r.solicitante ? ` · ${r.solicitante} (${r.unidadeLabel})` : ''}
                  </p>
                  {r.observacao && <p className="text-xs text-muted-foreground">“{r.observacao}”</p>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  {isSindico && r.status === 'pendente' && (
                    <>
                      <Button size="sm" onClick={() => decidir(r.id, 'aprovada')}>
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => decidir(r.id, 'rejeitada')}
                      >
                        Rejeitar
                      </Button>
                    </>
                  )}
                  {!['cancelada', 'rejeitada'].includes(r.status) &&
                    (r.status === 'pendente' || isSindico) && (
                      <AsyncConfirmDialog
                        trigger={
                          <Button size="sm" variant="ghost">
                            Cancelar
                          </Button>
                        }
                        title="Cancelar reserva?"
                        description="A solicitação será marcada como cancelada."
                        confirmLabel="Cancelar reserva"
                        confirmVariant="destructive"
                        successMessage="Reserva cancelada"
                        onConfirm={() => cancelar(r.id).then(recarregar)}
                      />
                    )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
