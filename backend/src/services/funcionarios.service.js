const prisma = require('../models/prisma');
const HttpError = require('../utils/httpError');
const { condominioDe, exigirAfetado, CARGOS } = require('../utils/acesso');
const { umDe } = require('../utils/validar');
const { criarPerfil } = require('./moradores.service');

const FUNCIONARIO = { papel: 'funcionario' };
const SELECT = { id: true, nome: true, email: true, telefone: true, cargo: true, criadoEm: true };

function listar(usuario) {
  return prisma.profile.findMany({
    where: { condominioId: condominioDe(usuario), ...FUNCIONARIO },
    select: SELECT,
    orderBy: [{ cargo: 'asc' }, { nome: 'asc' }]
  });
}

function criar(usuario, dados) {
  return criarPerfil(condominioDe(usuario), dados, {
    ...FUNCIONARIO,
    cargo: umDe(dados.cargo, CARGOS, 'cargo'),
    tutorialVistoEm: new Date() // o tutorial passeia por telas que funcionário não acessa
  });
}

async function atualizar(usuario, id, dados) {
  const data = {};
  if (dados.nome) data.nome = dados.nome;
  if (dados.telefone !== undefined) data.telefone = dados.telefone || null;
  if (dados.cargo) data.cargo = umDe(dados.cargo, CARGOS, 'cargo');
  exigirAfetado(await prisma.profile.updateMany({ where: { id, condominioId: condominioDe(usuario), ...FUNCIONARIO }, data }));
}

async function remover(usuario, id) {
  if (id === usuario.id) throw new HttpError(400, 'Você não pode remover a si mesmo');
  exigirAfetado(await prisma.profile.deleteMany({ where: { id, condominioId: condominioDe(usuario), ...FUNCIONARIO } }));
}

module.exports = { listar, criar, atualizar, remover };
