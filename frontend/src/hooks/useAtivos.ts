import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Ativo } from '@/types/condominio';

/** Cadastro de equipamentos/áreas (módulo Manutenção Predial). */
export function useAtivos() {
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setAtivos(await api.get<Ativo[]>('/ativos').catch(() => []));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    ativos,
    carregando,
    recarregar,
    criar: async (dados: {
      codigo: string;
      nome: string;
      categoria: string;
      localizacao: string;
      fabricanteModelo: string;
      numeroSerie: string;
      dataInstalacao: string;
      vidaUtilAnos: string | number;
      responsavel: string;
      observacoes: string;
    }) => {
      await api.post('/ativos', dados);
    },
    atualizar: async (id: string, dados: Record<string, any>) => {
      await api.put(`/ativos/${id}`, dados);
    },
    remover: async (id: string) => {
      await api.delete(`/ativos/${id}`);
    }
  };
}
