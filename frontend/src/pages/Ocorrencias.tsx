import { useState } from 'react';
import { BookText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOcorrencias } from '@/hooks/useOcorrencias';
import { useAuth } from '@/hooks/useAuth';
import { dataCurta } from '@/lib/format';
import { LABEL } from '@/types/condominio';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Field } from '@/components/shared/Field';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const selectCls =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const STATUS_OPCOES = [
  ['aberto', 'Em aberto'],
  ['em_andamento', 'Pendente'],
  ['concluido', 'Encerrado']
];

const VAZIO = { titulo: '', descricao: '', categoria: 'outro' };

export default function Ocorrencias() {
  const { isSindico } = useAuth();
  const { ocorrencias, carregando, criar, atualizarStatus, recarregar } = useOcorrencias();
  const [form, setForm] = useState(VAZIO);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await criar(form);
      toast.success('Ocorrência registrada');
      setForm(VAZIO);
      recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar ocorrência');
    } finally {
      setLoading(false);
    }
  }

  async function mudarStatus(id: string, status: string) {
    try {
      await atualizarStatus(id, status);
      toast.success('Status atualizado');
      recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Livro de Ocorrência" description="Registre reclamações e ocorridos do condomínio." />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookText className="h-4 w-4" /> Registrar ocorrência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Título" htmlFor="titulo">
                <Input
                  id="titulo"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  required
                />
              </Field>
              <Field label="Categoria" htmlFor="categoria">
                <select
                  id="categoria"
                  className={selectCls}
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                >
                  {Object.entries(LABEL.categoriaOcorrencia).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Descrição" htmlFor="descricao">
              <Textarea
                id="descricao"
                rows={4}
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

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Ocorrências registradas</h3>
        {carregando ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : ocorrencias?.length === 0 ? (
          <EmptyState icon={BookText} title="Nenhuma ocorrência registrada" />
        ) : (
          ocorrencias?.map((o) => (
            <Card key={o.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-5">
                <div className="max-w-xl space-y-1">
                  <p className="font-semibold">{o.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {LABEL.categoriaOcorrencia[o.categoria] ?? o.categoria} · {dataCurta(o.criadoEm)}
                    {isSindico && o.autorNome
                      ? ` · ${o.autorNome}${o.unidadeLabel ? ` (${o.unidadeLabel})` : ''}`
                      : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">{o.descricao}</p>
                </div>
                {isSindico ? (
                  <select
                    className={selectCls + ' w-auto'}
                    value={o.status}
                    onChange={(e) => mudarStatus(o.id, e.target.value)}
                  >
                    {STATUS_OPCOES.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                ) : (
                  <StatusBadge status={o.status} />
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
