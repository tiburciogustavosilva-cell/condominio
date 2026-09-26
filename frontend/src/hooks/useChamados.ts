import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Chamado } from '@/types/condominio';

/** Lista de chamados (com filtro opcional de status) + criação. */
export function useChamados(status?: string) {
  const [chamados, setChamados] = useState<Chamado[] | null>(null);

  const recarregar = useCallback(async () => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    setChamados(await api.get<Chamado[]>(`/chamados${query}`).catch(() => []));
  }, [status]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    chamados,
    carregando: chamados === null,
    recarregar,
    criar: async (dados: { titulo: string; descricao: string; categoria: string; prioridade: string }) => {
      await api.post('/chamados', dados);
    },
    /** Muda o status de um chamado da lista (ex.: arrastar entre colunas do kanban). */
    atualizarStatus: async (id: string, status: string) => {
      const anterior = chamados;
      setChamados((atual) => atual?.map((c) => (c.id === id ? { ...c, status: status as Chamado['status'] } : c)) ?? atual);
      try {
        await api.patch(`/chamados/${id}/status`, { status });
      } catch (err) {
        setChamados(anterior);
        throw err;
      }
    }
  };
}

/** Um chamado específico (detalhe) + comentários + mudança de status. */
export function useChamado(id?: string) {
  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [erro, setErro] = useState(false);

  const recarregar = useCallback(async () => {
    if (!id) return;
    try {
      setChamado(await api.get<Chamado>(`/chamados/${id}`));
    } catch {
      setErro(true);
    }
  }, [id]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    chamado,
    erro,
    recarregar,
    atualizarStatus: async (status: string) => {
      await api.patch(`/chamados/${id}/status`, { status });
      await recarregar();
    },
    comentar: async (texto: string) => {
      await api.post(`/chamados/${id}/comentarios`, { texto });
      await recarregar();
    }
  };
}
