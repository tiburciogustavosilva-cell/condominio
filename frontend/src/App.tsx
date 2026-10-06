import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { Toaster } from '@/components/ui/sonner';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  BloqueiaFuncionario,
  FaixaSuporte,
  RequireStaff,
  RequireAdmin,
  RequireAuth,
  RequireComAreasReserva,
  RequireComPorteiro,
  RequireCondominioAtivo,
  RequireOnboardingConcluido,
  RequireRecurso,
  RequireSindico
} from '@/components/layout/guards';

import Login from '@/pages/Login';
import Cadastro from '@/pages/Cadastro';
import DefinirSenha from '@/pages/DefinirSenha';
import PerguntasCondominio from '@/pages/PerguntasCondominio';
import MeusCondominios from '@/pages/MeusCondominios';
import Admin from '@/pages/Admin';
import Dashboard from '@/pages/Dashboard';
import Chamados from '@/pages/Chamados';
import ChamadoDetalhe from '@/pages/ChamadoDetalhe';
import Reservas from '@/pages/Reservas';
import Encomendas from '@/pages/Encomendas';
import Tarefas from '@/pages/Tarefas';
import Avisos from '@/pages/Avisos';
import Ocorrencias from '@/pages/Ocorrencias';
import Votacoes from '@/pages/Votacoes';
import Assembleia from '@/pages/Assembleia';
import ManutencaoPredial from '@/pages/ManutencaoPredial';
import Moradores from '@/pages/Moradores';
import Funcionarios from '@/pages/Funcionarios';
import Unidades from '@/pages/Unidades';
import Perfil from '@/pages/Perfil';
import Plano from '@/pages/Plano';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/definir-senha" element={<DefinirSenha />} />

          <Route element={<RequireAuth />}>
            <Route path="/perguntas-condominio" element={<PerguntasCondominio />} />
            <Route path="/meus-condominios" element={<MeusCondominios />} />
            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<Admin />} />
            </Route>

            <Route element={<RequireCondominioAtivo />}>
              <Route element={<RequireOnboardingConcluido />}>
                <Route element={<AdminLayout />}>
                  <Route element={<BloqueiaFuncionario />}>
                    <Route index element={<Dashboard />} />
                    <Route element={<RequireRecurso recurso="chamados" />}>
                      <Route path="chamados" element={<Chamados />} />
                      <Route path="chamados/:id" element={<ChamadoDetalhe />} />
                    </Route>
                    <Route element={<RequireComAreasReserva />}>
                      <Route element={<RequireRecurso recurso="reservas" />}>
                        <Route path="reservas" element={<Reservas />} />
                      </Route>
                    </Route>
                    <Route element={<RequireRecurso recurso="ocorrencias" />}>
                      <Route path="ocorrencias" element={<Ocorrencias />} />
                    </Route>
                    <Route element={<RequireRecurso recurso="assembleias" />}>
                      <Route path="votacoes" element={<Votacoes />} />
                      <Route path="votacoes/:id" element={<Assembleia />} />
                    </Route>
                  </Route>
                  <Route element={<RequireStaff />}>
                    <Route element={<RequireRecurso recurso="tarefas" />}>
                      <Route path="tarefas" element={<Tarefas />} />
                    </Route>
                  </Route>
                  <Route element={<RequireComPorteiro />}>
                    <Route element={<RequireRecurso recurso="encomendas" />}>
                      <Route path="encomendas" element={<Encomendas />} />
                    </Route>
                  </Route>
                  <Route element={<RequireRecurso recurso="avisos" />}>
                    <Route path="avisos" element={<Avisos />} />
                  </Route>
                  <Route path="perfil" element={<Perfil />} />

                  <Route element={<RequireSindico />}>
                    <Route path="prestadores" element={<Navigate to="/manutencao-predial?aba=prestadores" replace />} />
                    <Route element={<RequireRecurso recurso="manutencoes" />}>
                      <Route path="manutencao-predial" element={<ManutencaoPredial />} />
                    </Route>
                    <Route path="moradores" element={<Moradores />} />
                    <Route element={<RequireRecurso recurso="funcionarios" />}>
                      <Route path="funcionarios" element={<Funcionarios />} />
                    </Route>
                    <Route path="unidades" element={<Unidades />} />
                    <Route path="plano" element={<Plano />} />
                  </Route>
                </Route>
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <FaixaSuporte />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}
