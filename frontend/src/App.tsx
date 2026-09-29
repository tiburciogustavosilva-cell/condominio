import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { Toaster } from '@/components/ui/sonner';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  BloqueiaFuncionario,
  RequireStaff,
  RequireAuth,
  RequireComAreasReserva,
  RequireComPorteiro,
  RequireCondominioAtivo,
  RequireOnboardingConcluido,
  RequireSindico
} from '@/components/layout/guards';

import Login from '@/pages/Login';
import Cadastro from '@/pages/Cadastro';
import PerguntasCondominio from '@/pages/PerguntasCondominio';
import MeusCondominios from '@/pages/MeusCondominios';
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
import Prestadores from '@/pages/Prestadores';
import ManutencaoPredial from '@/pages/ManutencaoPredial';
import Moradores from '@/pages/Moradores';
import Funcionarios from '@/pages/Funcionarios';
import Unidades from '@/pages/Unidades';
import Perfil from '@/pages/Perfil';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/perguntas-condominio" element={<PerguntasCondominio />} />

          <Route element={<RequireAuth />}>
            <Route path="/meus-condominios" element={<MeusCondominios />} />

            <Route element={<RequireCondominioAtivo />}>
              <Route element={<RequireOnboardingConcluido />}>
                <Route element={<AdminLayout />}>
                  <Route element={<BloqueiaFuncionario />}>
                    <Route index element={<Dashboard />} />
                    <Route path="chamados" element={<Chamados />} />
                    <Route path="chamados/:id" element={<ChamadoDetalhe />} />
                    <Route element={<RequireComAreasReserva />}>
                      <Route path="reservas" element={<Reservas />} />
                    </Route>
                    <Route path="ocorrencias" element={<Ocorrencias />} />
                    <Route path="votacoes" element={<Votacoes />} />
                    <Route path="votacoes/:id" element={<Assembleia />} />
                  </Route>
                  <Route element={<RequireStaff />}>
                    <Route path="tarefas" element={<Tarefas />} />
                  </Route>
                  <Route element={<RequireComPorteiro />}>
                    <Route path="encomendas" element={<Encomendas />} />
                  </Route>
                  <Route path="avisos" element={<Avisos />} />
                  <Route path="perfil" element={<Perfil />} />

                  <Route element={<RequireSindico />}>
                    <Route path="prestadores" element={<Prestadores />} />
                    <Route path="manutencao-predial" element={<ManutencaoPredial />} />
                    <Route path="moradores" element={<Moradores />} />
                    <Route path="funcionarios" element={<Funcionarios />} />
                    <Route path="unidades" element={<Unidades />} />
                  </Route>
                </Route>
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}
