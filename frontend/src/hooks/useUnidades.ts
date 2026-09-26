import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Unidade } from '@/types/condominio';

type DadosUnidade = { numero: string; bloco: string; tipo: string; fracaoIdeal: string | number };

export function useUnidades() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setUnidades(await api.get<Unidade[]>('/unidades').catch(() => []));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    unidades,
    carregando,
    recarregar,
    criar: async (dados: DadosUnidade) => {
      await api.post('/unidades', dados);
    },
    atualizar: async (id: string, dados: DadosUnidade) => {
      await api.put(`/unidades/${id}`, dados);
    },
    remover: async (id: string) => {
      await api.delete(`/unidades/${id}`);
    }
  };
}
