const prisma = require('../models/prisma');
const { condominioDe, exigirAfetado } = require('../utils/acesso');
const { obrigatorio, parcial } = require('../utils/validar');

const CAMPOS = { nome: null, email: null, servico: null, empresa: null, telefone: null, observacao: null };

async function listar(usuario) {
  const prestadores = await prisma.prestador.findMany({
    where: { condominioId: condominioDe(usuario) },
    include: { _count: { select: { manutencoes: true } } },
    orderBy: { nome: 'asc' }
  });
  return prestadores.map(({ _count, ...p }) => ({ ...p, manutencoes: _count.manutencoes }));
}

function criar(usuario, d) {
  obrigatorio(d.nome, 'nome');
  obrigatorio(d.email, 'email');
  return prisma.prestador.create({ data: { ...parcial(d, CAMPOS), condominioId: condominioDe(usuario) } });
}

async function atualizar(usuario, id, d) {
  exigirAfetado(
    await prisma.prestador.updateMany({ where: { id, condominioId: condominioDe(usuario) }, data: parcial(d, CAMPOS) })
  );
}

async function remover(usuario, id) {
  exigirAfetado(await prisma.prestador.deleteMany({ where: { id, condominioId: condominioDe(usuario) } }));
}

module.exports = { listar, criar, atualizar, remover };
