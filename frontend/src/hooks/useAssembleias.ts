import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Assembleia, AssembleiaResumo, StatusPauta } from '@/types/condominio';

export type NovaPauta = { titulo: string; descricao: string; opcoes: string[]; vinculosPermitidos: string[] };

export const criarAssembleia = (dados: { titulo: string; pautas: NovaPauta[] }) =>
  api.post<{ id: string }>('/assembleias', dados);

/** Lista de assembleias do condomínio (abertas primeiro). */
export function useAssembleias() {
  const [assembleias, setAssembleias] = useState<AssembleiaResumo[] | null>(null);

  const recarregar = useCallback(async () => {
    setAssembleias(await api.get<AssembleiaResumo[]>('/assembleias').catch(() => []));
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { assembleias: assembleias ?? [], carregando: assembleias === null, recarregar };
}

const INTERVALO_MS = 2000;

/**
 * Estado ao vivo de uma assembleia: recarrega a cada 2 s enquanto a aba está visível e ela está aberta.
 * ponytail: polling; trocar por SSE se muitas assembleias simultâneas pesarem no banco.
 */
export function useAssembleia(id: string | undefined) {
  const [assembleia, setAssembleia] = useState<Assembleia | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    if (!id) return;
    try {
      setAssembleia(await api.get<Assembleia>(`/assembleias/${id}`));
      setErro(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar');
    }
  }, [id]);

  const aberta = assembleia?.status !== 'encerrada';
  useEffect(() => {
    recarregar();
    if (!aberta) return;
    const timer = setInterval(() => !document.hidden && recarregar(), INTERVALO_MS);
    return () => clearInterval(timer);
  }, [recarregar, aberta]);

  // cada ação recarrega na hora, sem esperar o próximo ciclo
  const depois = <T>(p: Promise<T>) => p.then(recarregar);
  return {
    assembleia,
    erro,
    carregando: !assembleia && !erro,
    /** Pelo número digitado (`codigo`) ou pelo QR do telão (`qr`). */
    checkin: (dados: { codigo: string } | { qr: string }) => depois(api.post(`/assembleias/${id}/checkin`, dados)),
    /** `unidadeId` só no voto pela mesa (síndico, para quem não tem celular). */
    votar: (pautaId: string, opcaoId: string, unidadeId?: string) =>
      depois(api.post(`/assembleias/pautas/${pautaId}/votar`, { opcaoId, unidadeId })),
    mudarStatusPauta: (pautaId: string, status: StatusPauta) =>
      depois(api.patch(`/assembleias/pautas/${pautaId}`, { status })),
    marcarPresenca: (unidadeId: string) => depois(api.post(`/assembleias/${id}/presencas`, { unidadeId })),
    adicionarPauta: (pauta: NovaPauta) => depois(api.post(`/assembleias/${id}/pautas`, pauta)),
    /** Só antes de abrir a votação. */
    editarPauta: (pautaId: string, pauta: NovaPauta) => depois(api.put(`/assembleias/pautas/${pautaId}`, pauta)),
    removerPauta: (pautaId: string) => depois(api.delete(`/assembleias/pautas/${pautaId}`)),
    /** Só de unidade que ainda não votou. */
    removerPresenca: (unidadeId: string) => depois(api.delete(`/assembleias/${id}/presencas/${unidadeId}`)),
    /** Registro (ata) de quem concedeu procuração a quem — não afeta check-in nem voto. */
    adicionarProcuracao: (unidadeOutorganteId: string, unidadeProcuradoraId: string) =>
      depois(api.post(`/assembleias/${id}/procuracoes`, { unidadeOutorganteId, unidadeProcuradoraId })),
    removerProcuracao: (procuracaoId: string) => depois(api.delete(`/assembleias/${id}/procuracoes/${procuracaoId}`)),
    /** Só sem votos. Não recarrega: a assembleia deixa de existir (quem chama navega para a lista). */
    excluir: () => api.delete(`/assembleias/${id}`),
    encerrar: () => depois(api.post(`/assembleias/${id}/encerrar`))
  };
}
