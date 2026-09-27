const prisma = require('../models/prisma');
const HttpError = require('../utils/httpError');
const { condominioDe, exigirAfetado } = require('../utils/acesso');
const { obrigatorio } = require('../utils/validar');

async function listar(usuario) {
  const unidades = await prisma.unidade.findMany({
    where: { condominioId: condominioDe(usuario) },
    include: { profiles: { select: { nome: true } } },
    orderBy: [{ bloco: 'asc' }, { numero: 'asc' }]
  });
  return unidades.map(({ profiles, ...u }) => ({ ...u, moradores: profiles.map((p) => p.nome) }));
}

function campos(d) {
  const pesoVoto = d.pesoVoto === undefined || d.pesoVoto === '' ? 1 : Number(d.pesoVoto);
  if (!(pesoVoto > 0)) throw new HttpError(400, 'Peso do voto precisa ser maior que zero');
  return {
    numero: obrigatorio(d.numero, 'numero'),
    bloco: d.bloco || '-',
    tipo: d.tipo || 'apartamento',
    fracaoIdeal: Number(d.fracaoIdeal) || 0,
    pesoVoto
  };
}

function criar(usuario, dados) {
  return prisma.unidade.create({ data: { ...campos(dados), condominioId: condominioDe(usuario) } });
}

async function atualizar(usuario, id, dados) {
  exigirAfetado(await prisma.unidade.updateMany({ where: { id, condominioId: condominioDe(usuario) }, data: campos(dados) }));
}

async function remover(usuario, id) {
  exigirAfetado(await prisma.unidade.deleteMany({ where: { id, condominioId: condominioDe(usuario) } }));
}

module.exports = { listar, criar, atualizar, remover };
