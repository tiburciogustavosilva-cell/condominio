import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { RelatoriosResumo } from '@/types/condominio';

/** `query` = periodoQuery(...); null não busca e mantém o último resultado (Painel de não-síndico, datas incompletas). */
export function useRelatorios(query: string | null) {
  const [dados, setDados] = useState<RelatoriosResumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (query === null) return;
    let ativo = true;
    setDados(null);
    setErro(null);
    api
      .get<RelatoriosResumo>(`/relatorios?${query}`)
      .then((resumo) => ativo && setDados(resumo))
      .catch((e: Error) => ativo && setErro(e.message));
    return () => {
      ativo = false;
    };
  }, [query]);

  return { dados, erro, carregando: dados === null && !erro };
}
