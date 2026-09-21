import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { statusManutencao } from '@/lib/recorrencia';
import type { Aviso, DashboardResumo } from '@/types/condominio';

function mapAviso(row: any): Aviso {
  return {
    id: row.id,
    titulo: row.titulo,
    mensagem: row.mensagem,
    fixado: row.fixado,
    autorId: row.autor_id,
    criadoEm: row.criado_em
  };
}

export function useDashboard() {
  const { isSindico } = useAuth();
  const [dados, setDados] = useState<DashboardResumo | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const { data: resumo, error } = await supabase.rpc('dashboard_resumo');
      if (error || !resumo) return;

      let manutencoes: DashboardResumo['manutencoes'] = null;
      if (isSindico) {
        const { data: m } = await supabase
          .from('manutencoes')
          .select('ultima_manutencao, frequencia_unidade, frequencia_intervalo, dias_antecedencia, ativo');
        if (m) {
          let vencidas = 0;
          let proximas = 0;
          for (const row of m) {
            if (!row.ativo) continue;
            const { status } = statusManutencao(
              row.ultima_manutencao,
              row.frequencia_unidade,
              row.frequencia_intervalo,
              row.dias_antecedencia
            );
            if (status === 'vencida') vencidas++;
            else if (status === 'proxima') proximas++;
          }
          manutencoes = { vencidas, proximas };
        }
      }

      if (!ativo) return;
      setDados({
        chamados: resumo.chamados,
        reservas: resumo.reservas,
        encomendas: resumo.encomendas,
        totais: resumo.totais,
        manutencoes,
        avisos: (resumo.avisos ?? []).map(mapAviso)
      });
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [isSindico]);

  return { dados, carregando: dados === null };
}
