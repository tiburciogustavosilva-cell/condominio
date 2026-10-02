import { useCallback, useEffect, useState } from 'react';
import { api, baixarComoUrl } from '@/lib/api';
import type { Encomenda, EncomendaAutorizado } from '@/types/condominio';

export type NovaEncomenda = {
  unidadeId: string;
  observacao: string;
  remetente: string;
  codigoRastreio: string;
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
    /** Alternativa: portaria libera informando o código de 5 dígitos e quem o informou. */
    retirar: async (id: string, dados: { codigo: string; retiradoPor: string }) => {
      await api.patch(`/encomendas/${id}/retirar`, dados);
    },
    /** Principal: portaria gera um QR de uso único (vale 3 min) pro morador escanear. */
    gerarQrRetirada: async (id: string) => {
      return api.post<{ token: string; expiraEmSegundos: number }>(`/encomendas/${id}/qr-retirada`);
    },
    /** O próprio morador confirma a retirada lendo o QR mostrado pela portaria. */
    retirarComQr: async (token: string) => {
      await api.post('/encomendas/retirar-qr', { token });
    },
    /** Síndico libera nova tentativa numa encomenda travada por códigos errados. */
    desbloquear: async (id: string) => {
      await api.patch(`/encomendas/${id}/desbloquear`);
    },
    fotoUrl: (id: string) => baixarComoUrl(`/encomendas/${id}/foto`),
    remover: async (id: string) => {
      await api.delete(`/encomendas/${id}`);
    },
    /** Morador autoriza mais alguém (empregada, parente...) a retirar essa encomenda. */
    autorizarTerceiro: async (id: string, nome: string) => {
      await api.post<EncomendaAutorizado>(`/encomendas/${id}/autorizados`, { nome });
    },
    removerAutorizado: async (id: string, autorizadoId: string) => {
      await api.delete(`/encomendas/${id}/autorizados/${autorizadoId}`);
    }
  };
}
