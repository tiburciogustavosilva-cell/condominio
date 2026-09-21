import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
      <div className="relative hidden overflow-hidden bg-gradient-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-white/15 backdrop-blur">
            <Building2 className="h-6 w-6" />
          </div>
          <span className="font-heading text-lg font-extrabold">Condomínio</span>
        </div>
        <div className="space-y-4">
          <h1 className="font-heading text-4xl font-black leading-tight">
            A gestão do seu condomínio, num só lugar.
          </h1>
          <p className="max-w-md text-primary-foreground/85">
            Chamados, reservas de áreas comuns, encomendas e avisos — com o
            síndico e os moradores na mesma página.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/70">© {new Date().getFullYear()} Condomínio</p>
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-white/10" />
      </div>

      {/* formulário */}
      <div className="flex items-center justify-center p-6 app-surface">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm"
        >
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="font-heading text-lg font-extrabold">Condomínio</span>
          </div>

          <Card className="p-6 shadow-md">
            <div className="mb-5 space-y-1">
              <h2 className="font-heading text-xl font-extrabold">Entrar</h2>
              <p className="text-sm text-muted-foreground">Use suas credenciais de acesso.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="E-mail" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field label="Senha" htmlFor="senha">
                <Input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
              </Field>
              <Button type="submit" variant="brand" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </form>

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
