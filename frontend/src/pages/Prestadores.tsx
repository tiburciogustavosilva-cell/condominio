import { useState } from 'react';
import { HardHat, Loader2, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { usePrestadores } from '@/hooks/usePrestadores';
import type { Prestador } from '@/types/condominio';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Field } from '@/components/shared/Field';
import { AsyncConfirmDialog } from '@/components/shared/AsyncConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const PRESTADOR_VAZIO = { nome: '', email: '', servico: '', empresa: '', telefone: '', observacao: '' };

export default function Prestadores() {
  const {
    prestadores,
    recarregar: recarregarPrestadores,
    criar: criarPrestador,
    atualizar: atualizarPrestador,
    remover: removerPrestador
  } = usePrestadores();

  const [formP, setFormP] = useState<any>(PRESTADOR_VAZIO);
  const [editP, setEditP] = useState<string | null>(null);
  const [savingP, setSavingP] = useState(false);

  function setP(campo: string, valor: string) {
    setFormP((f: any) => ({ ...f, [campo]: valor }));
  }
  function editarPrestador(p: Prestador) {
    setEditP(p.id);
    setFormP({
      nome: p.nome,
      email: p.email,
      servico: p.servico || '',
      empresa: p.empresa || '',
      telefone: p.telefone || '',
      observacao: p.observacao || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function cancelarPrestador() {
    setEditP(null);
    setFormP(PRESTADOR_VAZIO);
  }
  async function salvarPrestador(e: React.FormEvent) {
    e.preventDefault();
    setSavingP(true);
    try {
      if (editP) {
        await atualizarPrestador(editP, formP);
        toast.success('Prestador atualizado');
      } else {
        await criarPrestador(formP);
        toast.success('Prestador cadastrado');
      }
      cancelarPrestador();
      recarregarPrestadores();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSavingP(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prestadores de serviços"
        description="Cadastro de quem executa os serviços do condomínio."
      />

      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-3 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-muted-foreground">
          A agenda de manutenções recorrentes (com prazo, prioridade, custo e lembrete por
          e-mail) mudou de lugar — agora fica em{' '}
          <Link to="/manutencao-predial" className="font-medium text-foreground underline underline-offset-2">
            Manutenção Predial
          </Link>
          , junto com o cadastro de equipamentos/áreas e o registro de ordens de serviço.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardHat className="h-4 w-4" /> {editP ? 'Editar prestador' : 'Novo prestador'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={salvarPrestador} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome / contato" htmlFor="p-nome">
                <Input id="p-nome" value={formP.nome} onChange={(e) => setP('nome', e.target.value)} required />
              </Field>
              <Field label="E-mail (recebe os lembretes)" htmlFor="p-email">
                <Input
                  id="p-email"
                  type="email"
                  value={formP.email}
                  onChange={(e) => setP('email', e.target.value)}
                  required
                />
              </Field>
              <Field label="Serviço" htmlFor="p-servico">
                <Input
                  id="p-servico"
                  placeholder="Ex.: Extintores, Elevadores, Dedetização…"
                  value={formP.servico}
                  onChange={(e) => setP('servico', e.target.value)}
                />
              </Field>
              <Field label="Empresa" htmlFor="p-empresa">
                <Input id="p-empresa" value={formP.empresa} onChange={(e) => setP('empresa', e.target.value)} />
              </Field>
              <Field label="Telefone" htmlFor="p-tel">
                <Input id="p-tel" value={formP.telefone} onChange={(e) => setP('telefone', e.target.value)} />
              </Field>
              <Field label="Observação" htmlFor="p-obs">
                <Input id="p-obs" value={formP.observacao} onChange={(e) => setP('observacao', e.target.value)} />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              {editP && (
                <Button type="button" variant="outline" onClick={cancelarPrestador}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" variant="brand" disabled={savingP}>
                {savingP && <Loader2 className="h-4 w-4 animate-spin" />}
                {editP ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {prestadores.length === 0 ? (
        <EmptyState icon={HardHat} title="Nenhum prestador cadastrado" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {prestadores.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-1.5 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{p.nome}</p>
                  <Badge variant="muted">{p.manutencoes} manut.</Badge>
                </div>
                {(p.servico || p.empresa) && (
                  <p className="text-sm text-muted-foreground">
                    {[p.servico, p.empresa].filter(Boolean).join(' · ')}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {p.email}
                  {p.telefone ? ` · ${p.telefone}` : ''}
                </p>
                {p.observacao && <p className="text-xs text-muted-foreground">{p.observacao}</p>}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => editarPrestador(p)}>
                    Editar
                  </Button>
                  <AsyncConfirmDialog
                    trigger={
                      <Button size="sm" variant="ghost">
                        Remover
                      </Button>
                    }
                    title={`Remover ${p.nome}?`}
                    description="As manutenções vinculadas a este prestador também serão removidas."
                    confirmLabel="Remover"
                    confirmVariant="destructive"
                    successMessage="Prestador removido"
                    onConfirm={() => removerPrestador(p.id).then(recarregarPrestadores)}
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
