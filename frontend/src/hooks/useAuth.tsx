import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Condominio, Papel } from '@/types/condominio';

export type Usuario = {
  id: string;
  nome: string;
  papel: Papel;
  unidadeId: string | null;
  condominioId: string | null;
  administradoraId: string | null;
  /** false até concluir/pular o tutorial de primeiro acesso. */
  tutorialVisto: boolean;
};

export type DadosCadastro = {
  tipo: 'sindico' | 'administradora';
  email: string;
  senha: string;
  nome: string;
  condominioNome?: string;
  condominioEndereco?: string;
  condominioCnpj?: string;
  administradoraNome?: string;
  administradoraCnpj?: string;
};

type AuthValue = {
  usuario: Usuario | null;
  condominio: Condominio | null;
  isSindico: boolean;
  /** true só para o papel "administradora" (gestora de vários condomínios). */
  isAdministradora: boolean;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  /** Cria a conta — de síndico (+ 1 condomínio) ou de administradora (+ a
   * empresa, sem condomínio ainda). Retorna `precisaConfirmarEmail` se o
   * projeto exigir confirmação por e-mail antes de liberar a sessão. */
  cadastrar: (dados: DadosCadastro) => Promise<{ precisaConfirmarEmail: boolean }>;
  logout: () => Promise<void>;
  /** Atualiza só o nome exibido (topbar/sidebar) após editar o perfil. */
  atualizarNome: (nome: string) => void;
  /** Marca o tutorial de primeiro acesso como visto (no banco). */
  concluirTutorial: () => Promise<void>;
  /** Recarrega o condomínio (ex.: depois de salvar as perguntas de onboarding). */
  recarregarCondominio: () => Promise<void>;
  /** Recarrega perfil + condomínio (ex.: depois de trocar/criar condomínio como administradora). */
  recarregarSessao: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

async function carregarPerfil(userId: string): Promise<Usuario | null> {
  // `*` em vez de listar colunas: se a migration do tutorial (tutorial_visto_em)
  // ainda não foi aplicada, o login continua funcionando — só não mostra o tutorial.
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    nome: data.nome,
    papel: data.papel,
    unidadeId: data.unidade_id,
    condominioId: data.condominio_id,
    administradoraId: data.administradora_id,
    tutorialVisto: data.tutorial_visto_em !== null // undefined (coluna ausente) conta como visto
  };
}

async function carregarCondominio(condominioId: string): Promise<Condominio | null> {
  const { data, error } = await supabase
    .from('condominios')
    .select('id, nome, endereco, cnpj, tem_blocos, qtd_blocos, tem_comercio, qtd_comercio, tem_areas_reserva, tem_porteiro, onboarding_concluido')
    .eq('id', condominioId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    nome: data.nome,
    endereco: data.endereco,
    cnpj: data.cnpj,
    temBlocos: data.tem_blocos,
    qtdBlocos: data.qtd_blocos,
    temComercio: data.tem_comercio,
    qtdComercio: data.qtd_comercio,
    temAreasReserva: data.tem_areas_reserva,
    temPorteiro: data.tem_porteiro,
    onboardingConcluido: data.onboarding_concluido
  };
}

function mensagemErro(msg: string) {
  if (msg === 'Invalid login credentials') return 'E-mail ou senha inválidos';
  if (msg.toLowerCase().includes('already registered')) return 'Já existe uma conta com esse e-mail';
  if (msg.toLowerCase().includes('password')) return 'Senha inválida (mínimo de 6 caracteres)';
  return msg;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function hidratar(session: Session | null) {
      if (!session) {
        if (ativo) {
          setUsuario(null);
          setCondominio(null);
          setCarregando(false);
        }
        return;
      }
      const perfil = await carregarPerfil(session.user.id);
      const cond = perfil?.condominioId ? await carregarCondominio(perfil.condominioId) : null;
      if (ativo) {
        setUsuario(perfil);
        setCondominio(cond);
        setCarregando(false);
      }
    }

    supabase.auth.getSession().then(({ data }) => hidratar(data.session));

    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, session) => {
      hidratar(session);
    });

    return () => {
      ativo = false;
      assinatura.subscription.unsubscribe();
    };
  }, []);

  async function recarregarCondominio() {
    if (!usuario?.condominioId) return;
    const cond = await carregarCondominio(usuario.condominioId);
    setCondominio(cond);
  }

  /** Depois de trocar/criar condomínio (administradora), usuario.condominioId
   * muda no banco — precisa recarregar o perfil inteiro, não só o condomínio. */
  async function recarregarSessao() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const perfil = await carregarPerfil(data.session.user.id);
    const cond = perfil?.condominioId ? await carregarCondominio(perfil.condominioId) : null;
    setUsuario(perfil);
    setCondominio(cond);
  }

  async function login(email: string, senha: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw new Error(mensagemErro(error.message));
  }

  async function cadastrar(dados: DadosCadastro) {
    const meta: Record<string, string> =
      dados.tipo === 'administradora'
        ? {
            nome: dados.nome,
            papel: 'administradora',
            administradora_nome: dados.administradoraNome ?? '',
            administradora_cnpj: dados.administradoraCnpj ?? ''
          }
        : {
            nome: dados.nome,
            papel: 'sindico',
            condominio_nome: dados.condominioNome ?? '',
            condominio_endereco: dados.condominioEndereco ?? '',
            condominio_cnpj: dados.condominioCnpj ?? ''
          };

    const { data, error } = await supabase.auth.signUp({
      email: dados.email,
      password: dados.senha,
      options: { data: meta }
    });
    if (error) throw new Error(mensagemErro(error.message));
    // Com confirmação de e-mail ligada no projeto, signUp não devolve sessão
    // — a pessoa só consegue entrar depois de clicar no link recebido.
    return { precisaConfirmarEmail: !data.session };
  }

  async function logout() {
    await supabase.auth.signOut();
    setUsuario(null);
    setCondominio(null);
  }

  function atualizarNome(nome: string) {
    setUsuario((u) => (u ? { ...u, nome } : u));
  }

  async function concluirTutorial() {
    if (!usuario) return;
    // fecha na hora; se o update falhar, o pior caso é o tutorial voltar no próximo acesso
    setUsuario((u) => (u ? { ...u, tutorialVisto: true } : u));
    await supabase.from('profiles').update({ tutorial_visto_em: new Date().toISOString() }).eq('id', usuario.id);
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        condominio,
        // Administradora tem, no condomínio ativo, as mesmas permissões de
        // síndico (é o que a policy is_sindico() do banco também passou a
        // considerar) — por isso entra nessa flag em vez de uma checagem à parte.
        isSindico: usuario?.papel === 'sindico' || usuario?.papel === 'administradora',
        isAdministradora: usuario?.papel === 'administradora',
        carregando,
        login,
        cadastrar,
        logout,
        atualizarNome,
        concluirTutorial,
        recarregarCondominio,
        recarregarSessao
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
