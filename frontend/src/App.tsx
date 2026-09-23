import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { Toaster } from '@/components/ui/sonner';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { RequireAuth, RequireSindico } from '@/components/layout/guards';

import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Chamados from '@/pages/Chamados';
import NovoChamado from '@/pages/NovoChamado';
import ChamadoDetalhe from '@/pages/ChamadoDetalhe';
import Reservas from '@/pages/Reservas';
import Encomendas from '@/pages/Encomendas';
import Avisos from '@/pages/Avisos';
import Prestadores from '@/pages/Prestadores';
import ManutencaoPredial from '@/pages/ManutencaoPredial';
import Moradores from '@/pages/Moradores';
import Unidades from '@/pages/Unidades';
import Perfil from '@/pages/Perfil';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<RequireAuth />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="chamados" element={<Chamados />} />
              <Route path="chamados/novo" element={<NovoChamado />} />
              <Route path="chamados/:id" element={<ChamadoDetalhe />} />
              <Route path="reservas" element={<Reservas />} />
              <Route path="encomendas" element={<Encomendas />} />
              <Route path="avisos" element={<Avisos />} />
              <Route path="perfil" element={<Perfil />} />

              <Route element={<RequireSindico />}>
                <Route path="prestadores" element={<Prestadores />} />
                <Route path="manutencao-predial" element={<ManutencaoPredial />} />
                <Route path="moradores" element={<Moradores />} />
                <Route path="unidades" element={<Unidades />} />
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
