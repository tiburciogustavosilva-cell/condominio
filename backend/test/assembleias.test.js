// Código de check-in rotativo das assembleias (função pura, sem banco). Rode: node test/assembleias.test.js
const assert = require('assert');
const { codigo, codigoValido, tokenQr, qrValido, bloqueado, registrarFalha, JANELA_MS } = require('../src/services/assembleias.service');

const segredo = 'segredo-de-teste';
const agora = 1_790_000_000_000;
const janela = Math.floor(agora / JANELA_MS);

assert.match(codigo(segredo, janela), /^\d{6}$/);
assert.equal(codigo(segredo, janela), codigo(segredo, janela), 'estável dentro da janela');
assert.notEqual(codigo(segredo, janela), codigo(segredo, janela + 1), 'muda na janela seguinte');
assert.notEqual(codigo(segredo, janela), codigo('outro-segredo', janela), 'cada assembleia tem o seu');

assert.ok(codigoValido(segredo, codigo(segredo, janela), agora));
assert.ok(codigoValido(segredo, codigo(segredo, janela - 1), agora), 'aceita a janela anterior (digitou devagar)');
assert.ok(codigoValido(segredo, codigo(segredo, janela - 2), agora), 'aceita até 2 janelas atrás');
assert.ok(!codigoValido(segredo, codigo(segredo, janela - 3), agora), 'recusa código de mais de 3 minutos');
assert.ok(codigoValido(segredo, codigo(segredo, janela).replace(/^(\d{3})/, '$1 '), agora), 'ignora espaço');
assert.ok(!codigoValido(segredo, '', agora));
assert.ok(!codigoValido(segredo, undefined, agora));

// QR: vale 10 min (dá tempo de fazer login) e não se confunde com o número digitado
assert.ok(qrValido(segredo, tokenQr(segredo, janela - 9), agora), 'QR de 9 min atrás ainda vale');
assert.ok(!qrValido(segredo, tokenQr(segredo, janela - 10), agora), 'QR de 10 min atrás não');
assert.notEqual(tokenQr(segredo, janela), codigo(segredo, janela));
assert.ok(!codigoValido(segredo, tokenQr(segredo, janela), agora), 'token do QR não serve como número');

// Limite de tentativas: 5 erros bloqueiam por 1 minuto, depois libera
const chave = 'usuario|assembleia';
for (let i = 0; i < 4; i++) registrarFalha(chave, agora);
assert.ok(!bloqueado(chave, agora), '4 erros ainda pode tentar');
registrarFalha(chave, agora);
assert.ok(bloqueado(chave, agora + 30_000), '5 erros bloqueia');
assert.ok(!bloqueado(chave, agora + 61_000), 'libera depois de 1 minuto');
assert.ok(!bloqueado('outra|chave', agora));

console.log('assembleias ok');
