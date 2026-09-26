import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Morador } from '@/types/condominio';

/** Moradores (profiles) do condomínio ativo. */
export function useMoradores() {
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setMoradores(await api.get<Morador[]>('/moradores').catch(() => []));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    moradores,
    carregando,
    recarregar,
    criar: async (dados: { nome: string; email: string; senha: string; telefone: string; papel: string; unidadeId: string }) => {
      await api.post('/moradores', dados);
    },
    atualizar: async (
      id: string,
      dados: { nome?: string; telefone?: string; papel?: string; unidadeId?: string | null }
    ) => {
      await api.put(`/moradores/${id}`, dados);
    },
    remover: async (id: string) => {
      await api.delete(`/moradores/${id}`);
    }
  };
}
