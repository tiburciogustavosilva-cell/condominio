import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Brand, BrandPanel } from '@/components/shared/Brand';
import { Field } from '@/components/shared/Field';

export default function Login() {
  const [email, setEmail] = useState('sindico@condominio.com');
  const [senha, setSenha] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, senha);
      navigate('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha no login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* painel de marca */}
      <BrandPanel video="/brand/alpha.mp4" title={<>A gestão do seu condomínio, <span className="text-gradient">num só lugar.</span></>}>
        Chamados, reservas de áreas comuns, encomendas e avisos — com o
        síndico e os moradores na mesma página.
      </BrandPanel>

      {/* formulário */}
      <div className="flex items-center justify-center p-6 app-surface">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <Brand className="mb-6 lg:hidden" />

          <Card className="p-8 shadow-md">
            <div className="mb-6 space-y-1">
              <h2 className="font-heading text-2xl font-extrabold">Entrar</h2>
              <p className="text-muted-foreground">Use suas credenciais de acesso.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Field label="E-mail" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="h-12 px-4 text-base"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field label="Senha" htmlFor="senha">
                <Input
                  id="senha"
                  type="password"
                  autoComplete="current-password"
                  className="h-12 px-4 text-base"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
              </Field>
              <Button type="submit" variant="brand" className="h-12 w-full text-base" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Ainda não tem uma conta?{' '}
              <Link to="/cadastro" className="font-medium text-foreground underline underline-offset-2">
                Cadastre-se
              </Link>
            </p>

            <div className="mt-5 rounded-md bg-muted p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Contas de teste</p>
              <p>Síndico — sindico@condominio.com / admin123</p>
              <p>Morador — morador@condominio.com / morador123</p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
