import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, MessageSquare, SendHorizonal } from 'lucide-react';
import { toast } from 'sonner';
import { useChamado } from '@/hooks/useChamados';
import { useAuth } from '@/hooks/useAuth';
import { dataHora } from '@/lib/format';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge, PrioridadeBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Field } from '@/components/shared/Field';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS = [
  ['aberto', 'Em aberto'],
  ['em_andamento', 'Pendente'],
  ['concluido', 'Encerrado']
];

export default function ChamadoDetalhe() {
  const { id } = useParams();
  const { isSindico } = useAuth();
  const { chamado, erro, atualizarStatus, comentar } = useChamado(id);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (erro) toast.error('Não foi possível carregar o chamado');
  }, [erro]);

  async function handleComentar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await comentar(texto);
      setTexto('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao comentar');
    } finally {
      setEnviando(false);
    }
  }

  async function mudarStatus(status: string) {
    try {
      await atualizarStatus(status);
      toast.success('Status atualizado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar');
    }
  }

  if (!chamado) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={chamado.titulo} backTo="/chamados" />

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={chamado.status} />
            <PrioridadeBadge nivel={chamado.prioridade} />
            <Badge variant="outline" className="capitalize">
              {chamado.categoria}
            </Badge>
          </div>
          <p className="whitespace-pre-line text-sm">{chamado.descricao}</p>
          <p className="text-xs text-muted-foreground">
            Aberto em {dataHora(chamado.criadoEm)} · atualizado em {dataHora(chamado.atualizadoEm)}
          </p>

          {isSindico && (
            <Field label="Alterar status" htmlFor="status" className="max-w-xs pt-1">
              <select
                id="status"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={chamado.status}
                onChange={(e) => mudarStatus(e.target.value)}
              >
                {STATUS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" /> Comentários
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(chamado.comentarios ?? []).length === 0 ? (
            <EmptyState icon={MessageSquare} title="Sem comentários ainda" />
          ) : (
            <ul className="space-y-3">
              {chamado.comentarios?.map((c) => (
                <li key={c.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">{c.autorNome}</span>
                    <span className="text-xs text-muted-foreground">{dataHora(c.criadoEm)}</span>
                  </div>
                  <p className="mt-1 text-sm">{c.texto}</p>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleComentar} className="space-y-2">
            <Textarea
              rows={3}
              placeholder="Escreva um comentário…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              required
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={enviando}>
                {enviando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizonal className="h-4 w-4" />
                )}
                Comentar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
