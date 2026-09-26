import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Funcionario } from '@/types/condominio';

export type DadosFuncionario = { nome: string; email: string; senha: string; telefone: string; cargo: string };

/** Funcionários do prédio (porteiro, zelador, limpeza…) — todos com login; o cargo define o acesso. */
export function useFuncionarios() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setFuncionarios(await api.get<Funcionario[]>('/funcionarios').catch(() => []));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    funcionarios,
    carregando,
    recarregar,
    criar: async (dados: DadosFuncionario) => {
      await api.post('/funcionarios', dados);
    },
    atualizar: async (id: string, dados: Partial<DadosFuncionario>) => {
      await api.put(`/funcionarios/${id}`, dados);
    },
    remover: async (id: string) => {
      await api.delete(`/funcionarios/${id}`);
    }
  };
}
