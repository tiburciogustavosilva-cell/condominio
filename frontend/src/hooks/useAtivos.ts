import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Ativo } from '@/types/condominio';

function mapAtivo(row: any): Ativo {
  return {
    id: row.id,
    codigo: row.codigo,
    nome: row.nome,
    categoria: row.categoria,
    localizacao: row.localizacao,
    fabricanteModelo: row.fabricante_modelo,
    numeroSerie: row.numero_serie,
    dataInstalacao: row.data_instalacao,
    vidaUtilAnos: row.vida_util_anos,
    responsavel: row.responsavel,
    observacoes: row.observacoes,
    criadoEm: row.criado_em
  };
}

/** Cadastro de equipamentos/áreas (módulo Manutenção Predial). */
export function useAtivos() {
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase.from('ativos').select('*').order('codigo');
    setAtivos(error || !data ? [] : data.map(mapAtivo));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    ativos,
    carregando,
    recarregar,
    criar: async (dados: {
      codigo: string;
      nome: string;
      categoria: string;
      localizacao: string;
      fabricanteModelo: string;
      numeroSerie: string;
      dataInstalacao: string;
      vidaUtilAnos: string | number;
      responsavel: string;
      observacoes: string;
    }) => {
      const { error } = await supabase.from('ativos').insert({
        codigo: dados.codigo,
        nome: dados.nome,
        categoria: dados.categoria,
        localizacao: dados.localizacao,
        fabricante_modelo: dados.fabricanteModelo,
        numero_serie: dados.numeroSerie,
        data_instalacao: dados.dataInstalacao || null,
        vida_util_anos: dados.vidaUtilAnos ? Number(dados.vidaUtilAnos) : null,
        responsavel: dados.responsavel,
        observacoes: dados.observacoes
      });
      if (error) throw new Error(error.message);
    },
    atualizar: async (id: string, dados: Record<string, any>) => {
      const payload: Record<string, unknown> = {};
      if (dados.codigo !== undefined) payload.codigo = dados.codigo;
      if (dados.nome !== undefined) payload.nome = dados.nome;
      if (dados.categoria !== undefined) payload.categoria = dados.categoria;
      if (dados.localizacao !== undefined) payload.localizacao = dados.localizacao;
      if (dados.fabricanteModelo !== undefined) payload.fabricante_modelo = dados.fabricanteModelo;
      if (dados.numeroSerie !== undefined) payload.numero_serie = dados.numeroSerie;
      if (dados.dataInstalacao !== undefined) payload.data_instalacao = dados.dataInstalacao || null;
      if (dados.vidaUtilAnos !== undefined) payload.vida_util_anos = dados.vidaUtilAnos ? Number(dados.vidaUtilAnos) : null;
      if (dados.responsavel !== undefined) payload.responsavel = dados.responsavel;
      if (dados.observacoes !== undefined) payload.observacoes = dados.observacoes;
      const { error } = await supabase.from('ativos').update(payload).eq('id', id);
      if (error) throw new Error(error.message);
    },
    remover: async (id: string) => {
      const { error } = await supabase.from('ativos').delete().eq('id', id);
      if (error) {
        if (error.code === '23503') throw new Error('Há manutenções ou ordens de serviço vinculadas a este ativo');
        throw new Error(error.message);
      }
    }
  };
}
