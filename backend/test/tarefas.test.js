// Regras de recorrência das tarefas (função pura, sem banco). Rode: node test/tarefas.test.js
const assert = require('assert');
const { venceNoDia, diasPerdidos } = require('../src/services/tarefas.service');

// 2026-09-28 é segunda-feira (getUTCDay = 1)
assert.equal(venceNoDia({ recorrencia: 'diaria' }, '2026-09-28'), true);
assert.equal(venceNoDia({ recorrencia: 'semanal', diasSemana: [1] }, '2026-09-28'), true, 'toda segunda');
assert.equal(venceNoDia({ recorrencia: 'semanal', diasSemana: [1] }, '2026-09-29'), false);
assert.equal(venceNoDia({ recorrencia: 'semanal', diasSemana: [1, 3, 5] }, '2026-10-02'), true, 'sexta');
assert.equal(venceNoDia({ recorrencia: 'mensal', diaMes: 5 }, '2026-10-05'), true);
assert.equal(venceNoDia({ recorrencia: 'mensal', diaMes: 5 }, '2026-10-06'), false);
assert.equal(venceNoDia({ recorrencia: 'mensal', diaMes: 31 }, '2027-02-28'), true, 'dia 31 cai no último dia de fevereiro');
assert.equal(venceNoDia({ recorrencia: 'mensal', diaMes: 31 }, '2026-10-30'), false, 'outubro tem 31');
assert.equal(venceNoDia({ recorrencia: 'unica', data: new Date('2026-10-10') }, '2026-10-10'), true);
assert.equal(venceNoDia({ recorrencia: 'unica', data: new Date('2026-10-10') }, '2026-10-11'), false);

// Dias perdidos: toda segunda, criada em 01/09/2026; feita só em 14/09
const garagem = { id: 'g', recorrencia: 'semanal', diasSemana: [1], criadoEm: new Date('2026-09-01T12:00:00Z') };
const feitas = new Set(['g|2026-09-14']);
assert.deepEqual(diasPerdidos(garagem, feitas, '2026-09-01', '2026-09-28'), ['2026-09-07', '2026-09-21', '2026-09-28']);
assert.deepEqual(diasPerdidos(garagem, feitas, '2026-08-01', '2026-09-08'), ['2026-09-07'], 'não conta antes de existir');
const pintura = { id: 'p', recorrencia: 'unica', data: new Date('2026-09-10'), criadoEm: new Date('2026-09-01T12:00:00Z') };
assert.deepEqual(diasPerdidos(pintura, new Set(), '2026-09-01', '2026-09-30'), ['2026-09-10']);
assert.deepEqual(diasPerdidos(pintura, new Set(['p|2026-09-10']), '2026-09-01', '2026-09-30'), [], 'feita (mesmo atrasada) não conta');

console.log('tarefas ok');
