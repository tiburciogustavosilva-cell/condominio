import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, LogOut, Plus } from 'lucide-react';
import { Brand } from '@/components/shared/Brand';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useMeusCondominios } from '@/hooks/useMeusCondominios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Field } from '@/components/shared/Field';
import { Skeleton } from '@/components/ui/skeleton';

const VAZIO = { nome: '', endereco: '', cnpj: '' };

export default function MeusCondominios() {
  const { usuario, isAdministradora, recarregarSessao, logout } = useAuth();
  const { condominios, carregando, criar, entrar } = useMeusCondominios();
  const [form, setForm] = useState(VAZIO);
  const [criando, setCriando] = useState(false);
  const [entrandoEm, setEntrandoEm] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!isAdministradora) return <Navigate to="/" replace />;

  function set(campo: keyof typeof VAZIO, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    setCriando(true);
    try {
      await criar(form);
      await recarregarSessao();
      setForm(VAZIO);
      toast.success('Condomínio cadastrado!');
      navigate('/perguntas-condominio');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar condomínio');
    } finally {
      setCriando(false);
    }
  }

  async function handleEntrar(id: string, onboardingConcluido: boolean) {
    setEntrandoEm(id);
    try {
      await entrar(id);
      await recarregarSessao();
      navigate(onboardingConcluido ? '/' : '/perguntas-condominio');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao trocar de condomínio');
    } finally {
      setEntrandoEm(null);
    }
  }

  return (
    <div className="min-h-screen app-surface p-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Brand compact />
            <div>
              <h1 className="font-heading text-lg font-extrabold">Meus condomínios</h1>
              <p className="text-xs text-muted-foreground">{usuario?.nome}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {usuario?.condominioId && (
              <Button asChild variant="outline" size="sm">
                <Link to="/">Voltar ao painel</Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/login'); }}>
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {carregando ? (
            <>
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </>
          ) : condominios?.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Você ainda não cadastrou nenhum condomínio. Cadastre o primeiro abaixo.
            </p>
          ) : (
            condominios?.map((c) => {
              const ativo = usuario?.condominioId === c.id;
              return (
                <Card key={c.id} className={ativo ? 'border-primary' : undefined}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
                    <div className="space-y-0.5">
                      <p className="font-semibold">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">{c.endereco || 'Sem endereço cadastrado'}</p>
                      {!c.onboardingConcluido && (
                        <p className="text-xs font-medium text-warning-foreground">Cadastro incompleto</p>
                      )}
                    </div>
                    {ativo ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Ativo
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={entrandoEm === c.id}
                        onClick={() => handleEntrar(c.id, c.onboardingConcluido)}
                      >
                        {entrandoEm === c.id && <Loader2 className="h-4 w-4 animate-spin" />}
                        Entrar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-sm font-extrabold">Cadastrar novo condomínio</h2>
          </div>
          <form onSubmit={handleCriar} className="space-y-4">
            <Field label="Nome do condomínio" htmlFor="nome">
              <Input
                id="nome"
                placeholder="Ex.: Residencial Jardim das Palmeiras"
                value={form.nome}
                onChange={(e) => set('nome', e.target.value)}
                required
              />
            </Field>
            <Field label="Endereço" htmlFor="endereco">
              <Input id="endereco" value={form.endereco} onChange={(e) => set('endereco', e.target.value)} />
            </Field>
            <Field label="CNPJ (opcional)" htmlFor="cnpj">
              <Input id="cnpj" value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} />
            </Field>
            <Button type="submit" variant="brand" className="w-full" disabled={criando}>
              {criando && <Loader2 className="h-4 w-4 animate-spin" />}
              Cadastrar e entrar
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
