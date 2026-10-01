import { useState } from 'react';
import { Loader2, Megaphone, Pencil, Pin, PinOff, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAvisos } from '@/hooks/useAvisos';
import { useAuth } from '@/hooks/useAuth';
import { dataHora } from '@/lib/format';
import type { Aviso } from '@/types/condominio';
import { FormModal } from '@/components/shared/FormModal';
import { PageHeader, Resumo } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Field } from '@/components/shared/Field';
import { AsyncConfirmDialog } from '@/components/shared/AsyncConfirmDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ListSkeleton } from '@/components/shared/ListSkeleton';

const selectCls =
  'flex h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const UNIDADES_DURACAO = [
  ['manter', 'Manter prazo atual'],
  ['', 'Sem prazo'],
  ['horas', 'Horas'],
  ['dias', 'Dias'],
  ['semanas', 'Semanas'],
  ['meses', 'Meses'],
  ['anos', 'Anos']
];

// Data em que o aviso sai do ar, contando a partir de agora.
function calcularExpiracao(qtd: number, unidade: string) {
  if (!unidade || unidade === 'manter') return null;
  const d = new Date();
  if (unidade === 'horas') d.setHours(d.getHours() + qtd);
  if (unidade === 'dias') d.setDate(d.getDate() + qtd);
  if (unidade === 'semanas') d.setDate(d.getDate() + qtd * 7);
  if (unidade === 'meses') d.setMonth(d.getMonth() + qtd);
  if (unidade === 'anos') d.setFullYear(d.getFullYear() + qtd);
  return d.toISOString();
}

const VAZIO = { titulo: '', mensagem: '', fixado: false, qtd: 1, unidade: '' };

export default function Avisos() {
  const { isSindico } = useAuth();
  const { avisos, carregando, recarregar, criar, atualizar, remover } = useAvisos();
  const [form, setForm] = useState(VAZIO);
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState<Aviso | null>(null);
  const [aberto, setAberto] = useState(false);

  function iniciarEdicao(a: Aviso) {
    setEditando(a);
    setForm({ titulo: a.titulo, mensagem: a.mensagem, fixado: a.fixado, qtd: 1, unidade: 'manter' });
    setAberto(true);
  }

  function cancelarEdicao() {
    setAberto(false);
    setEditando(null);
    setForm(VAZIO);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { qtd, unidade, ...dados } = form;
      if (editando) {
        await atualizar(editando.id, unidade === 'manter' ? dados : { ...dados, expiraEm: calcularExpiracao(qtd, unidade) });
        toast.success('Aviso atualizado');
      } else {
        await criar({ ...dados, expiraEm: calcularExpiracao(qtd, unidade) });
        toast.success('Aviso publicado');
      }
      cancelarEdicao();
      recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  async function alternarFixado(a: Aviso) {
    try {
      await atualizar(a.id, { fixado: !a.fixado });
      recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avisos"
        description="Comunicados do condomínio."
        actions={
          isSindico && (
            <Button variant="brand" onClick={() => setAberto(true)}>
              <Plus className="h-4 w-4" /> Novo aviso
            </Button>
          )
        }
      >
        {!carregando && <Resumo n={avisos.length} um="aviso publicado" varios="avisos publicados" />}
      </PageHeader>

      {isSindico && (
        <FormModal
          aberto={aberto}
          titulo={editando ? 'Editar aviso' : 'Novo aviso'}
          onFechar={cancelarEdicao}
          salvando={loading}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Título" htmlFor="titulo">
              <Input
                id="titulo"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                required
              />
            </Field>
            <Field label="Mensagem" htmlFor="msg">
              <Textarea
                id="msg"
                rows={3}
                value={form.mensagem}
                onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
                required
              />
            </Field>
            <Field label="Tempo no ar" htmlFor="duracao">
              <div className="flex gap-2">
                {form.unidade && form.unidade !== 'manter' && (
                  <Input
                    id="duracao"
                    type="number"
                    min={1}
                    className="w-24"
                    value={form.qtd}
                    onChange={(e) => setForm({ ...form, qtd: Math.max(1, Number(e.target.value)) })}
                    required
                  />
                )}
                <select
                  aria-label="Unidade de tempo"
                  className={selectCls}
                  value={form.unidade}
                  onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                >
                  {UNIDADES_DURACAO.filter(([v]) => editando || v !== 'manter').map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[hsl(var(--primary))]"
                checked={form.fixado}
                onChange={(e) => setForm({ ...form, fixado: e.target.checked })}
              />
              Fixar no topo
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={cancelarEdicao}>
                Cancelar
              </Button>
              <Button type="submit" variant="brand" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {editando ? 'Salvar' : 'Publicar'}
              </Button>
            </div>
          </form>
        </FormModal>
      )}

      {carregando ? (
        <ListSkeleton />
      ) : avisos.length === 0 ? (
        <EmptyState icon={Megaphone} title="Nenhum aviso publicado" />
      ) : (
        <div className="space-y-3">
          {avisos.map((a) => (
            <Card key={a.id}>
              <CardContent className="space-y-2 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="flex items-center gap-1.5 font-semibold">
                    {a.fixado && (
                      <Badge variant="secondary" className="gap-1">
                        <Pin className="h-3 w-3" /> Fixado
                      </Badge>
                    )}
                    {a.titulo}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">{dataHora(a.criadoEm)}</span>
                </div>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{a.mensagem}</p>
                <p className="text-xs text-muted-foreground">
                  por {a.autorNome}
                  {a.expiraEm && ` · no ar até ${dataHora(a.expiraEm)}`}
                </p>
                {isSindico && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => iniciarEdicao(a)}>
                      <Pencil className="h-4 w-4" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => alternarFixado(a)}>
                      {a.fixado ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      {a.fixado ? 'Desafixar' : 'Fixar'}
                    </Button>
                    <AsyncConfirmDialog
                      trigger={
                        <Button size="sm" variant="ghost">
                          Remover
                        </Button>
                      }
                      title="Remover aviso?"
                      confirmLabel="Remover"
                      confirmVariant="destructive"
                      successMessage="Aviso removido"
                      onConfirm={() => remover(a.id).then(recarregar)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
