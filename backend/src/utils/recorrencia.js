const UNIDADES = ['semanal', 'mensal', 'anual'];

function paraData(valor) {
  if (!valor) return new Date(NaN);
  if (valor instanceof Date) valor = valor.toISOString().slice(0, 10); // coluna @db.Date do Prisma
  return new Date(valor.length === 10 ? valor + 'T00:00:00' : valor);
}

/**
 * Calcula a próxima data de manutenção a partir da última, somando
 * `intervalo` unidades de tempo (semanas, meses ou anos). Retorna "YYYY-MM-DD".
 */
function proximaData(ultima, unidade, intervalo) {
  const d = paraData(ultima);
  if (Number.isNaN(d.getTime())) return null;
  const n = Math.max(1, Number(intervalo) || 1);
  if (unidade === 'semanal') d.setDate(d.getDate() + n * 7);
  else if (unidade === 'anual') d.setFullYear(d.getFullYear() + n);
  else d.setMonth(d.getMonth() + n); // mensal (padrão)
  return d.toISOString().slice(0, 10);
}

/**
 * Status de uma manutenção agendada:
 *  - vencida  : a próxima data já passou
 *  - proxima  : está dentro da janela de antecedência (diasAntecedencia)
 *  - em_dia   : ainda falta mais tempo
 */
function statusManutencao(m, hojeISO) {
  const hoje = hojeISO || new Date().toISOString().slice(0, 10);
  const proxima = proximaData(m.ultimaManutencao, m.frequenciaUnidade, m.frequenciaIntervalo);
  if (!proxima) return { proxima: null, dias: null, status: 'em_dia' };
  const dias = Math.round((paraData(proxima).getTime() - paraData(hoje).getTime()) / 86400000);
  let status = 'em_dia';
  if (dias < 0) status = 'vencida';
  else if (dias <= (Number(m.diasAntecedencia) || 0)) status = 'proxima';
  return { proxima, dias, status };
}

module.exports = { UNIDADES, proximaData, statusManutencao };
