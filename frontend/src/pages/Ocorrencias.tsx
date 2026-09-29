import { useState } from 'react';
import { BookText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOcorrencias } from '@/hooks/useOcorrencias';
import { useAuth } from '@/hooks/useAuth';
import { dataCurta, dataHora } from '@/lib/format';
import { LABEL } from '@/types/condominio';
import { FormModal } from '@/components/shared/FormModal';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Field } from '@/components/shared/Field';
import { Card, CardContent } from '@/components/ui/card';
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
  const [aberto, setAberto] = useState(false);
  const [salvandoStatus, setSalvandoStatus] = useState(false);
  // Mudança de status aguardando o descritivo do síndico.
  const [pendente, setPendente] = useState<{ id: string; status: string; descricao: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await criar(form);
      toast.success('Ocorrência registrada');
      setForm(VAZIO);
      setAberto(false);
      recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar ocorrência');
    } finally {
      setLoading(false);
    }
  }

  async function mudarStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!pendente) return;
    setSalvandoStatus(true);
    try {
      await atualizarStatus(pendente.id, pendente.status, pendente.descricao);
      toast.success('Status atualizado');
      setPendente(null);
      recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar');
    } finally {
      setSalvandoStatus(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Livro de Ocorrência"
        description="Registre reclamações e ocorridos do condomínio."
        actions={
          <Button variant="brand" onClick={() => setAberto(true)}>
            <BookText className="h-4 w-4" /> Registrar ocorrência
          </Button>
        }
      />

      <FormModal
        aberto={aberto}
        titulo={'Registrar ocorrência'}
        onFechar={() => setAberto(false)}
        salvando={loading}
      >
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </div>
        </form>
      </FormModal>

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
                  {o.historico.length > 0 && (
                    <ul className="space-y-2 border-l-2 pl-3 pt-1">
                      {o.historico.map((h) => (
                        <li key={h.id} className="text-sm">
                          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <StatusBadge status={h.status} /> {dataHora(h.criadoEm)} · {h.autorNome}
                          </p>
                          <p className="whitespace-pre-line">{h.descricao}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {isSindico ? (
                  <select
                    className={selectCls + ' w-auto'}
                    value={pendente?.id === o.id ? pendente.status : o.status}
                    onChange={(e) =>
                      setPendente(
                        e.target.value === o.status ? null : { id: o.id, status: e.target.value, descricao: '' }
                      )
                    }
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

      <FormModal
        aberto={!!pendente}
        titulo={`Mudar status para "${STATUS_OPCOES.find(([v]) => v === pendente?.status)?.[1] ?? ''}"`}
        onFechar={() => setPendente(null)}
        salvando={salvandoStatus}
      >
        <form onSubmit={mudarStatus} className="space-y-4">
          <Field label="Descreva o que foi feito" htmlFor="descricao-status">
            <Textarea
              id="descricao-status"
              rows={4}
              value={pendente?.descricao ?? ''}
              onChange={(e) => pendente && setPendente({ ...pendente, descricao: e.target.value })}
              required
              autoFocus
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPendente(null)}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={salvandoStatus || !pendente?.descricao.trim()}>
              {salvandoStatus && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar status
            </Button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
