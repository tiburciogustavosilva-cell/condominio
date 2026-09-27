import { useCallback, useEffect, useState } from "react";
import { api, baixarComoUrl } from "@/lib/api";
import type { ExecucaoTarefa, Tarefa, TarefaDoDia } from "@/types/condominio";

export type DadosTarefa = Omit<Tarefa, "id" | "execucoes">;

/** Cria (id null) ou atualiza uma tarefa. */
export const salvarTarefa = (id: string | null, dados: DadosTarefa) =>
  id ? api.put(`/tarefas/${id}`, dados) : api.post("/tarefas", dados);

export const fotoTarefaUrl = (fotoId: string) =>
  baixarComoUrl(`/tarefas/fotos/${fotoId}`);

/** Tarefas de hoje (funcionário: do próprio cargo; síndico: todas) + conclusão com fotos. */
export function useTarefasDoDia() {
  const [dados, setDados] = useState<{
    data: string;
    tarefas: TarefaDoDia[];
  } | null>(null);
  // diferença entre o relógio do servidor e o do aparelho — o carimbo da foto usa a hora do servidor
  const [desvioMs, setDesvioMs] = useState(0);

  const recarregar = useCallback(async () => {
    const r = await api
      .get<{ data: string; agora: string; tarefas: TarefaDoDia[] }>(
        "/tarefas/hoje",
      )
      .catch(() => null);
    if (r) setDesvioMs(new Date(r.agora).getTime() - Date.now());
    setDados(
      r ? { data: r.data, tarefas: r.tarefas } : { data: "", tarefas: [] },
    );
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    data: dados?.data ?? "",
    tarefas: dados?.tarefas ?? [],
    carregando: dados === null,
    recarregar,
    agora: () => new Date(Date.now() + desvioMs),
    concluir: async (
      id: string,
      dados: { observacao: string; fotos: string[] },
    ) => {
      await api.post(`/tarefas/${id}/concluir`, dados);
    },
  };
}

/** Cadastro de tarefas (síndico). */
export function useCadastroTarefas() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setTarefas(await api.get<Tarefa[]>("/tarefas").catch(() => []));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    tarefas,
    carregando,
    recarregar,
    remover: async (id: string) => {
      await api.delete(`/tarefas/${id}`);
    },
  };
}

/** Histórico de execuções com fotos (síndico). Filtros opcionais: tarefa e dia. */
export function useHistoricoTarefas(tarefaId: string, dia: string) {
  const [execucoes, setExecucoes] = useState<ExecucaoTarefa[] | null>(null);

  useEffect(() => {
    let vivo = true;
    const query = new URLSearchParams({
      ...(tarefaId && { tarefaId }),
      ...(dia && { dia }),
    }).toString();
    setExecucoes(null);
    api
      .get<ExecucaoTarefa[]>(`/tarefas/execucoes${query ? `?${query}` : ""}`)
      .then((r) => vivo && setExecucoes(r))
      .catch(() => vivo && setExecucoes([]));
    return () => {
      vivo = false;
    };
  }, [tarefaId, dia]);

  return { execucoes: execucoes ?? [], carregando: execucoes === null };
}

export type TarefaPerdida = Tarefa & { diasPerdidos: string[] };

/** Dias em que tarefas venceram e não foram feitas (síndico). Sem datas = últimos 30 dias até ontem. */
export function useTarefasPerdidas(de: string, ate: string) {
  const [dados, setDados] = useState<{
    de: string;
    ate: string;
    tarefas: TarefaPerdida[];
  } | null>(null);

  useEffect(() => {
    let vivo = true;
    const query = new URLSearchParams({
      ...(de && { de }),
      ...(ate && { ate }),
    }).toString();
    setDados(null);
    api
      .get<{ de: string; ate: string; tarefas: TarefaPerdida[] }>(
        `/tarefas/perdidas${query ? `?${query}` : ""}`,
      )
      .then((r) => vivo && setDados(r))
      .catch(() => vivo && setDados({ de, ate, tarefas: [] }));
    return () => {
      vivo = false;
    };
  }, [de, ate]);

  return { dados, carregando: dados === null };
}
