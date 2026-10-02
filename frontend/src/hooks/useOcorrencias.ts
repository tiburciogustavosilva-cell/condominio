import { useCallback, useEffect, useState } from 'react';
import { api, baixarComoUrl } from '@/lib/api';
import type { Ocorrencia } from '@/types/condominio';

/** Livro de Ocorrência: reclamações/ocorridos abertos pelos condôminos. */
export function useOcorrencias() {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[] | null>(null);

  const recarregar = useCallback(async () => {
    setOcorrencias(await api.get<Ocorrencia[]>('/ocorrencias').catch(() => []));
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    ocorrencias,
    carregando: ocorrencias === null,
    recarregar,
    criar: async (dados: { titulo: string; descricao: string; categoria: string; foto?: string }) => {
      await api.post('/ocorrencias', dados);
    },
    atualizarStatus: async (id: string, status: string, descricao: string) => {
      await api.patch(`/ocorrencias/${id}/status`, { status, descricao });
    },
    fotoUrl: (id: string) => baixarComoUrl(`/ocorrencias/${id}/foto`)
  };
}
