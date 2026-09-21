import type { FrequenciaUnidade, StatusManutencao } from '@/types/condominio';

/**
 * Porta em TS de backend/lib/recorrencia.js — antes calculado no Express,
 * agora calculado no cliente já que o Supabase não roda essa lógica de negócio.
 */

function paraData(valor: string) {
  return new Date(valor.length === 10 ? `${valor}T00:00:00` : valor);
}

export function proximaData(ultima: string, unidade: FrequenciaUnidade, intervalo: number): string {
  const d = paraData(ultima);
  const n = Math.max(1, Number(intervalo) || 1);
  if (unidade === 'semanal') d.setDate(d.getDate() + n * 7);
  else if (unidade === 'anual') d.setFullYear(d.getFullYear() + n);
  else d.setMonth(d.getMonth() + n); // mensal (padrão)
  return d.toISOString().slice(0, 10);
}

export function statusManutencao(
  ultima: string,
  unidade: FrequenciaUnidade,
  intervalo: number,
  diasAntecedencia: number,
  hojeISO?: string
): { proxima: string; dias: number; status: StatusManutencao } {
  const hoje = hojeISO || new Date().toISOString().slice(0, 10);
  const proxima = proximaData(ultima, unidade, intervalo);
  const dias = Math.round((paraData(proxima).getTime() - paraData(hoje).getTime()) / 86400000);
  let status: StatusManutencao = 'em_dia';
  if (dias < 0) status = 'vencida';
  else if (dias <= (Number(diasAntecedencia) || 0)) status = 'proxima';
  return { proxima, dias, status };
}
