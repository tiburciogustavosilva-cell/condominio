import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { OrdemServico } from '@/types/condominio';

const SELECT = '*, ativos ( nome )';

function mapOrdem(row: any): OrdemServico {
  return {
    id: row.id,
    numeroOs: row.numero_os,
    dataAbertura: row.data_abertura,
    dataExecucao: row.data_execucao,
    ativoId: row.ativo_id,
    ativoNome: row.ativos?.nome ?? '—',
    tipo: row.tipo,
    descricao: row.descricao,
    diagnostico: row.diagnostico,
    acaoExecutada: row.acao_executada,
    responsavel: row.responsavel,
    prioridade: row.prioridade,
    status: row.status,
    custoMaterial: Number(row.custo_material),
    custoMaoDeObra: Number(row.custo_mao_obra),
    custoTotal: Number(row.custo_total),
    observacoes: row.observacoes,
    criadoEm: row.criado_em
  };
}

/** Registro de serviços / ordens de serviço (módulo Manutenção Predial). */
export function useOrdensServico() {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase.from('ordens_servico').select(SELECT).order('data_abertura', { ascending: false });
    setOrdens(error || !data ? [] : data.map(mapOrdem));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    ordens,
    carregando,
    recarregar,
    criar: async (dados: Record<string, any>) => {
      const { error } = await supabase.from('ordens_servico').insert({
        numero_os: dados.numeroOs || null,
        data_abertura: dados.dataAbertura,
        data_execucao: dados.dataExecucao || null,
        ativo_id: dados.ativoId || null,
        tipo: dados.tipo,
        descricao: dados.descricao,
        diagnostico: dados.diagnostico,
        acao_executada: dados.acaoExecutada,
        responsavel: dados.responsavel,
        prioridade: dados.prioridade,
        status: dados.status,
        custo_material: Number(dados.custoMaterial) || 0,
        custo_mao_obra: Number(dados.custoMaoDeObra) || 0,
        observacoes: dados.observacoes
      });
      if (error) throw new Error(error.message);
    },
    atualizar: async (id: string, dados: Record<string, any>) => {
      const payload: Record<string, unknown> = {};
      if (dados.numeroOs !== undefined) payload.numero_os = dados.numeroOs || null;
      if (dados.dataAbertura !== undefined) payload.data_abertura = dados.dataAbertura;
      if (dados.dataExecucao !== undefined) payload.data_execucao = dados.dataExecucao || null;
      if (dados.ativoId !== undefined) payload.ativo_id = dados.ativoId || null;
      if (dados.tipo !== undefined) payload.tipo = dados.tipo;
      if (dados.descricao !== undefined) payload.descricao = dados.descricao;
      if (dados.diagnostico !== undefined) payload.diagnostico = dados.diagnostico;
      if (dados.acaoExecutada !== undefined) payload.acao_executada = dados.acaoExecutada;
      if (dados.responsavel !== undefined) payload.responsavel = dados.responsavel;
      if (dados.prioridade !== undefined) payload.prioridade = dados.prioridade;
      if (dados.status !== undefined) payload.status = dados.status;
      if (dados.custoMaterial !== undefined) payload.custo_material = Number(dados.custoMaterial) || 0;
      if (dados.custoMaoDeObra !== undefined) payload.custo_mao_obra = Number(dados.custoMaoDeObra) || 0;
      if (dados.observacoes !== undefined) payload.observacoes = dados.observacoes;
      const { error } = await supabase.from('ordens_servico').update(payload).eq('id', id);
      if (error) throw new Error(error.message);
    },
    remover: async (id: string) => {
      const { error } = await supabase.from('ordens_servico').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }
  };
}
