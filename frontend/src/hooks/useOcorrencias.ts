import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Ocorrencia } from '@/types/condominio';

const SELECT =
  'id, titulo, descricao, categoria, status, usuario_id, unidade_id, criado_em, atualizado_em, ' +
  'profiles ( nome ), unidades ( bloco, numero )';

function mapOcorrencia(row: any): Ocorrencia {
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao,
    categoria: row.categoria,
    status: row.status,
    usuarioId: row.usuario_id,
    unidadeId: row.unidade_id,
    autorNome: row.profiles?.nome ?? '—',
    unidadeLabel: row.unidades ? `${row.unidades.bloco} - ${row.unidades.numero}` : undefined,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em
  };
}

/** Livro de Ocorrência: reclamações/ocorridos abertos pelos condôminos. */
export function useOcorrencias() {
  const { usuario } = useAuth();
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[] | null>(null);

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('ocorrencias')
      .select(SELECT)
      .order('criado_em', { ascending: false });
    setOcorrencias(error || !data ? [] : data.map(mapOcorrencia));
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    ocorrencias,
    carregando: ocorrencias === null,
    recarregar,
    criar: async (dados: { titulo: string; descricao: string; categoria: string }) => {
      if (!usuario) throw new Error('Sessão inválida');
      const { error } = await supabase.from('ocorrencias').insert({
        titulo: dados.titulo,
        descricao: dados.descricao,
        categoria: dados.categoria,
        usuario_id: usuario.id,
        unidade_id: usuario.unidadeId
      });
      if (error) throw new Error(error.message);
    },
    atualizarStatus: async (id: string, status: string) => {
      const { error } = await supabase
        .from('ocorrencias')
        .update({ status, atualizado_em: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(error.message);
    }
  };
}
