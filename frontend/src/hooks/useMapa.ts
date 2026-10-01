import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { MapaItem } from '@/types/condominio';

/** Peças do mapa do condomínio. `aplicar` mostra na hora e grava; se a API recusar, volta como estava. */
export function useMapa() {
  const [itens, setItensState] = useState<MapaItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);
  const atual = useRef<MapaItem[]>([]);
  const setItens = (v: MapaItem[]) => {
    atual.current = v;
    setItensState(v);
  };

  function recarregar() {
    setCarregando(true);
    setFalhou(false);
    api
      .get<MapaItem[]>('/mapa')
      .then(setItens)
      .catch(() => setFalhou(true))
      .finally(() => setCarregando(false));
  }

  useEffect(recarregar, []);

  async function aplicar(novos: MapaItem[], removidos: string[] = []) {
    const antes = atual.current;
    const mexidos = new Set([...removidos, ...novos.map((n) => n.id)]);
    setItens([...antes.filter((i) => !mexidos.has(i.id)), ...novos]);
    try {
      await api.put('/mapa', { itens: novos, removidos });
    } catch (err) {
      // ponytail: desfaz pro estado anterior a esta mudança; mudanças simultâneas podem voltar junto
      setItens(antes);
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar o mapa');
    }
  }

  return { itens, carregando, falhou, recarregar, aplicar };
}

/** uuid v4 também fora de https (crypto.randomUUID só existe em contexto seguro, ex.: celular na rede local). */
export function novoId() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
