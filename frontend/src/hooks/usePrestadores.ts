import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { statusManutencao } from '@/lib/recorrencia';
import type { HistoricoManutencao, Manutencao, Prestador } from '@/types/condominio';

function mapPrestador(row: any, contagem: Record<string, number>): Prestador {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    servico: row.servico,
    empresa: row.empresa,
    telefone: row.telefone,
    observacao: row.observacao,
    manutencoes: contagem[row.id] ?? 0,
    criadoEm: row.criado_em
  };
}

export function usePrestadores() {
  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    const [{ data: p, error: e1 }, { data: m, error: e2 }] = await Promise.all([
      supabase.from('prestadores').select('*').order('nome'),
      supabase.from('manutencoes').select('prestador_id')
    ]);
    const contagem: Record<string, number> = {};
    if (!e2 && m) for (const row of m) contagem[row.prestador_id] = (contagem[row.prestador_id] ?? 0) + 1;
    setPrestadores(e1 || !p ? [] : p.map((row) => mapPrestador(row, contagem)));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    prestadores,
    carregando,
    recarregar,
    criar: async (dados: Record<string, string>) => {
      const { error } = await supabase.from('prestadores').insert(dados);
      if (error) throw new Error(error.message);
    },
    atualizar: async (id: string, dados: Record<string, string>) => {
      const { error } = await supabase.from('prestadores').update(dados).eq('id', id);
      if (error) throw new Error(error.message);
    },
    remover: async (id: string) => {
      const { error } = await supabase.from('prestadores').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }
  };
}

const SELECT_MANUT =
  '*, prestadores ( nome, email ), manutencao_historico ( tipo, data, em, detalhe )';

function mapManutencao(row: any): Manutencao {
  const { proxima, dias, status } = statusManutencao(
    row.ultima_manutencao,
    row.frequencia_unidade,
    row.frequencia_intervalo,
    row.dias_antecedencia
  );
  const historico: HistoricoManutencao[] = (row.manutencao_historico ?? [])
    .map((h: any) => ({ tipo: h.tipo, data: h.data, em: h.em, detalhe: h.detalhe }))
    .sort((a: HistoricoManutencao, b: HistoricoManutencao) => new Date(a.em).getTime() - new Date(b.em).getTime());

  return {
    id: row.id,
    prestadorId: row.prestador_id,
    titulo: row.titulo,
    descricao: row.descricao,
    ultimaManutencao: row.ultima_manutencao,
    frequenciaUnidade: row.frequencia_unidade,
    frequenciaIntervalo: row.frequencia_intervalo,
    diasAntecedencia: row.dias_antecedencia,
    ativo: row.ativo,
    ultimoLembreteCiclo: row.ultimo_lembrete_ciclo,
    historico,
    prestadorNome: row.prestadores?.nome ?? '—',
    prestadorEmail: row.prestadores?.email ?? '',
    proximaManutencao: proxima,
    diasParaProxima: dias,
    status,
    criadoEm: row.criado_em
  };
}

/** Agenda de manutenções recorrentes (mesmo domínio de "Prestadores"). */
export function useManutencoes() {
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase.from('manutencoes').select(SELECT_MANUT);
    const lista = error || !data ? [] : data.map(mapManutencao);
    lista.sort((a, b) => (a.proximaManutencao ?? '').localeCompare(b.proximaManutencao ?? ''));
    setManutencoes(lista);
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    manutencoes,
    carregando,
    recarregar,
    criar: async (dados: {
      prestadorId: string;
      titulo: string;
      descricao: string;
      ultimaManutencao: string;
      frequenciaUnidade: string;
      frequenciaIntervalo: number;
      diasAntecedencia: number;
    }) => {
      const { error } = await supabase.from('manutencoes').insert({
        prestador_id: dados.prestadorId,
        titulo: dados.titulo,
        descricao: dados.descricao,
        ultima_manutencao: dados.ultimaManutencao,
        frequencia_unidade: dados.frequenciaUnidade,
        frequencia_intervalo: dados.frequenciaIntervalo,
        dias_antecedencia: dados.diasAntecedencia
      });
      if (error) throw new Error(error.message);
    },
    atualizar: async (id: string, dados: Record<string, unknown>) => {
      const payload: Record<string, unknown> = {};
      if (dados.prestadorId !== undefined) payload.prestador_id = dados.prestadorId;
      if (dados.titulo !== undefined) payload.titulo = dados.titulo;
      if (dados.descricao !== undefined) payload.descricao = dados.descricao;
      if (dados.ultimaManutencao !== undefined) payload.ultima_manutencao = dados.ultimaManutencao;
      if (dados.frequenciaUnidade !== undefined) payload.frequencia_unidade = dados.frequenciaUnidade;
      if (dados.frequenciaIntervalo !== undefined) payload.frequencia_intervalo = dados.frequenciaIntervalo;
      if (dados.diasAntecedencia !== undefined) payload.dias_antecedencia = dados.diasAntecedencia;
      if (dados.ativo !== undefined) payload.ativo = dados.ativo;
      const { error } = await supabase.from('manutencoes').update(payload).eq('id', id);
      if (error) throw new Error(error.message);
    },
    concluir: async (id: string, data?: string) => {
      const hoje = data || new Date().toISOString().slice(0, 10);
      const { data: sessao } = await supabase.auth.getUser();
      const nome = (sessao.user?.user_metadata as any)?.nome || sessao.user?.email || 'síndico';
      const { error: e1 } = await supabase
        .from('manutencoes')
        .update({ ultima_manutencao: hoje })
        .eq('id', id);
      if (e1) throw new Error(e1.message);
      const { error: e2 } = await supabase
        .from('manutencao_historico')
        .insert({ manutencao_id: id, tipo: 'realizada', data: hoje, detalhe: `Registrada por ${nome}` });
      if (e2) throw new Error(e2.message);
    },
    // Envio automático de e-mail depende de uma Edge Function agendada que
    // ainda não foi implantada (ver docs/SUPABASE_MIGRATION.md, módulo 5).
    notificar: async (_id: string): Promise<never> => {
      throw new Error(
        'Envio de e-mail ainda não está configurado (falta implantar a Edge Function de lembretes).'
      );
    },
    remover: async (id: string) => {
      const { error } = await supabase.from('manutencoes').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }
  };
}

/** Sem backend de e-mail ativo por enquanto — ver useManutencoes().notificar. */
export function usePrestadoresConfig() {
  return { emailSimulado: true };
}
