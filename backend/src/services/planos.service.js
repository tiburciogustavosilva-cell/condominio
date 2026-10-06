const prisma = require('../models/prisma');
const { PLANOS, resumoDeAcesso } = require('../utils/planos');

/** Condomínio completo, com `bloqueadoMotivo` efetivo (inclui o fim do teste) e o bloco `acesso`. */
async function condominioComAcesso(condominioId) {
  const c = await prisma.condominio.findUnique({
    where: { id: condominioId },
    include: { pagamentos: { orderBy: { validoAte: 'desc' }, take: 1, select: { validoAte: true } } }
  });
  if (!c) return null;
  const { pagamentos, ...resto } = c;
  return { ...resto, ...resumoDeAcesso({ ...resto, pagoAte: pagamentos[0]?.validoAte ?? null }) };
}

function catalogo() {
  return Object.entries(PLANOS).map(([id, p]) => ({ id, nome: p.nome, precoUnidade: p.precoUnidade, recursos: p.recursos }));
}

module.exports = { condominioComAcesso, catalogo };
