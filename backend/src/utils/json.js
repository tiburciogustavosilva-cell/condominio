const { Prisma } = require('@prisma/client');

// Colunas @db.Date saem como "YYYY-MM-DD" (igual ao Supabase); Decimal sai como number.
const CAMPOS_DATA = new Set([
  'data',
  'ultimaManutencao',
  'ultimoLembreteCiclo',
  'dataInstalacao',
  'dataAbertura',
  'dataExecucao'
]);

// `function` (não arrow): o JSON.stringify passa o objeto dono em `this`, antes do toJSON.
function jsonReplacer(chave, valor) {
  const original = this[chave];
  if (original instanceof Date && CAMPOS_DATA.has(chave)) return valor.slice(0, 10);
  if (Prisma.Decimal.isDecimal(original)) return Number(original);
  return valor;
}

module.exports = { jsonReplacer };
