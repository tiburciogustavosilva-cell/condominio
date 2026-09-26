import { useCallback, useEffect, useState } from 'react';
import { api, baixarComoUrl } from '@/lib/api';
import type { Encomenda } from '@/types/condominio';

export type NovaEncomenda = {
  unidadeId: string;
  descricao: string;
  remetente: string;
  codigoRastreio: string;
  entregadorNome: string;
  entregadorCpf: string;
  /** data URL .webp (ver lib/imagem.ts) */
  foto: string;
  volumeGrande: boolean;
  perecivel: boolean;
};

export function useEncomendas() {
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setEncomendas(await api.get<Encomenda[]>('/encomendas').catch(() => []));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    encomendas,
    carregando,
    recarregar,
    criar: async (dados: NovaEncomenda) => {
      await api.post('/encomendas', dados);
    },
    /** Portaria libera informando o código de 5 dígitos e quem o informou. */
    retirar: async (id: string, dados: { codigo: string; retiradoPor: string }) => {
      await api.patch(`/encomendas/${id}/retirar`, dados);
    },
    /** Síndico libera nova tentativa numa encomenda travada por códigos errados. */
    desbloquear: async (id: string) => {
      await api.patch(`/encomendas/${id}/desbloquear`);
    },
    fotoUrl: (id: string) => baixarComoUrl(`/encomendas/${id}/foto`),
    remover: async (id: string) => {
      await api.delete(`/encomendas/${id}`);
    }
  };
}
