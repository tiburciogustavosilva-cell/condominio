// Série mensal dos relatórios (função pura, sem banco). Rode: node test/relatorios.test.js
const assert = require('assert');
const { porMes, inicioPeriodo, periodo } = require('../src/services/relatorios.service');

const desde = inicioPeriodo(3, new Date('2026-10-19T12:00:00Z'));
assert.equal(desde.toISOString(), '2026-08-01T00:00:00.000Z', 'período de 3 meses começa em agosto');
assert.equal(inicioPeriodo(12, new Date('2026-03-05T12:00:00Z')).toISOString(), '2025-04-01T00:00:00.000Z', 'vira o ano');

const serie = porMes(
  [[new Date('2026-08-10')], [new Date('2026-08-31T23:00:00Z')], [new Date('2026-10-01'), 150.5], [new Date('2026-07-31')], [new Date('2026-11-01')]],
  desde,
  3
);
assert.deepEqual(serie, [
  { mes: '2026-08', total: 2 },
  { mes: '2026-09', total: 0 },
  { mes: '2026-10', total: 150.5 }
], 'mês vazio = 0, valor somado, fora do período ignorado');

const hoje = new Date('2026-10-19T12:00:00Z');
const p6 = periodo({}, hoje);
assert.deepEqual([p6.de, p6.ate, p6.meses], ['2026-05-01', '2026-10-31', 6], 'padrão: últimos 6 meses');
const pc = periodo({ de: '2026-01-15', ate: '2026-03-10' }, hoje);
assert.deepEqual([pc.de, pc.ate, pc.meses, pc.fim.toISOString()], ['2026-01-15', '2026-03-10', 3, '2026-03-11T00:00:00.000Z'], 'personalizado: até inclusive');
assert.equal(periodo({ de: '2026-02-01', ate: '2026-02-01' }, hoje).meses, 1, 'um dia só');
assert.throws(() => periodo({ de: '2026-03-01', ate: '2026-02-01' }), /Período inválido/, 'de depois de até');
assert.throws(() => periodo({ de: '2026-03-01' }), /Período inválido/, 'só um lado');
assert.throws(() => periodo({ de: '2020-01-01', ate: '2026-01-01' }), /36 meses/, 'teto');

console.log('relatorios ok');
