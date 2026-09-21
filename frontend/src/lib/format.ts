/**
 * Funções puras de formatação — sem estado, sem JSX.
 * Enums e labels compartilhados ficam em `@/types/condominio` (LABEL).
 */

export function moeda(valor: number | null | undefined) {
  return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function dataHora(iso: string | null | undefined) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function dataCurta(iso: string | null | undefined) {
  if (!iso) return '-';
  const d = iso.length === 10 ? new Date(iso + 'T00:00:00') : new Date(iso);
  return d.toLocaleDateString('pt-BR');
}

export function iniciais(nome?: string) {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  return (partes[0][0] + (partes[1]?.[0] ?? '')).toUpperCase();
}

/** "A cada 4 meses", "Toda semana", "Todo ano"… */
export function frequenciaTexto(unidade: string, intervalo: number) {
  const n = Math.max(1, Number(intervalo) || 1);
  if (unidade === 'semanal') return n === 1 ? 'Toda semana' : `A cada ${n} semanas`;
  if (unidade === 'anual') return n === 1 ? 'Todo ano' : `A cada ${n} anos`;
  return n === 1 ? 'Todo mês' : `A cada ${n} meses`;
}

/** "em 11 dias", "hoje", "há 2 dias" */
export function prazoTexto(dias: number | null | undefined) {
  if (dias == null) return '-';
  if (dias === 0) return 'hoje';
  if (dias > 0) return dias === 1 ? 'amanhã' : `em ${dias} dias`;
  const d = Math.abs(dias);
  return d === 1 ? 'há 1 dia' : `há ${d} dias`;
}
