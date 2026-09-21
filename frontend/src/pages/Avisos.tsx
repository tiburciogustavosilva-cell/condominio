import { useState } from 'react';
import { Loader2, Megaphone, Pin, PinOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAvisos } from '@/hooks/useAvisos';
import { useAuth } from '@/hooks/useAuth';
import { dataHora } from '@/lib/format';
import type { Aviso } from '@/types/condominio';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Field } from '@/components/shared/Field';
import { AsyncConfirmDialog } from '@/components/shared/AsyncConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Avisos() {
  const { isSindico } = useAuth();
  const { avisos, recarregar, criar, atualizar, remover } = useAvisos();
  const [form, setForm] = useState({ titulo: '', mensagem: '', fixado: false });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await criar(form);
      toast.success('Aviso publicado');
      setForm({ titulo: '', mensagem: '', fixado: false });
      recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao publicar');
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
      <PageHeader title="Avisos" description="Comunicados do condomínio." />

      {isSindico && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Novo aviso</CardTitle>
          </CardHeader>
          <CardContent>
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
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                  checked={form.fixado}
                  onChange={(e) => setForm({ ...form, fixado: e.target.checked })}
                />
                Fixar no topo
              </label>
              <div className="flex justify-end">
                <Button type="submit" variant="brand" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Publicar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {avisos.length === 0 ? (
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
                <p className="text-xs text-muted-foreground">por {a.autorNome}</p>
                {isSindico && (
                  <div className="flex gap-2 pt-1">
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
