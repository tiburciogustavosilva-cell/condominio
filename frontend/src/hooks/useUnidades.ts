import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Unidade } from '@/types/condominio';

function mapUnidade(row: any): Unidade {
  return {
    id: row.id,
    numero: row.numero,
    bloco: row.bloco,
    tipo: row.tipo,
    fracaoIdeal: Number(row.fracao_ideal),
    moradores: (row.profiles ?? []).map((p: any) => p.nome)
  };
}

export function useUnidades() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('unidades')
      .select('id, numero, bloco, tipo, fracao_ideal, profiles ( nome )')
      .order('bloco')
      .order('numero');
    setUnidades(error || !data ? [] : data.map(mapUnidade));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    unidades,
    carregando,
    recarregar,
    criar: async (dados: { numero: string; bloco: string; tipo: string; fracaoIdeal: string | number }) => {
      const { error } = await supabase.from('unidades').insert({
        numero: dados.numero,
        bloco: dados.bloco || '-',
        tipo: dados.tipo || 'apartamento',
        fracao_ideal: Number(dados.fracaoIdeal) || 0
      });
      if (error) throw new Error(error.message);
    },
    atualizar: async (id: string, dados: { numero: string; bloco: string; tipo: string; fracaoIdeal: string | number }) => {
      const { error } = await supabase
        .from('unidades')
        .update({
          numero: dados.numero,
          bloco: dados.bloco || '-',
          tipo: dados.tipo || 'apartamento',
          fracao_ideal: Number(dados.fracaoIdeal) || 0
        })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    remover: async (id: string) => {
      const { error } = await supabase.from('unidades').delete().eq('id', id);
      if (error) {
        if (error.code === '23503') throw new Error('Há moradores ou registros vinculados a esta unidade');
        throw new Error(error.message);
      }
    }
  };
}
