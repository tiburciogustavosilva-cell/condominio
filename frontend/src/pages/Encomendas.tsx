import { useState } from 'react';
import { Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useEncomendas } from '@/hooks/useEncomendas';
import { useUnidades } from '@/hooks/useUnidades';
import { useAuth } from '@/hooks/useAuth';
import { dataHora } from '@/lib/format';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Field } from '@/components/shared/Field';
import { AsyncConfirmDialog } from '@/components/shared/AsyncConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const selectCls =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function Encomendas() {
  const { isSindico } = useAuth();
  const { encomendas, recarregar, criar, entregar, remover } = useEncomendas();
  const { unidades } = useUnidades();
  const [form, setForm] = useState({ unidadeId: '', descricao: '', remetente: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await criar(form);
      toast.success('Encomenda registrada');
      setForm({ unidadeId: '', descricao: '', remetente: '' });
      recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar');
    } finally {
      setLoading(false);
    }
  }

  async function handleEntregar(id: string) {
    try {
      await entregar(id);
      toast.success('Retirada confirmada');
      recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Encomendas" description="Entregas recebidas na portaria." />

      {isSindico && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registrar recebimento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Unidade" htmlFor="uni">
                  <select
                    id="uni"
                    className={selectCls}
                    value={form.unidadeId}
                    onChange={(e) => setForm({ ...form, unidadeId: e.target.value })}
                    required
                  >
                    <option value="">Selecione…</option>
                    {unidades.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.bloco} - {u.numero}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Remetente / transportadora" htmlFor="rem">
                  <Input
                    id="rem"
                    value={form.remetente}
                    onChange={(e) => setForm({ ...form, remetente: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Descrição" htmlFor="desc">
                <Input
                  id="desc"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  required
                />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" variant="brand" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Registrar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {encomendas.length === 0 ? (
          <EmptyState icon={Package} title="Nenhuma encomenda registrada" />
        ) : (
          encomendas.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
                <div className="space-y-1">
                  <p className="font-semibold">{e.descricao}</p>
                  <p className="text-xs text-muted-foreground">
                    {isSindico ? `${e.unidadeLabel} · ` : ''}
                    {e.remetente || 'sem remetente'} · recebida {dataHora(e.criadoEm)}
                  </p>
                  {e.status === 'entregue' && (
                    <p className="text-xs text-muted-foreground">
                      retirada por {e.recebidoPor} · {dataHora(e.entregueEm)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={e.status} />
                  {e.status === 'aguardando' && (
                    <Button size="sm" onClick={() => handleEntregar(e.id)}>
                      Confirmar retirada
                    </Button>
                  )}
                  {isSindico && (
                    <AsyncConfirmDialog
                      trigger={
                        <Button size="sm" variant="ghost">
                          Remover
                        </Button>
                      }
                      title="Remover registro?"
                      confirmLabel="Remover"
                      confirmVariant="destructive"
                      successMessage="Registro removido"
                      onConfirm={() => remover(e.id).then(recarregar)}
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
