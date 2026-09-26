import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePerfil } from '@/hooks/usePerfil';
import { PageHeader } from '@/components/shared/PageHeader';
import { Field } from '@/components/shared/Field';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { rotuloUnidade } from '@/lib/format';

export default function Perfil() {
  const { perfil, atualizarDados, trocarSenha } = usePerfil();
  const [dados, setDados] = useState({ nome: '', telefone: '' });
  const [senha, setSenha] = useState({ senhaAtual: '', novaSenha: '' });
  const [savingDados, setSavingDados] = useState(false);
  const [savingSenha, setSavingSenha] = useState(false);

  useEffect(() => {
    if (perfil) setDados({ nome: perfil.nome, telefone: perfil.telefone || '' });
  }, [perfil]);

  async function salvarDados(e: React.FormEvent) {
    e.preventDefault();
    setSavingDados(true);
    try {
      await atualizarDados(dados);
      toast.success('Dados atualizados');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSavingDados(false);
    }
  }

  async function salvarSenha(e: React.FormEvent) {
    e.preventDefault();
    setSavingSenha(true);
    try {
      await trocarSenha(senha.senhaAtual, senha.novaSenha);
      setSenha({ senhaAtual: '', novaSenha: '' });
      toast.success('Senha alterada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao trocar senha');
    } finally {
      setSavingSenha(false);
    }
  }

  if (!perfil) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader title="Meu perfil" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Meu perfil" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados pessoais</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={salvarDados} className="space-y-4">
            <Field label="Nome" htmlFor="nome">
              <Input
                id="nome"
                value={dados.nome}
                onChange={(e) => setDados({ ...dados, nome: e.target.value })}
                required
              />
            </Field>
            <Field label="Telefone" htmlFor="tel">
              <Input
                id="tel"
                value={dados.telefone}
                onChange={(e) => setDados({ ...dados, telefone: e.target.value })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="E-mail">
                <Input value={perfil.email} disabled />
              </Field>
              <Field label="Unidade">
                <Input
                  value={rotuloUnidade(perfil.unidade) ?? 'Sem unidade'}
                  disabled
                />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="brand" disabled={savingDados}>
                {savingDados && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar dados
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alterar senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={salvarSenha} className="space-y-4">
            <Field label="Senha atual" htmlFor="atual">
              <Input
                id="atual"
                type="password"
                value={senha.senhaAtual}
                onChange={(e) => setSenha({ ...senha, senhaAtual: e.target.value })}
                required
              />
            </Field>
            <Field label="Nova senha (mín. 6 caracteres)" htmlFor="nova">
              <Input
                id="nova"
                type="password"
                value={senha.novaSenha}
                onChange={(e) => setSenha({ ...senha, novaSenha: e.target.value })}
                required
              />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" disabled={savingSenha}>
                {savingSenha && <Loader2 className="h-4 w-4 animate-spin" />}
                Trocar senha
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
