const prisma = require('../models/prisma');
const { condominioDe, exigirAfetado } = require('../utils/acesso');
const HttpError = require('../utils/httpError');
const { obrigatorio, parcial } = require('../utils/validar');

const formatar = ({ autor, ...a }) => ({ ...a, autorNome: autor?.nome ?? 'Síndico' });

async function listar(usuario, limite) {
  const avisos = await prisma.aviso.findMany({
    where: { condominioId: condominioDe(usuario), OR: [{ expiraEm: null }, { expiraEm: { gt: new Date() } }] },
    include: { autor: { select: { nome: true } } },
    orderBy: [{ fixado: 'desc' }, { criadoEm: 'desc' }],
    take: limite
  });
  return avisos.map(formatar);
}

function paraExpiracao(valor) {
  if (!valor) return null;
  const data = new Date(valor);
  if (isNaN(data)) throw new HttpError(400, 'expiraEm inválido');
  return data;
}

function criar(usuario, d) {
  return prisma.aviso.create({
    data: {
      titulo: obrigatorio(d.titulo, 'titulo'),
      mensagem: obrigatorio(d.mensagem, 'mensagem'),
      fixado: !!d.fixado,
      expiraEm: paraExpiracao(d.expiraEm),
      autorId: usuario.id,
      condominioId: condominioDe(usuario)
    }
  });
}

async function atualizar(usuario, id, d) {
  const data = parcial(d, { titulo: null, mensagem: null, fixado: Boolean, expiraEm: paraExpiracao });
  exigirAfetado(await prisma.aviso.updateMany({ where: { id, condominioId: condominioDe(usuario) }, data }));
}

async function remover(usuario, id) {
  exigirAfetado(await prisma.aviso.deleteMany({ where: { id, condominioId: condominioDe(usuario) } }));
}

module.exports = { listar, criar, atualizar, remover };
