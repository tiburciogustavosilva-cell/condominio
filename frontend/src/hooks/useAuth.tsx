import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, tokenStore, EVENTO_SESSAO_EXPIRADA } from '@/lib/api';
import { CARGOS_PORTARIA, type Cargo, type Condominio, type Papel } from '@/types/condominio';

export type Usuario = {
  id: string;
  nome: string;
  papel: Papel;
  /** Só funcionário: define o acesso (porteiro usa Encomendas). */
  cargo: Cargo | null;
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
  /** Portaria/zelador: só Encomendas e Avisos. */
  isFuncionario: boolean;
  /** Quem registra e libera encomendas: síndico, administradora ou funcionário. */
  isEquipe: boolean;
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

type Sessao = { usuario: Usuario; condominio: Condominio | null };
type RespostaToken = Sessao & { token: string; tokenType: 'Bearer' };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [condominio, setCondominio] = useState<Condominio | null>(null);
  const [carregando, setCarregando] = useState(true);

  function aplicar(sessao: Sessao | null) {
    setUsuario(sessao?.usuario ?? null);
    setCondominio(sessao?.condominio ?? null);
  }

  async function recarregarSessao() {
    if (!tokenStore.get()) return aplicar(null);
    aplicar(await api.get<Sessao>('/auth/me').catch(() => null));
  }

  useEffect(() => {
    recarregarSessao().finally(() => setCarregando(false));
    // API respondeu 401 (token expirado/inválido) → volta pro login.
    const expirou = () => aplicar(null);
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, expirou);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, expirou);
  }, []);

  function entrar(resposta: RespostaToken) {
    tokenStore.set(resposta.token);
    aplicar(resposta);
  }

  async function login(email: string, senha: string) {
    entrar(await api.post<RespostaToken>('/auth/login', { email, senha }));
  }

  async function cadastrar(dados: DadosCadastro) {
    entrar(await api.post<RespostaToken>('/auth/cadastro', dados));
    return { precisaConfirmarEmail: false }; // sem confirmação por e-mail: já entra logado
  }

  async function logout() {
    tokenStore.limpar(); // JWT stateless: sair = descartar o token
    aplicar(null);
  }

  function atualizarNome(nome: string) {
    setUsuario((u) => (u ? { ...u, nome } : u));
  }

  async function concluirTutorial() {
    if (!usuario) return;
    // fecha na hora; se o request falhar, o pior caso é o tutorial voltar no próximo acesso
    setUsuario((u) => (u ? { ...u, tutorialVisto: true } : u));
    await api.post('/perfil/tutorial').catch(() => {});
  }

  // Onboarding altera só o condomínio, mas /auth/me já traz os dois.
  const recarregarCondominio = recarregarSessao;

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
        isFuncionario: usuario?.papel === 'funcionario',
        // Porteiro (funcionário) registra/libera encomendas junto com síndico e administradora.
        isEquipe:
          usuario?.papel === 'sindico' ||
          usuario?.papel === 'administradora' ||
          (usuario?.papel === 'funcionario' && !!usuario.cargo && CARGOS_PORTARIA.includes(usuario.cargo)),
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
