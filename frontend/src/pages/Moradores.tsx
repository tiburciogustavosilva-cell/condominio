import { useState } from 'react';
import { Info, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useMoradores } from '@/hooks/useMoradores';
import { useUnidades } from '@/hooks/useUnidades';
import { LABEL } from '@/types/condominio';
import type { Morador } from '@/types/condominio';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Field } from '@/components/shared/Field';
import { AsyncConfirmDialog } from '@/components/shared/AsyncConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const selectCls =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function Moradores() {
  const { moradores, recarregar, atualizar, remover } = useMoradores();
  const { unidades } = useUnidades();
  const [form, setForm] = useState({ nome: '', telefone: '', unidadeId: '', papel: 'condomino' });
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(campo: string, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function editar(m: Morador) {
    setEditandoId(m.id);
    setForm({ nome: m.nome, telefone: m.telefone || '', unidadeId: m.unidadeId || '', papel: m.papel });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setForm({ nome: '', telefone: '', unidadeId: '', papel: 'condomino' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editandoId) return;
    setLoading(true);
    try {
      await atualizar(editandoId, {
        nome: form.nome,
        telefone: form.telefone,
        papel: form.papel,
        unidadeId: form.unidadeId || null
      });
      toast.success('Morador atualizado');
      cancelarEdicao();
      recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  function nomeUnidade(id: string | null) {
    const u = unidades.find((x) => x.id === id);
    return u ? `${u.bloco} - ${u.numero}` : '—';
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Moradores" description="Cadastro de usuários e vínculo com as unidades." />

      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-3 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-muted-foreground">
          Criar um morador novo (com login e senha) ainda não está disponível por aqui — exige a
          chave <code>service_role</code> do Supabase, que nunca deve rodar no navegador. Por
          enquanto, crie o acesso pelo Supabase Studio em <strong>Authentication → Users</strong>.
          Editar dados, papel, unidade e remover já funcionam normalmente.
        </p>
      </div>

      {editandoId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Editar morador</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome" htmlFor="nome">
                  <Input id="nome" value={form.nome} onChange={(e) => set('nome', e.target.value)} required />
                </Field>
                <Field label="Telefone" htmlFor="tel">
                  <Input id="tel" value={form.telefone} onChange={(e) => set('telefone', e.target.value)} />
                </Field>
                <Field label="Unidade" htmlFor="uni">
                  <select
                    id="uni"
                    className={selectCls}
                    value={form.unidadeId}
                    onChange={(e) => set('unidadeId', e.target.value)}
                  >
                    <option value="">Sem unidade</option>
                    {unidades.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.bloco} - {u.numero}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Papel" htmlFor="papel">
                  <select
                    id="papel"
                    className={selectCls}
                    value={form.papel}
                    onChange={(e) => set('papel', e.target.value)}
                  >
                    <option value="condomino">Condômino</option>
                    <option value="sindico">Síndico</option>
                  </select>
                </Field>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={cancelarEdicao}>
                  Cancelar
                </Button>
                <Button type="submit" variant="brand" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {moradores.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum morador cadastrado" />
      ) : (
        <div className="space-y-3">
          {moradores.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
                <div className="space-y-1">
                  <p className="flex items-center gap-2 font-semibold">
                    {m.nome}
                    <Badge variant={m.papel === 'sindico' ? 'secondary' : 'muted'}>
                      {LABEL.papel[m.papel] ?? m.papel}
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.email} · {m.telefone || 'sem telefone'} · {nomeUnidade(m.unidadeId)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => editar(m)}>
                    Editar
                  </Button>
                  <AsyncConfirmDialog
                    trigger={
                      <Button size="sm" variant="ghost">
                        Remover
                      </Button>
                    }
                    title={`Remover ${m.nome}?`}
                    description="O acesso via login continua existindo (remover de vez exige a service_role key) — mas o perfil some do app e ele deixa de enxergar qualquer dado."
                    confirmLabel="Remover"
                    confirmVariant="destructive"
                    successMessage="Morador removido"
                    onConfirm={() => remover(m.id).then(recarregar)}
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
