import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, tokenStore, EVENTO_ACESSO_SUSPENSO, EVENTO_SESSAO_EXPIRADA } from '@/lib/api';
import { CARGOS_PORTARIA, type Cargo, type Condominio, type Papel, type Vinculo } from '@/types/condominio';

export type Usuario = {
  id: string;
  nome: string;
  papel: Papel;
  /** Só funcionário: define o acesso (porteiro usa Encomendas). */
  cargo: Cargo | null;
  /** Relação com a unidade (proprietário/inquilino/procurador) — restringe algumas pautas de votação. */
  vinculo: Vinculo | null;
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
  /** Dono da plataforma: só a tela /admin (todos os condomínios). */
  isAdmin: boolean;
  /** Admin da plataforma navegando como outro usuário (suporte). */
  suporte: boolean;
  /** Admin: entra como o usuário escolhido (token de suporte, 2h). */
  acessarComo: (usuarioId: string) => Promise<void>;
  /** Volta pra sessão do admin. */
  sairDoSuporte: () => Promise<void>;
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
  /** Link do convite por e-mail: define a senha e já entra. */
  definirSenha: (token: string, senha: string) => Promise<void>;
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

  const suporte = !!usuario && !!tokenStore.admin.get();

  function aplicar(sessao: Sessao | null) {
    // no suporte, o tutorial de primeiro acesso não abre (nem é marcado como visto) — é do usuário
    const u = sessao?.usuario && tokenStore.admin.get() ? { ...sessao.usuario, tutorialVisto: true } : sessao?.usuario;
    setUsuario(u ?? null);
    setCondominio(sessao?.condominio ?? null);
  }

  async function recarregarSessao() {
    if (!tokenStore.get()) return aplicar(null);
    aplicar(await api.get<Sessao>('/auth/me').catch(() => null));
  }

  useEffect(() => {
    recarregarSessao().finally(() => setCarregando(false));
    // API respondeu 401 (token expirado/inválido) → volta pro login, ou pro admin se era suporte.
    const expirou = () => (tokenStore.admin.get() ? sairDoSuporte() : aplicar(null));
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, expirou);
    window.addEventListener(EVENTO_ACESSO_SUSPENSO, recarregarSessao);
    return () => {
      window.removeEventListener(EVENTO_SESSAO_EXPIRADA, expirou);
      window.removeEventListener(EVENTO_ACESSO_SUSPENSO, recarregarSessao);
    };
  }, []);

  /** tokenAdmin só no suporte; qualquer outro login descarta um que tenha sobrado. */
  function entrar(resposta: RespostaToken, tokenAdmin?: string) {
    tokenStore.set(resposta.token);
    if (tokenAdmin) tokenStore.admin.set(tokenAdmin);
    else tokenStore.admin.limpar();
    aplicar(resposta);
  }

  async function login(email: string, senha: string) {
    entrar(await api.post<RespostaToken>('/auth/login', { email, senha }));
  }

  async function cadastrar(dados: DadosCadastro) {
    entrar(await api.post<RespostaToken>('/auth/cadastro', dados));
    return { precisaConfirmarEmail: false }; // sem confirmação por e-mail: já entra logado
  }

  async function definirSenha(token: string, senha: string) {
    entrar(await api.post<RespostaToken>('/auth/definir-senha', { token, senha }));
  }

  async function acessarComo(usuarioId: string) {
    const resposta = await api.post<RespostaToken>(`/admin/usuarios/${usuarioId}/acessar`);
    entrar(resposta, tokenStore.get()!);
  }

  async function sairDoSuporte() {
    tokenStore.set(tokenStore.admin.get()!);
    tokenStore.admin.limpar();
    await recarregarSessao();
  }

  async function logout() {
    tokenStore.limpar(); // JWT stateless: sair = descartar o token
    tokenStore.admin.limpar();
    aplicar(null);
  }

  function atualizarNome(nome: string) {
    setUsuario((u) => (u ? { ...u, nome } : u));
  }

  async function concluirTutorial() {
    if (!usuario || suporte) return;
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
        isAdmin: usuario?.papel === 'admin',
        suporte,
        acessarComo,
        sairDoSuporte,
        isFuncionario: usuario?.papel === 'funcionario',
        // Porteiro (funcionário) registra/libera encomendas junto com síndico e administradora.
        isEquipe:
          usuario?.papel === 'sindico' ||
          usuario?.papel === 'administradora' ||
          (usuario?.papel === 'funcionario' && !!usuario.cargo && CARGOS_PORTARIA.includes(usuario.cargo)),
        carregando,
        login,
        cadastrar,
        definirSenha,
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
