import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Aviso } from '@/types/condominio';

export function useAvisos() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setAvisos(await api.get<Aviso[]>('/avisos').catch(() => []));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    avisos,
    carregando,
    recarregar,
    criar: async (dados: { titulo: string; mensagem: string; fixado: boolean }) => {
      await api.post('/avisos', dados);
    },
    atualizar: async (id: string, dados: { fixado?: boolean; titulo?: string; mensagem?: string }) => {
      await api.put(`/avisos/${id}`, dados);
    },
    remover: async (id: string) => {
      await api.delete(`/avisos/${id}`);
    }
  };
}
