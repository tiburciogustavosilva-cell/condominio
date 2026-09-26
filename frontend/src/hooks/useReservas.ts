import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Area, Reserva } from '@/types/condominio';

export function useReservas() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    const dados = await api.get<{ reservas: Reserva[]; areas: Area[] }>('/reservas').catch(() => null);
    setReservas(dados?.reservas ?? []);
    setAreas(dados?.areas ?? []);
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
      await api.post('/reservas', dados);
    },
    atualizarStatus: async (id: string, status: string) => {
      await api.patch(`/reservas/${id}/status`, { status });
    },
    cancelar: async (id: string) => {
      await api.patch(`/reservas/${id}/status`, { status: 'cancelada' });
    }
  };
}
