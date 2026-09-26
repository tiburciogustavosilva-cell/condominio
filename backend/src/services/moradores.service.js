const bcrypt = require('bcryptjs');
const prisma = require('../models/prisma');
const HttpError = require('../utils/httpError');
const { condominioDe, exigirAfetado } = require('../utils/acesso');
const { obrigatorio, umDe } = require('../utils/validar');
const { validarSenha, normalizarEmail } = require('./auth.service');

const PAPEIS = ['sindico', 'condomino'];
const SELECT = { id: true, nome: true, email: true, telefone: true, papel: true, unidadeId: true };
// Administradora e funcionários têm telas próprias; aqui só quem mora/administra o prédio.
const SO_MORADORES = { papel: { in: PAPEIS } };

function listar(usuario) {
  return prisma.profile.findMany({
    where: { condominioId: condominioDe(usuario), ...SO_MORADORES },
    select: SELECT,
    orderBy: { nome: 'asc' }
  });
}

async function validarUnidade(condominioId, unidadeId) {
  if (!(await prisma.unidade.findFirst({ where: { id: unidadeId, condominioId } }))) {
    throw new HttpError(400, 'Unidade inválida');
  }
}

/** Cria um login no condomínio do síndico. Usado também por funcionarios.service. */
async function criarPerfil(condominioId, dados, extra) {
  const email = normalizarEmail(dados.email);
  validarSenha(dados.senha);
  if (await prisma.profile.findUnique({ where: { email } })) {
    throw new HttpError(409, 'Já existe uma conta com esse e-mail');
  }
  return prisma.profile.create({
    data: {
      nome: obrigatorio(dados.nome, 'nome'),
      email,
      senhaHash: await bcrypt.hash(dados.senha, 10),
      telefone: dados.telefone || null,
      condominioId,
      ...extra
    },
    select: { ...SELECT, cargo: true }
  });
}

async function criar(usuario, dados) {
  const condominioId = condominioDe(usuario);
  if (dados.unidadeId) await validarUnidade(condominioId, dados.unidadeId);
  return criarPerfil(condominioId, dados, {
    papel: umDe(dados.papel || 'condomino', PAPEIS, 'papel'),
    unidadeId: dados.unidadeId || null
  });
}

/** unidadeId: null limpa a unidade; string troca; ausente/'' mantém. */
async function atualizar(usuario, id, dados) {
  const condominioId = condominioDe(usuario);
  const data = {};
  if (dados.nome) data.nome = dados.nome;
  if (dados.telefone !== undefined && dados.telefone !== null) data.telefone = dados.telefone;
  if (dados.papel) data.papel = umDe(dados.papel, PAPEIS, 'papel');
  if (dados.unidadeId === null) data.unidadeId = null;
  else if (dados.unidadeId) {
    await validarUnidade(condominioId, dados.unidadeId);
    data.unidadeId = dados.unidadeId;
  }
  exigirAfetado(
    await prisma.profile.updateMany({ where: { id, condominioId, ...SO_MORADORES }, data })
  );
}

async function remover(usuario, id) {
  if (id === usuario.id) throw new HttpError(400, 'Você não pode remover a si mesmo');
  exigirAfetado(
    await prisma.profile.deleteMany({
      where: { id, condominioId: condominioDe(usuario), ...SO_MORADORES }
    })
  );
}

module.exports = { listar, criar, atualizar, remover, criarPerfil };
