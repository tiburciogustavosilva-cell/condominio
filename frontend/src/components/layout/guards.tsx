import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { nomeComFuncao } from '@/types/condominio';
import { Button } from '@/components/ui/button';

export function RequireAuth() {
  const { usuario, carregando } = useAuth();
  const location = useLocation();

  if (carregando) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Carregando…</div>;
  }
  // o destino vai na URL (sobrevive a recarregar): ex. QR da assembleia → login → volta pra votação
  if (!usuario) {
    const voltar = location.pathname + location.search;
    return <Navigate to={voltar === '/' ? '/login' : `/login?voltar=${encodeURIComponent(voltar)}`} replace />;
  }
  return <Outlet />;
}

export function RequireSindico() {
  const { isSindico } = useAuth();
  if (!isSindico) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Administradora sem condomínio ativo (nenhum cadastrado ainda, ou nenhum
 * escolhido) vai pro seletor antes de liberar o resto do sistema — que
 * assume um condomínio ativo em toda parte. */
export function RequireCondominioAtivo() {
  const { isAdmin, isAdministradora, usuario, condominio, suporte } = useAuth();
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (isAdministradora && !usuario?.condominioId) {
    return <Navigate to="/meus-condominios" replace />;
  }
  if (condominio?.bloqueadoMotivo && !suporte) return <AcessoSuspenso motivo={condominio.bloqueadoMotivo} />;
  return <Outlet />;
}

/** Condomínio travado pelo admin da plataforma — a API também recusa tudo (403). */
function AcessoSuspenso({ motivo }: { motivo: string }) {
  const { isAdministradora, logout } = useAuth();
  return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div className="max-w-sm space-y-3">
        <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="font-heading text-lg font-extrabold">Acesso suspenso</h1>
        <p className="text-sm text-muted-foreground">{motivo}</p>
        <p className="text-sm text-muted-foreground">Entre em contato com o suporte para regularizar.</p>
        <div className="flex justify-center gap-2">
          {isAdministradora && (
            <Button asChild variant="outline" size="sm">
              <Link to="/meus-condominios">Trocar de condomínio</Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={logout}>
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Faixa fixa enquanto o admin navega como outro usuário — com o caminho de volta. */
export function FaixaSuporte() {
  const { suporte, usuario, condominio, sairDoSuporte } = useAuth();
  const navigate = useNavigate();
  if (!suporte || !usuario) return null;
  return (
    <div className="fixed left-1/2 top-2 z-[60] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-full bg-warning px-4 py-1.5 text-xs font-medium text-warning-foreground shadow-lg">
      <span className="truncate">
        Suporte: {nomeComFuncao(usuario)} · {condominio?.nome}
      </span>
      <button
        className="shrink-0 font-bold underline underline-offset-2"
        onClick={async () => {
          await sairDoSuporte();
          navigate('/admin');
        }}
      >
        Voltar ao admin
      </button>
    </div>
  );
}

export function RequireAdmin() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Manda o síndico pra tela de perguntas iniciais antes de liberar o resto do sistema. */
export function RequireOnboardingConcluido() {
  const { isSindico, condominio } = useAuth();
  if (isSindico && condominio && !condominio.onboardingConcluido) {
    return <Navigate to="/perguntas-condominio" replace />;
  }
  return <Outlet />;
}

/** Tela inicial do funcionário: porteiro cai em Encomendas; os demais, em Tarefas. */
function inicioFuncionario(isEquipe: boolean, temPorteiro?: boolean) {
  return isEquipe && temPorteiro ? '/encomendas' : '/tarefas';
}

/** Funcionário só usa Encomendas (porteiro)/Tarefas/Avisos/Perfil — o resto manda pra lá. */
export function BloqueiaFuncionario() {
  const { isFuncionario, isEquipe, condominio } = useAuth();
  if (isFuncionario) return <Navigate to={inicioFuncionario(isEquipe, condominio?.temPorteiro)} replace />;
  return <Outlet />;
}

/** Só equipe interna (síndico/administradora e funcionários); condômino volta pro início. */
export function RequireStaff() {
  const { isSindico, isFuncionario } = useAuth();
  if (!isSindico && !isFuncionario) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Só libera a rota se o condomínio tiver porteiro (ex.: módulo de Encomendas). */
export function RequireComPorteiro() {
  const { condominio, isFuncionario, isEquipe } = useAuth();
  if (condominio && !condominio.temPorteiro) return <Navigate to="/" replace />;
  if (isFuncionario && !isEquipe) return <Navigate to="/tarefas" replace />; // só porteiro usa Encomendas
  return <Outlet />;
}

/** Só libera a rota se o condomínio tiver área que precisa de reserva. */
export function RequireComAreasReserva() {
  const { condominio } = useAuth();
  if (condominio && !condominio.temAreasReserva) return <Navigate to="/" replace />;
  return <Outlet />;
}
