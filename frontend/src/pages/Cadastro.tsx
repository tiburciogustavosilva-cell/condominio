import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, Building2, CheckCircle2, Loader2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth, type DadosCadastro } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/shared/Field';

const VAZIO = {
  tipo: 'sindico' as DadosCadastro['tipo'],
  nome: '',
  email: '',
  senha: '',
  confirmarSenha: '',
  condominioNome: '',
  condominioEndereco: '',
  condominioCnpj: '',
  administradoraNome: '',
  administradoraCnpj: ''
};

export default function Cadastro() {
  const [form, setForm] = useState(VAZIO);
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState<{ email: string; precisaConfirmarEmail: boolean } | null>(null);
  const { cadastrar } = useAuth();
  const navigate = useNavigate();

  function set(campo: string, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.senha !== form.confirmarSenha) {
      toast.error('As senhas não conferem');
      return;
    }
    if (form.senha.length < 6) {
      toast.error('A senha precisa ter pelo menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      const { precisaConfirmarEmail } = await cadastrar({
        tipo: form.tipo,
        email: form.email,
        senha: form.senha,
        nome: form.nome,
        condominioNome: form.condominioNome,
        condominioEndereco: form.condominioEndereco,
        condominioCnpj: form.condominioCnpj,
        administradoraNome: form.administradoraNome,
        administradoraCnpj: form.administradoraCnpj
      });
      if (precisaConfirmarEmail) {
        setEnviado({ email: form.email, precisaConfirmarEmail: true });
      } else {
        toast.success('Conta criada!');
        navigate(form.tipo === 'administradora' ? '/meus-condominios' : '/perguntas-condominio');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar a conta');
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
            Cadastre seu condomínio e comece agora.
          </h1>
          <p className="max-w-md text-primary-foreground/85">
            Síndico de um prédio só ou administradora de vários — os dados de cada
            condomínio ficam sempre separados dos demais.
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
          className="w-full max-w-md"
        >
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="font-heading text-lg font-extrabold">Condomínio</span>
          </div>

          <Card className="p-6 shadow-md">
            {enviado ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-success/15 text-success">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h2 className="font-heading text-xl font-extrabold">Confirme seu e-mail</h2>
                  <p className="text-sm text-muted-foreground">
                    Enviamos um link de confirmação para <strong>{enviado.email}</strong>. Clique
                    nele para ativar sua conta e poder entrar.
                  </p>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/login">Voltar para o login</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-5 space-y-1">
                  <h2 className="font-heading text-xl font-extrabold">Cadastre-se</h2>
                  <p className="text-sm text-muted-foreground">Como você vai usar o sistema?</p>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => set('tipo', 'sindico')}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-lg border px-3 py-4 text-sm font-medium transition-colors',
                      form.tipo === 'sindico'
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <UserRound className="h-5 w-5" />
                    Sou síndico
                    <span className="text-xs font-normal text-muted-foreground">1 condomínio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => set('tipo', 'administradora')}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-lg border px-3 py-4 text-sm font-medium transition-colors',
                      form.tipo === 'administradora'
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Briefcase className="h-5 w-5" />
                    Sou administradora
                    <span className="text-xs font-normal text-muted-foreground">vários condomínios</span>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Field label="Seu nome" htmlFor="nome">
                    <Input id="nome" value={form.nome} onChange={(e) => set('nome', e.target.value)} required />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="E-mail" htmlFor="email">
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => set('email', e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="Senha (mín. 6 caracteres)" htmlFor="senha">
                      <Input
                        id="senha"
                        type="password"
                        value={form.senha}
                        onChange={(e) => set('senha', e.target.value)}
                        required
                      />
                    </Field>
                  </div>

                  <Field label="Confirmar senha" htmlFor="confirmarSenha">
                    <Input
                      id="confirmarSenha"
                      type="password"
                      value={form.confirmarSenha}
                      onChange={(e) => set('confirmarSenha', e.target.value)}
                      required
                    />
                  </Field>

                  {form.tipo === 'sindico' ? (
                    <div className="border-t border-border pt-4">
                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Dados do condomínio
                      </p>
                      <div className="space-y-4">
                        <Field label="Nome do condomínio" htmlFor="condominioNome">
                          <Input
                            id="condominioNome"
                            placeholder="Ex.: Residencial Jardim das Palmeiras"
                            value={form.condominioNome}
                            onChange={(e) => set('condominioNome', e.target.value)}
                            required
                          />
                        </Field>
                        <Field label="Endereço" htmlFor="condominioEndereco">
                          <Input
                            id="condominioEndereco"
                            value={form.condominioEndereco}
                            onChange={(e) => set('condominioEndereco', e.target.value)}
                          />
                        </Field>
                        <Field label="CNPJ (opcional)" htmlFor="condominioCnpj">
                          <Input
                            id="condominioCnpj"
                            value={form.condominioCnpj}
                            onChange={(e) => set('condominioCnpj', e.target.value)}
                          />
                        </Field>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-border pt-4">
                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Dados da administradora
                      </p>
                      <div className="space-y-4">
                        <Field label="Nome da administradora" htmlFor="administradoraNome">
                          <Input
                            id="administradoraNome"
                            placeholder="Ex.: Gestão Predial Ltda"
                            value={form.administradoraNome}
                            onChange={(e) => set('administradoraNome', e.target.value)}
                            required
                          />
                        </Field>
                        <Field label="CNPJ (opcional)" htmlFor="administradoraCnpj">
                          <Input
                            id="administradoraCnpj"
                            value={form.administradoraCnpj}
                            onChange={(e) => set('administradoraCnpj', e.target.value)}
                          />
                        </Field>
                        <p className="text-xs text-muted-foreground">
                          Você cadastra os condomínios que administra depois de entrar.
                        </p>
                      </div>
                    </div>
                  )}

                  <Button type="submit" variant="brand" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Criar conta
                  </Button>
                </form>

                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Já tem uma conta?{' '}
                  <Link to="/login" className="font-medium text-foreground underline underline-offset-2">
                    Entrar
                  </Link>
                </p>

                <div className="mt-5 border-t border-border pt-4">
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link to="/perguntas-condominio">Ir para perguntas (teste)</Link>
                  </Button>
                  <p className="mt-1.5 text-center text-xs text-muted-foreground">
                    Atalho pra testar a tela de perguntas sem se cadastrar de novo.
                  </p>
                </div>
              </>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
