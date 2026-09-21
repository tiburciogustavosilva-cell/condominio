import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Encomenda } from '@/types/condominio';

const SELECT =
  'id, unidade_id, descricao, remetente, status, recebido_por, criado_em, entregue_em, unidades ( bloco, numero )';

function mapEncomenda(row: any): Encomenda {
  return {
    id: row.id,
    unidadeId: row.unidade_id,
    descricao: row.descricao,
    remetente: row.remetente,
    status: row.status,
    recebidoPor: row.recebido_por,
    unidadeLabel: row.unidades ? `${row.unidades.bloco} - ${row.unidades.numero}` : '-',
    criadoEm: row.criado_em,
    entregueEm: row.entregue_em
  };
}

export function useEncomendas() {
  const { usuario } = useAuth();
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase.from('encomendas').select(SELECT).order('criado_em', { ascending: false });
    setEncomendas(error || !data ? [] : data.map(mapEncomenda));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    encomendas,
    carregando,
    recarregar,
    criar: async (dados: { unidadeId: string; descricao: string; remetente: string }) => {
      const { error } = await supabase.from('encomendas').insert({
        unidade_id: dados.unidadeId,
        descricao: dados.descricao,
        remetente: dados.remetente
      });
      if (error) throw new Error(error.message);
    },
    entregar: async (id: string) => {
      const nome = usuario?.nome ?? 'morador';
      const { error } = await supabase
        .from('encomendas')
        .update({ status: 'entregue', entregue_em: new Date().toISOString(), recebido_por: nome })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    remover: async (id: string) => {
      const { error } = await supabase.from('encomendas').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }
  };
}
