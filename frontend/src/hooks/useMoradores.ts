import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Morador } from '@/types/condominio';

function mapMorador(row: any): Morador {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    telefone: row.telefone,
    papel: row.papel,
    unidadeId: row.unidade_id
  };
}

/**
 * Moradores (tabela profiles). Criar um morador NOVO (com login e senha)
 * exige a service_role key do Supabase — nunca deve rodar no navegador — e
 * por isso ainda não está disponível aqui. Editar (nome/telefone/papel/
 * unidade) e remover já funcionam via RPC/RLS, sem precisar dela.
 * Ver docs/SUPABASE_MIGRATION.md.
 */
export function useMoradores() {
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, email, telefone, papel, unidade_id')
      .order('nome');
    setMoradores(error || !data ? [] : data.map(mapMorador));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    moradores,
    carregando,
    recarregar,
    criarDisponivel: false as const,
    atualizar: async (
      id: string,
      dados: { nome?: string; telefone?: string; papel?: string; unidadeId?: string | null }
    ) => {
      const { error } = await supabase.rpc('admin_atualizar_morador', {
        p_id: id,
        p_nome: dados.nome ?? null,
        p_telefone: dados.telefone ?? null,
        p_papel: dados.papel ?? null,
        p_unidade_id: dados.unidadeId || null,
        p_limpar_unidade: dados.unidadeId === null
      });
      if (error) throw new Error(error.message);
    },
    remover: async (id: string) => {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }
  };
}
