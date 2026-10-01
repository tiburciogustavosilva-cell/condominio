import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Brand } from '@/components/shared/Brand';
import { Field } from '@/components/shared/Field';

/** Aberta pelo link do e-mail de convite: a pessoa escolhe a senha e já entra. */
export default function DefinirSenha() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [loading, setLoading] = useState(false);
  const { definirSenha } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (senha !== confirmacao) return toast.error('As senhas não conferem');
    setLoading(true);
    try {
      await definirSenha(token, senha);
      toast.success('Senha criada! Bem-vindo(a).');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível definir a senha');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 app-surface">
      <div className="w-full max-w-md">
        <Brand className="mb-6" />
        <Card className="p-8 shadow-md">
          <div className="mb-6 space-y-1">
            <h2 className="font-heading text-2xl font-extrabold">Crie sua senha</h2>
            <p className="text-muted-foreground">Escolha a senha que você vai usar para entrar.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="Nova senha" htmlFor="senha" hint="Mínimo de 6 caracteres.">
              <Input
                id="senha"
                type="password"
                autoComplete="new-password"
                minLength={6}
                className="h-12 px-4 text-base"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </Field>
            <Field label="Confirme a senha" htmlFor="confirmacao">
              <Input
                id="confirmacao"
                type="password"
                autoComplete="new-password"
                className="h-12 px-4 text-base"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" variant="brand" className="h-12 w-full text-base" disabled={loading || !token}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar e entrar
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
