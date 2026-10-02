// Código de check-in das assembleias (função pura, sem banco). Rode: node test/assembleias.test.js
const assert = require('assert');
const { codigo, codigoValido, tokenQr, qrValido, bloqueado, registrarFalha } = require('../src/services/assembleias.service');

const segredo = 'segredo-de-teste';
const agora = 1_790_000_000_000;

assert.match(codigo(segredo), /^\d{6}$/);
assert.equal(codigo(segredo), codigo(segredo), 'fixo pra mesma assembleia — não muda com o tempo');
assert.notEqual(codigo(segredo), codigo('outro-segredo'), 'cada assembleia tem o seu');

assert.ok(codigoValido(segredo, codigo(segredo)));
assert.ok(codigoValido(segredo, codigo(segredo).replace(/^(\d{3})/, '$1 ')), 'ignora espaço');
assert.ok(!codigoValido(segredo, ''));
assert.ok(!codigoValido(segredo, undefined));
assert.ok(!codigoValido(segredo, codigo('outro-segredo')), 'código de outra assembleia não serve');

// QR: token fixo, independente do número digitado
assert.ok(qrValido(segredo, tokenQr(segredo)));
assert.notEqual(tokenQr(segredo), codigo(segredo));
assert.ok(!codigoValido(segredo, tokenQr(segredo)), 'token do QR não serve como número');

// Limite de tentativas: 5 erros bloqueiam por 1 minuto, depois libera
const chave = 'usuario|assembleia';
for (let i = 0; i < 4; i++) registrarFalha(chave, agora);
assert.ok(!bloqueado(chave, agora), '4 erros ainda pode tentar');
registrarFalha(chave, agora);
assert.ok(bloqueado(chave, agora + 30_000), '5 erros bloqueia');
assert.ok(!bloqueado(chave, agora + 61_000), 'libera depois de 1 minuto');
assert.ok(!bloqueado('outra|chave', agora));

console.log('assembleias ok');
