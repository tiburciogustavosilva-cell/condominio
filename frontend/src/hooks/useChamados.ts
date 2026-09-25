import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Chamado, Comentario } from '@/types/condominio';

const SELECT = 'id, titulo, descricao, categoria, status, prioridade, usuario_id, unidade_id, criado_em, atualizado_em, profiles ( nome )';

function mapChamado(row: any): Chamado {
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao,
    categoria: row.categoria,
    status: row.status,
    prioridade: row.prioridade,
    usuarioId: row.usuario_id,
    unidadeId: row.unidade_id,
    autorNome: row.profiles?.nome ?? '—',
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em
  };
}

function mapComentario(row: any): Comentario {
  return {
    id: row.id,
    autorId: row.autor_id,
    autorNome: row.profiles?.nome ?? '—',
    texto: row.texto,
    criadoEm: row.criado_em
  };
}

/** Lista de chamados (com filtro opcional de status) + criação. */
export function useChamados(status?: string) {
  const { usuario } = useAuth();
  const [chamados, setChamados] = useState<Chamado[] | null>(null);

  const recarregar = useCallback(async () => {
    let query = supabase.from('chamados').select(SELECT).order('criado_em', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    setChamados(error || !data ? [] : data.map(mapChamado));
  }, [status]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    chamados,
    carregando: chamados === null,
    recarregar,
    criar: async (dados: { titulo: string; descricao: string; categoria: string; prioridade: string }) => {
      if (!usuario) throw new Error('Sessão inválida');
      const { error } = await supabase.from('chamados').insert({
        titulo: dados.titulo,
        descricao: dados.descricao,
        categoria: dados.categoria,
        prioridade: dados.prioridade,
        usuario_id: usuario.id,
        unidade_id: usuario.unidadeId
      });
      if (error) throw new Error(error.message);
    },
    /** Muda o status de um chamado da lista (ex.: arrastar entre colunas do kanban). */
    atualizarStatus: async (id: string, status: string) => {
      const anterior = chamados;
      setChamados((atual) => atual?.map((c) => (c.id === id ? { ...c, status: status as Chamado['status'] } : c)) ?? atual);
      const { error } = await supabase
        .from('chamados')
        .update({ status, atualizado_em: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        setChamados(anterior);
        throw new Error(error.message);
      }
    }
  };
}

/** Um chamado específico (detalhe) + comentários + mudança de status. */
export function useChamado(id?: string) {
  const { usuario } = useAuth();
  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [erro, setErro] = useState(false);

  const recarregar = useCallback(async () => {
    if (!id) return;
    const [{ data: c, error: e1 }, { data: coms, error: e2 }] = await Promise.all([
      supabase.from('chamados').select(SELECT).eq('id', id).maybeSingle(),
      supabase
        .from('chamado_comentarios')
        .select('id, autor_id, texto, criado_em, profiles ( nome )')
        .eq('chamado_id', id)
        .order('criado_em', { ascending: true })
    ]);
    if (e1 || !c) {
      setErro(true);
      return;
    }
    setChamado({ ...mapChamado(c), comentarios: e2 || !coms ? [] : coms.map(mapComentario) });
  }, [id]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    chamado,
    erro,
    recarregar,
    atualizarStatus: async (status: string) => {
      const { error } = await supabase
        .from('chamados')
        .update({ status, atualizado_em: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(error.message);
      await recarregar();
    },
    comentar: async (texto: string) => {
      if (!usuario) throw new Error('Sessão inválida');
      const { error } = await supabase
        .from('chamado_comentarios')
        .insert({ chamado_id: id, autor_id: usuario.id, texto });
      if (error) throw new Error(error.message);
      await recarregar();
    }
  };
}
