import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Manutencao, Prestador } from '@/types/condominio';

export function usePrestadores() {
  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setPrestadores(await api.get<Prestador[]>('/prestadores').catch(() => []));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    prestadores,
    carregando,
    recarregar,
    criar: async (dados: Record<string, string>) => {
      await api.post('/prestadores', dados);
    },
    atualizar: async (id: string, dados: Record<string, string>) => {
      await api.put(`/prestadores/${id}`, dados);
    },
    remover: async (id: string) => {
      await api.delete(`/prestadores/${id}`);
    }
  };
}

/** Agenda de manutenções recorrentes (mesmo domínio de "Prestadores"). Status/próxima data vêm calculados da API. */
export function useManutencoes() {
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setManutencoes(await api.get<Manutencao[]>('/manutencoes').catch(() => []));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    manutencoes,
    carregando,
    recarregar,
    criar: async (dados: {
      prestadorId: string;
      ativoId?: string;
      titulo: string;
      descricao: string;
      ultimaManutencao: string;
      frequenciaUnidade: string;
      frequenciaIntervalo: number;
      diasAntecedencia: number;
      tipo?: string;
      prioridade?: string;
      statusManual?: string;
      custoPrevisto?: string | number;
      numeroOs?: string;
    }) => {
      await api.post('/manutencoes', dados);
    },
    atualizar: async (id: string, dados: Record<string, any>) => {
      await api.put(`/manutencoes/${id}`, dados);
    },
    concluir: async (id: string, data?: string) => {
      await api.post(`/manutencoes/${id}/concluir`, { data });
    },
    /** Envia o lembrete por e-mail agora. Retorna { para, simulado }. */
    notificar: (id: string) => api.post<{ para: string; simulado: boolean }>(`/manutencoes/${id}/notificar`),
    remover: async (id: string) => {
      await api.delete(`/manutencoes/${id}`);
    }
  };
}
