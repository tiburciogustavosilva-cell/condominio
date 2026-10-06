import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInCalendarDays } from 'date-fns';
import { CreditCard, LogIn, Loader2, Lock, LogOut, Mail, Pencil, Plus, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { dataCurta, moeda, prazoTexto } from '@/lib/format';
import { LABEL, nomeComFuncao, type Cargo, type Papel } from '@/types/condominio';
import { useAuth } from '@/hooks/useAuth';
import { Brand } from '@/components/shared/Brand';
import { Field } from '@/components/shared/Field';
import { FormModal } from '@/components/shared/FormModal';
import { BuscaInput, bate } from '@/components/shared/BuscaInput';
import { AsyncConfirmDialog } from '@/components/shared/AsyncConfirmDialog';
import { AssinaturaModal, type Pagamento } from '@/components/admin/AssinaturaModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type CondominioAdmin = {
  id: string;
  nome: string;
  endereco: string;
  cnpj: string;
  bloqueadoMotivo: string | null;
  administradora: { nome: string } | null;
  _count: { unidades: number; profiles: number };
  /** Assinatura vigente (pagamento de maior "válido até"), se houver. */
  pagamentos: Omit<Pagamento, 'id'>[];
};

/** Dias até vencer a assinatura (negativo = vencida); null = nenhum pagamento registrado. */
function diasParaVencer(c: CondominioAdmin) {
  const vigente = c.pagamentos[0];
  return vigente ? differenceInCalendarDays(new Date(vigente.validoAte + 'T00:00:00'), new Date()) : null;
}

function TextoAssinatura({ c }: { c: CondominioAdmin }) {
  const vigente = c.pagamentos[0];
  const dias = diasParaVencer(c);
  if (!vigente || dias === null)
    return <p className="text-xs text-muted-foreground">Assinatura: nenhum pagamento registrado</p>;
  const cor = dias < 0 ? 'text-destructive' : dias <= 5 ? 'text-warning-foreground' : 'text-muted-foreground';
  return (
    <p className={`text-xs font-medium ${cor}`}>
      Assinatura: {moeda(vigente.valor)} · {dias < 0 ? 'vencida' : 'válida até'} {dataCurta(vigente.validoAte)} (
      {prazoTexto(dias)})
    </p>
  );
}

type Pendente = { id: string; nome: string; email: string; papel: Papel; criadoEm: string };

type UsuarioCondominio = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  cargo: Cargo | null;
  emailConfirmado: boolean;
  unidadeLabel: string | null;
};

const selectCls =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const VAZIO = {
  nome: '',
  endereco: '',
  cnpj: '',
  sindicoNome: '',
  sindicoEmail: '',
  sindicoSenha: '',
  plano: 'basic'
};

/** Dono da plataforma: todos os condomínios — cria, trava e destrava o acesso. */
export default function Admin() {
  const { usuario, logout, acessarComo } = useAuth();
  const navigate = useNavigate();
  const [lista, setLista] = useState<CondominioAdmin[] | null>(null);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState(VAZIO);
  const [aberto, setAberto] = useState(false);
  /** true = síndico recebe e-mail pra criar a senha; false = a gente define a senha agora. */
  const [convite, setConvite] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [motivo, setMotivo] = useState('Mensalidade em atraso');
  const [assinaturaDe, setAssinaturaDe] = useState<CondominioAdmin | null>(null);
  const [editando, setEditando] = useState<Pick<CondominioAdmin, 'id' | 'nome' | 'endereco' | 'cnpj'> | null>(null);
  /** Condomínio escolhido em "Acessar" e quem usa ele (null = carregando). */
  const [acessando, setAcessando] = useState<{
    condominio: CondominioAdmin;
    usuarios: UsuarioCondominio[] | null;
  } | null>(null);

  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const recarregar = () => {
    api
      .get<CondominioAdmin[]>('/admin/condominios')
      .then(setLista)
      .catch((e) => toast.error(e.message));
    api
      .get<Pendente[]>('/admin/pendentes')
      .then(setPendentes)
      .catch((e) => toast.error(e.message));
  };

  useEffect(() => {
    recarregar();
  }, []);

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.post('/admin/condominios', {
        ...form,
        sindicoSenha: convite ? '' : form.sindicoSenha
      });
      toast.success(
        convite
          ? `Condomínio cadastrado! Convite enviado para ${form.sindicoEmail}.`
          : 'Condomínio cadastrado! O síndico já pode entrar.'
      );
      setForm(VAZIO);
      setAberto(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar condomínio');
    } finally {
      recarregar(); // e-mail falhou ≠ condomínio não criado

      setSalvando(false);
    }
  }

  /** motivo = bloqueia (aparece pros usuários); null = libera. */
  async function handleEditar(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;
    setSalvando(true);
    try {
      const { id, ...dados } = editando;
      await api.patch(`/admin/condominios/${id}`, dados);
      toast.success('Condomínio atualizado');
      setEditando(null);
      await recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  async function definirBloqueio(c: CondominioAdmin, bloqueadoMotivo: string | null) {
    if (bloqueadoMotivo !== null && !bloqueadoMotivo.trim()) throw new Error('Informe o motivo');
    await api.patch(`/admin/condominios/${c.id}`, { bloqueadoMotivo });
    await recarregar();
  }

  async function enviarLinkSenha(c: CondominioAdmin) {
    const { enviadosPara } = await api.post<{ enviadosPara: string[] }>(`/admin/condominios/${c.id}/convite`);
    toast.success(`Link enviado para ${enviadosPara.join(', ')}`);
  }

  async function abrirAcesso(c: CondominioAdmin) {
    setAcessando({ condominio: c, usuarios: null });
    try {
      const usuarios = await api.get<UsuarioCondominio[]>(`/admin/condominios/${c.id}/usuarios`);
      setAcessando({ condominio: c, usuarios });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar usuários');
      setAcessando(null);
    }
  }

  async function entrarComo(u: UsuarioCondominio) {
    try {
      await acessarComo(u.id);
      navigate('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao acessar');
    }
  }

  async function confirmarEmail(u: { id: string; nome: string }) {
    try {
      await api.post(`/admin/usuarios/${u.id}/confirmar-email`);
      toast.success(`E-mail de ${u.nome} confirmado`);
      setPendentes((p) => p.filter((x) => x.id !== u.id));
      setAcessando((a) => a?.usuarios && { ...a, usuarios: a.usuarios!.map((x) => (x.id === u.id ? { ...x, emailConfirmado: true } : x)) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao confirmar e-mail');
    }
  }

  const filtrados = lista?.filter((c) => bate(busca, c.nome, c.endereco, c.cnpj, c.administradora?.nome));
  const set = (campo: keyof typeof VAZIO, valor: string) => setForm((f) => ({ ...f, [campo]: valor }));

  return (
    <div className="min-h-screen app-surface p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Brand compact />
            <div>
              <h1 className="font-heading text-lg font-extrabold">Administração</h1>
              <p className="text-xs text-muted-foreground">
                {usuario?.nome} · {lista?.length ?? '…'} condomínios ·{' '}
                {lista?.filter((c) => c.bloqueadoMotivo).length ?? 0} bloqueados ·{' '}
                {lista?.filter((c) => (diasParaVencer(c) ?? 0) < 0).length ?? 0} vencidas
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>

        {pendentes.length > 0 && (
          <Card className="space-y-2 p-4">
            <p className="text-sm font-semibold">Cadastros aguardando confirmação de e-mail</p>
            {pendentes.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{p.nome}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {LABEL.papel[p.papel]} · {p.email} · {dataCurta(p.criadoEm)}
                  </span>
                </span>
                <Button size="sm" variant="outline" onClick={() => confirmarEmail(p)}>
                  Confirmar e-mail
                </Button>
              </div>
            ))}
          </Card>
        )}

        <div className="flex flex-wrap justify-between gap-2">
          <BuscaInput value={busca} onChange={setBusca} placeholder="Buscar condomínio" />
          <Button variant="brand" onClick={() => setAberto(true)}>
            <Plus className="h-4 w-4" /> Novo condomínio
          </Button>
        </div>

        <div className="space-y-3">
          {!filtrados ? (
            <>
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </>
          ) : filtrados.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum condomínio encontrado.</p>
          ) : (
            filtrados.map((c) => (
              <Card key={c.id} className={c.bloqueadoMotivo ? 'border-destructive' : undefined}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
                  <div className="space-y-0.5">
                    <p className="font-semibold">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.endereco || 'Sem endereço'}
                      {c.administradora && ` · ${c.administradora.nome}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c._count.unidades} unidades · {c._count.profiles} usuários
                    </p>
                    <TextoAssinatura c={c} />
                    {c.bloqueadoMotivo && (
                      <p className="text-xs font-medium text-destructive">Bloqueado: {c.bloqueadoMotivo}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditando({ id: c.id, nome: c.nome, endereco: c.endereco, cnpj: c.cnpj })}
                    >
                      <Pencil className="h-4 w-4" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => abrirAcesso(c)}>
                      <LogIn className="h-4 w-4" /> Acessar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setAssinaturaDe(c)}>
                      <CreditCard className="h-4 w-4" /> Assinatura
                    </Button>
                    <AsyncConfirmDialog
                      trigger={
                        <Button size="sm" variant="ghost">
                          <Mail className="h-4 w-4" /> Enviar link de senha
                        </Button>
                      }
                      title="Enviar link de senha?"
                      description={`O síndico de "${c.nome}" recebe por e-mail um link para criar uma nova senha.`}
                      confirmLabel="Enviar"
                      onConfirm={() => enviarLinkSenha(c)}
                    />
                    {c.bloqueadoMotivo ? (
                      <AsyncConfirmDialog
                        trigger={
                          <Button size="sm" variant="brand">
                            <Unlock className="h-4 w-4" /> Liberar
                          </Button>
                        }
                        title="Liberar acesso?"
                        description={`Todos os usuários de "${c.nome}" voltam a entrar no sistema.`}
                        confirmLabel="Liberar"
                        successMessage="Acesso liberado"
                        onConfirm={() => definirBloqueio(c, null)}
                      />
                    ) : (
                      <AsyncConfirmDialog
                        trigger={
                          <Button size="sm" variant="outline">
                            <Lock className="h-4 w-4" /> Bloquear
                          </Button>
                        }
                        title="Bloquear acesso?"
                        description={`Ninguém de "${c.nome}" consegue usar o sistema até você liberar.`}
                        confirmLabel="Bloquear"
                        confirmVariant="destructive"
                        successMessage="Acesso bloqueado"
                        onConfirm={() => definirBloqueio(c, motivo)}
                      >
                        <Field label="Motivo (aparece para os usuários)" htmlFor={`motivo-${c.id}`}>
                          <Input id={`motivo-${c.id}`} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                        </Field>
                      </AsyncConfirmDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <FormModal aberto={!!editando} titulo="Editar condomínio" onFechar={() => setEditando(null)} salvando={salvando}>
          {editando && (
            <form onSubmit={handleEditar} className="space-y-4">
              <Field label="Nome do condomínio" htmlFor="editar-nome">
                <Input
                  id="editar-nome"
                  value={editando.nome}
                  onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                  required
                />
              </Field>
              <Field label="Endereço" htmlFor="editar-endereco">
                <Input
                  id="editar-endereco"
                  value={editando.endereco}
                  onChange={(e) => setEditando({ ...editando, endereco: e.target.value })}
                />
              </Field>
              <Field label="CNPJ" htmlFor="editar-cnpj">
                <Input
                  id="editar-cnpj"
                  value={editando.cnpj}
                  onChange={(e) => setEditando({ ...editando, cnpj: e.target.value })}
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditando(null)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="brand" disabled={salvando}>
                  {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </form>
          )}
        </FormModal>

        <AssinaturaModal condominio={assinaturaDe} onFechar={() => setAssinaturaDe(null)} onMudou={recarregar} />

        <FormModal
          aberto={!!acessando}
          titulo={`Acessar ${acessando?.condominio.nome ?? ''} como…`}
          onFechar={() => setAcessando(null)}
        >
          {!acessando?.usuarios ? (
            <Skeleton className="h-20" />
          ) : acessando.usuarios.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum usuário neste condomínio.</p>
          ) : (
            <div className="space-y-4">
              {(['sindico', 'administradora', 'funcionario', 'condomino'] as Papel[]).map((papel) => {
                const grupo = acessando.usuarios!.filter((u) => u.papel === papel);
                if (!grupo.length) return null;
                return (
                  <div key={papel} className="space-y-1">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{LABEL.papel[papel]}</p>
                    {grupo.map((u) => (
                      <div key={u.id} className="flex items-center gap-2">
                        <button
                          className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => entrarComo(u)}
                        >
                          <span>
                            <span className="font-medium">{nomeComFuncao(u)}</span>
                            <span className="block text-xs text-muted-foreground">
                              {u.email}
                              {u.unidadeLabel && ` · ${u.unidadeLabel}`}
                            </span>
                          </span>
                          <LogIn className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </button>
                        {!u.emailConfirmado && (
                          <Button size="sm" variant="outline" onClick={() => confirmarEmail(u)}>
                            Confirmar e-mail
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </FormModal>

        <FormModal aberto={aberto} titulo="Novo condomínio" onFechar={() => setAberto(false)} salvando={salvando}>
          <form onSubmit={handleCriar} className="space-y-4">
            <Field label="Nome do condomínio" htmlFor="nome">
              <Input id="nome" value={form.nome} onChange={(e) => set('nome', e.target.value)} required />
            </Field>
            <Field label="Endereço" htmlFor="endereco">
              <Input id="endereco" value={form.endereco} onChange={(e) => set('endereco', e.target.value)} />
            </Field>
            <Field label="CNPJ (opcional)" htmlFor="cnpj">
              <Input id="cnpj" value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} />
            </Field>
            <Field label="Plano" htmlFor="plano">
              <select id="plano" className={selectCls} value={form.plano} onChange={(e) => set('plano', e.target.value)}>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
            </Field>
            <Field label="Nome do síndico" htmlFor="sindicoNome">
              <Input
                id="sindicoNome"
                value={form.sindicoNome}
                onChange={(e) => set('sindicoNome', e.target.value)}
                required
              />
            </Field>
            <Field label="E-mail do síndico" htmlFor="sindicoEmail">
              <Input
                id="sindicoEmail"
                type="email"
                value={form.sindicoEmail}
                onChange={(e) => set('sindicoEmail', e.target.value)}
                required
              />
            </Field>
            <fieldset className="space-y-2">
              <legend className="mb-1.5 text-sm font-medium">Senha do síndico</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="acesso" checked={convite} onChange={() => setConvite(true)} />
                Enviar e-mail para o síndico criar a própria senha
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="acesso" checked={!convite} onChange={() => setConvite(false)} />
                Definir a senha agora
              </label>
            </fieldset>
            {!convite && (
              <Field
                label="Senha inicial do síndico"
                htmlFor="sindicoSenha"
                hint="Mínimo de 6 caracteres. O síndico troca no perfil."
              >
                <Input
                  id="sindicoSenha"
                  type="text"
                  minLength={6}
                  value={form.sindicoSenha}
                  onChange={(e) => set('sindicoSenha', e.target.value)}
                  required
                />
              </Field>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="brand" disabled={salvando}>
                {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
                Cadastrar
              </Button>
            </div>
          </form>
        </FormModal>
      </div>
    </div>
  );
}
