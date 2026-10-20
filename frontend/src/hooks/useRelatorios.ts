import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { RelatoriosResumo } from '@/types/condominio';

/** `meses = null` não busca (ex.: Painel de quem não é síndico). */
export function useRelatorios(meses: number | null) {
  const [dados, setDados] = useState<RelatoriosResumo | null>(null);

  useEffect(() => {
    if (meses === null) return;
    let ativo = true;
    setDados(null);
    api
      .get<RelatoriosResumo>(`/relatorios?meses=${meses}`)
      .then((resumo) => ativo && setDados(resumo))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [meses]);

  return { dados, carregando: dados === null };
}
