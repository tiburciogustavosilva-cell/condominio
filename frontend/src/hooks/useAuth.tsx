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
};

export type DadosCadastro = {
  email: string;
  senha: string;
  nome: string;
  condominioNome: string;
  condominioEndereco: string;
  condominioCnpj: string;
};

type AuthValue = {
  usuario: Usuario | null;
  condominio: Condominio | null;
  isSindico: boolean;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  /** Cria a conta + o condomínio novo. Retorna `precisaConfirmarEmail` se o
   * projeto exigir confirmação por e-mail antes de liberar a sessão. */
  cadastrar: (dados: DadosCadastro) => Promise<{ precisaConfirmarEmail: boolean }>;
  logout: () => Promise<void>;
  /** Atualiza só o nome exibido (topbar/sidebar) após editar o perfil. */
  atualizarNome: (nome: string) => void;
  /** Recarrega o condomínio (ex.: depois de salvar as perguntas de onboarding). */
  recarregarCondominio: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

async function carregarPerfil(userId: string): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome, papel, unidade_id, condominio_id')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id, nome: data.nome, papel: data.papel, unidadeId: data.unidade_id, condominioId: data.condominio_id };
}

async function carregarCondominio(condominioId: string): Promise<Condominio | null> {
  const { data, error } = await supabase
    .from('condominios')
    .select('id, nome, endereco, cnpj, tem_blocos, qtd_blocos, tem_comercio, qtd_comercio, tem_porteiro, onboarding_concluido')
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

  async function login(email: string, senha: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw new Error(mensagemErro(error.message));
  }

  async function cadastrar(dados: DadosCadastro) {
    const { data, error } = await supabase.auth.signUp({
      email: dados.email,
      password: dados.senha,
      options: {
        data: {
          nome: dados.nome,
          papel: 'sindico',
          condominio_nome: dados.condominioNome,
          condominio_endereco: dados.condominioEndereco,
          condominio_cnpj: dados.condominioCnpj
        }
      }
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

  return (
    <AuthContext.Provider
      value={{
        usuario,
        condominio,
        isSindico: usuario?.papel === 'sindico',
        carregando,
        login,
        cadastrar,
        logout,
        atualizarNome,
        recarregarCondominio
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
