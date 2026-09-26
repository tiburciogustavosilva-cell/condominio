import { useState } from 'react';
import { IdCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useFuncionarios, type DadosFuncionario } from '@/hooks/useFuncionarios';
import { CARGOS_PORTARIA, LABEL } from '@/types/condominio';
import type { Cargo, Funcionario } from '@/types/condominio';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Field } from '@/components/shared/Field';
import { AsyncConfirmDialog } from '@/components/shared/AsyncConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ListSkeleton } from '@/components/shared/ListSkeleton';

const selectCls =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const VAZIO: DadosFuncionario = { nome: '', email: '', senha: '', telefone: '', cargo: 'porteiro' };

/** O que cada cargo acessa no app (espelha CARGOS_PORTARIA). */
const acessoDo = (cargo: string) => (CARGOS_PORTARIA.includes(cargo as Cargo) ? 'Encomendas e Avisos' : 'Avisos');

export default function Funcionarios() {
  const { funcionarios, carregando, recarregar, criar, atualizar, remover } = useFuncionarios();
  const [form, setForm] = useState(VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(campo: keyof DadosFuncionario, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function editar(f: Funcionario) {
    setEditandoId(f.id);
    setForm({ ...VAZIO, nome: f.nome, telefone: f.telefone || '', cargo: f.cargo });
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
        await atualizar(editandoId, { nome: form.nome, telefone: form.telefone, cargo: form.cargo });
      } else {
        await criar(form);
      }
      toast.success(editandoId ? 'Funcionário atualizado' : 'Funcionário cadastrado');
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
      <PageHeader
        title="Funcionários"
        description="Porteiros, zeladores, limpeza e demais funcionários do prédio. O cargo define o que cada um acessa."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editandoId ? 'Editar funcionário' : 'Novo funcionário'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome" htmlFor="nome">
                <Input id="nome" value={form.nome} onChange={(e) => set('nome', e.target.value)} required />
              </Field>
              <Field label="Cargo" htmlFor="cargo" hint={`Acessa: ${acessoDo(form.cargo)}.`}>
                <select
                  id="cargo"
                  className={selectCls}
                  value={form.cargo}
                  onChange={(e) => set('cargo', e.target.value)}
                >
                  {Object.entries(LABEL.cargo).map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>
                      {rotulo}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Telefone" htmlFor="tel">
                <Input id="tel" value={form.telefone} onChange={(e) => set('telefone', e.target.value)} />
              </Field>
              {!editandoId && (
                <>
                  <Field label="E-mail (login)" htmlFor="email">
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      required
                    />
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
      ) : funcionarios.length === 0 ? (
        <EmptyState icon={IdCard} title="Nenhum funcionário cadastrado" />
      ) : (
        <div className="space-y-3">
          {funcionarios.map((f) => (
            <Card key={f.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
                <div className="space-y-1">
                  <p className="flex items-center gap-2 font-semibold">
                    {f.nome}
                    <Badge variant="secondary">{LABEL.cargo[f.cargo] ?? f.cargo}</Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {f.email} · {f.telefone || 'sem telefone'} · acessa {acessoDo(f.cargo)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => editar(f)}>
                    Editar
                  </Button>
                  <AsyncConfirmDialog
                    trigger={
                      <Button size="sm" variant="ghost">
                        Remover
                      </Button>
                    }
                    title={`Remover ${f.nome}?`}
                    description="A pessoa perde o acesso ao app. Encomendas que ela registrou continuam no histórico."
                    confirmLabel="Remover"
                    confirmVariant="destructive"
                    successMessage="Funcionário removido"
                    onConfirm={() => remover(f.id).then(recarregar)}
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
