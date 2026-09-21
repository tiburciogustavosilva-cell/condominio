import { useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUnidades } from '@/hooks/useUnidades';
import type { Unidade } from '@/types/condominio';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Field } from '@/components/shared/Field';
import { AsyncConfirmDialog } from '@/components/shared/AsyncConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const VAZIO = { numero: '', bloco: '', tipo: 'apartamento', fracaoIdeal: '' };
const selectCls =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function Unidades() {
  const { unidades, recarregar, criar, atualizar, remover } = useUnidades();
  const [form, setForm] = useState<any>(VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(campo: string, valor: string) {
    setForm((f: any) => ({ ...f, [campo]: valor }));
  }

  function editar(u: Unidade) {
    setEditandoId(u.id);
    setForm({ numero: u.numero, bloco: u.bloco, tipo: u.tipo, fracaoIdeal: u.fracaoIdeal ?? '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setForm(VAZIO);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (editandoId) {
        await atualizar(editandoId, form);
        toast.success('Unidade atualizada');
      } else {
        await criar(form);
        toast.success('Unidade cadastrada');
      }
      cancelarEdicao();
      recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Unidades" description="Apartamentos, lojas e demais unidades do condomínio." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editandoId ? 'Editar unidade' : 'Nova unidade'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Número / identificação" htmlFor="numero">
                <Input id="numero" value={form.numero} onChange={(e) => set('numero', e.target.value)} required />
              </Field>
              <Field label="Bloco" htmlFor="bloco">
                <Input id="bloco" value={form.bloco} onChange={(e) => set('bloco', e.target.value)} />
              </Field>
              <Field label="Tipo" htmlFor="tipo">
                <select
                  id="tipo"
                  className={selectCls}
                  value={form.tipo}
                  onChange={(e) => set('tipo', e.target.value)}
                >
                  <option value="apartamento">Apartamento</option>
                  <option value="casa">Casa</option>
                  <option value="comercial">Comercial</option>
                  <option value="garagem">Garagem</option>
                </select>
              </Field>
              <Field label="Fração ideal (%)" htmlFor="fracao">
                <Input
                  id="fracao"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.fracaoIdeal}
                  onChange={(e) => set('fracaoIdeal', e.target.value)}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              {editandoId && (
                <Button type="button" variant="outline" onClick={cancelarEdicao}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" variant="brand" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {editandoId ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {unidades.length === 0 ? (
        <EmptyState icon={Building2} title="Nenhuma unidade cadastrada" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {unidades.map((u) => (
            <Card key={u.id}>
              <CardContent className="space-y-2 pt-5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">
                    {u.bloco} · {u.numero}
                  </p>
                  <Badge variant="outline" className="capitalize">
                    {u.tipo}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Fração ideal: {u.fracaoIdeal ? `${u.fracaoIdeal}%` : '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Moradores: {u.moradores?.length ? u.moradores.join(', ') : '—'}
                </p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => editar(u)}>
                    Editar
                  </Button>
                  <AsyncConfirmDialog
                    trigger={
                      <Button size="sm" variant="ghost">
                        Remover
                      </Button>
                    }
                    title={`Remover unidade ${u.bloco} ${u.numero}?`}
                    confirmLabel="Remover"
                    confirmVariant="destructive"
                    successMessage="Unidade removida"
                    onConfirm={() => remover(u.id).then(recarregar)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
