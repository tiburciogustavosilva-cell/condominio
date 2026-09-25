import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Condominio } from '@/types/condominio';

const SELECT =
  'id, nome, endereco, cnpj, tem_blocos, qtd_blocos, tem_comercio, qtd_comercio, tem_areas_reserva, tem_porteiro, onboarding_concluido';

function mapCondominio(row: any): Condominio {
  return {
    id: row.id,
    nome: row.nome,
    endereco: row.endereco,
    cnpj: row.cnpj,
    temBlocos: row.tem_blocos,
    qtdBlocos: row.qtd_blocos,
    temComercio: row.tem_comercio,
    qtdComercio: row.qtd_comercio,
    temAreasReserva: row.tem_areas_reserva,
    temPorteiro: row.tem_porteiro,
    onboardingConcluido: row.onboarding_concluido
  };
}

/** Condomínios geridos pela administradora logada (ver /meus-condominios). */
export function useMeusCondominios() {
  const [condominios, setCondominios] = useState<Condominio[] | null>(null);

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase.from('condominios').select(SELECT).order('nome');
    setCondominios(error || !data ? [] : data.map(mapCondominio));
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    condominios,
    carregando: condominios === null,
    recarregar,
    /** Cria um condomínio novo sob a administradora e já o torna o ativo. Retorna o id novo. */
    criar: async (dados: { nome: string; endereco: string; cnpj: string }): Promise<string> => {
      const { data, error } = await supabase.rpc('administradora_criar_condominio', {
        p_nome: dados.nome,
        p_endereco: dados.endereco,
        p_cnpj: dados.cnpj
      });
      if (error) throw new Error(error.message);
      return data as string;
    },
    /** Troca qual condomínio fica ativo pra administradora. */
    entrar: async (id: string) => {
      const { error } = await supabase.rpc('trocar_condominio_ativo', { p_condominio_id: id });
      if (error) throw new Error(error.message);
    }
  };
}
