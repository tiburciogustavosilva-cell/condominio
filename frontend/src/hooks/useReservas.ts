import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Area, Reserva } from '@/types/condominio';

const SELECT =
  'id, area_id, usuario_id, unidade_id, data, periodo, status, observacao, criado_em, atualizado_em, ' +
  'areas ( nome, taxa ), profiles ( nome ), unidades ( bloco, numero )';

function mapReserva(row: any): Reserva {
  return {
    id: row.id,
    areaId: row.area_id,
    usuarioId: row.usuario_id,
    unidadeId: row.unidade_id,
    data: row.data,
    periodo: row.periodo,
    status: row.status,
    observacao: row.observacao,
    areaNome: row.areas?.nome ?? '—',
    taxa: row.areas?.taxa ?? 0,
    solicitante: row.profiles?.nome ?? '—',
    unidadeLabel: row.unidades ? `${row.unidades.bloco} - ${row.unidades.numero}` : '-',
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em
  };
}

export function useReservas() {
  const { usuario } = useAuth();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    const [{ data: r, error: e1 }, { data: a, error: e2 }] = await Promise.all([
      supabase.from('reservas').select(SELECT).order('data', { ascending: false }),
      supabase.from('areas').select('id, nome, descricao, capacidade, taxa, horario').order('nome')
    ]);
    setReservas(e1 || !r ? [] : r.map(mapReserva));
    setAreas(
      e2 || !a
        ? []
        : a.map((x) => ({
            id: x.id,
            nome: x.nome,
            descricao: x.descricao,
            capacidade: x.capacidade,
            taxa: x.taxa,
            horario: x.horario
          }))
    );
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    reservas,
    areas,
    carregando,
    recarregar,
    criar: async (dados: { areaId: string; data: string; periodo: string; observacao: string }) => {
      if (!usuario) throw new Error('Sessão inválida');
      const { error } = await supabase.from('reservas').insert({
        area_id: dados.areaId,
        data: dados.data,
        periodo: dados.periodo,
        observacao: dados.observacao,
        usuario_id: usuario.id,
        unidade_id: usuario.unidadeId
      });
      if (error) throw new Error(error.message);
    },
    atualizarStatus: async (id: string, status: string) => {
      const { error } = await supabase
        .from('reservas')
        .update({ status, atualizado_em: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    cancelar: async (id: string) => {
      const { error } = await supabase
        .from('reservas')
        .update({ status: 'cancelada', atualizado_em: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(error.message);
    }
  };
}
