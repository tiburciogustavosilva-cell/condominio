import { useState } from 'react';
import { Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useMoradores } from '@/hooks/useMoradores';
import { useUnidades } from '@/hooks/useUnidades';
import { rotuloUnidade } from '@/lib/format';
import { LABEL } from '@/types/condominio';
import type { Morador } from '@/types/condominio';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Field } from '@/components/shared/Field';
import { AsyncConfirmDialog } from '@/components/shared/AsyncConfirmDialog';
import { UnidadeSelect } from '@/components/shared/UnidadeSelect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ListSkeleton } from '@/components/shared/ListSkeleton';

const selectCls =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function Moradores() {
  const { moradores, carregando, recarregar, criar, atualizar, remover } = useMoradores();
  const { unidades } = useUnidades();
  const vazio = { nome: '', email: '', senha: '', telefone: '', unidadeId: '', papel: 'condomino', vinculo: 'proprietario' };
  const [form, setForm] = useState(vazio);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(campo: string, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function editar(m: Morador) {
    setEditandoId(m.id);
    setForm({
      ...vazio,
      nome: m.nome,
      telefone: m.telefone || '',
      unidadeId: m.unidadeId || '',
      papel: m.papel,
      vinculo: m.vinculo
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setForm(vazio);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (editandoId) {
        await atualizar(editandoId, {
          nome: form.nome,
          telefone: form.telefone,
          papel: form.papel,
          vinculo: form.vinculo,
          unidadeId: form.unidadeId || null
        });
      } else {
        await criar(form);
      }
      toast.success(editandoId ? 'Morador atualizado' : 'Morador cadastrado');
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
    return rotuloUnidade(u) ?? '—';
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Moradores" description="Cadastro de usuários e vínculo com as unidades." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editandoId ? 'Editar morador' : 'Novo morador'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome" htmlFor="nome">
                <Input id="nome" value={form.nome} onChange={(e) => set('nome', e.target.value)} required />
              </Field>
              {!editandoId && (
                <>
                  <Field label="E-mail (login)" htmlFor="email">
                    <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
                  </Field>
                  <Field label="Senha inicial" htmlFor="senha">
                    <Input
                      id="senha"
                      type="password"
                      minLength={6}
                      value={form.senha}
                      onChange={(e) => set('senha', e.target.value)}
                      required
                    />
                  </Field>
                </>
              )}
              <Field label="Telefone" htmlFor="tel">
                <Input id="tel" value={form.telefone} onChange={(e) => set('telefone', e.target.value)} />
              </Field>
              <Field label="Unidade" htmlFor="uni">
                <UnidadeSelect
                  id="uni"
                  unidades={unidades}
                  value={form.unidadeId}
                  onChange={(v) => set('unidadeId', v)}
                  opcaoVazia="Sem unidade"
                />
              </Field>
              <Field
                label="Vínculo com a unidade"
                htmlFor="vinculo"
                hint="Marido e mulher, por exemplo, cadastram-se como dois proprietários da mesma unidade."
              >
                <select
                  id="vinculo"
                  className={selectCls}
                  value={form.vinculo}
                  onChange={(e) => set('vinculo', e.target.value)}
                >
                  {Object.entries(LABEL.vinculo).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
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

      {carregando ? (
        <ListSkeleton />
      ) : moradores.length === 0 ? (
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
                    {m.papel === 'condomino' && (
                      <Badge variant="outline">{LABEL.vinculo[m.vinculo] ?? m.vinculo}</Badge>
                    )}
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
                    description="Remove o acesso e os chamados/reservas/ocorrências abertos por essa pessoa."
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
