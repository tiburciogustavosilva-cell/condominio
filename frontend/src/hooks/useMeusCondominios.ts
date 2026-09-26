import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Condominio } from '@/types/condominio';

/** Condomínios geridos pela administradora logada (ver /meus-condominios). */
export function useMeusCondominios() {
  const [condominios, setCondominios] = useState<Condominio[] | null>(null);

  const recarregar = useCallback(async () => {
    setCondominios(await api.get<Condominio[]>('/condominios').catch(() => []));
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    condominios,
    carregando: condominios === null,
    recarregar,
    /** Cria um condomínio novo sob a administradora e já o torna o ativo. Retorna o id novo. */
    criar: async (dados: { nome: string; endereco: string; cnpj: string }): Promise<string> => {
      const { id } = await api.post<{ id: string }>('/condominios', dados);
      return id;
    },
    /** Troca qual condomínio fica ativo pra administradora. */
    entrar: async (id: string) => {
      await api.post(`/condominios/${id}/ativar`);
    }
  };
}
