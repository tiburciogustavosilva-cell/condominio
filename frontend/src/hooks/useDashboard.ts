import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { DashboardResumo } from '@/types/condominio';

export function useDashboard() {
  const { isSindico } = useAuth();
  const [dados, setDados] = useState<DashboardResumo | null>(null);

  useEffect(() => {
    let ativo = true;
    api
      .get<DashboardResumo>('/dashboard')
      .then((resumo) => ativo && setDados(resumo))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [isSindico]);

  return { dados, carregando: dados === null };
}
