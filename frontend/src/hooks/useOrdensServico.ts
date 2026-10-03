import { useCallback, useEffect, useState } from 'react';
import { api, baixarComoUrl } from '@/lib/api';
import type { OrdemServico, OrdemServicoAnexo, TipoAnexoOs } from '@/types/condominio';

/** Registro de serviços / ordens de serviço (módulo Manutenção Predial). */
export function useOrdensServico() {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setOrdens(await api.get<OrdemServico[]>('/ordens-servico').catch(() => []));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    ordens,
    carregando,
    recarregar,
    criar: async (dados: Record<string, any>) => {
      await api.post('/ordens-servico', dados);
    },
    atualizar: async (id: string, dados: Record<string, any>) => {
      await api.put(`/ordens-servico/${id}`, dados);
    },
    remover: async (id: string) => {
      await api.delete(`/ordens-servico/${id}`);
    },
    /** Notas fiscais / orçamentos anexados a uma ordem de serviço. */
    listarAnexos: (id: string) => api.get<OrdemServicoAnexo[]>(`/ordens-servico/${id}/anexos`),
    adicionarAnexo: async (id: string, dados: { tipo: TipoAnexoOs; nome: string; arquivo: string }) => {
      await api.post(`/ordens-servico/${id}/anexos`, dados);
    },
    removerAnexo: async (id: string, anexoId: string) => {
      await api.delete(`/ordens-servico/${id}/anexos/${anexoId}`);
    },
    anexoUrl: (id: string, anexoId: string) => baixarComoUrl(`/ordens-servico/${id}/anexos/${anexoId}`)
  };
}
