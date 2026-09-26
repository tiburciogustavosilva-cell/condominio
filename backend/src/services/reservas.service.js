const prisma = require('../models/prisma');
const { rotuloUnidade } = require('../utils/unidade');
const HttpError = require('../utils/httpError');
const { isSindico, condominioDe, exigirAfetado } = require('../utils/acesso');
const { obrigatorio, umDe, paraData } = require('../utils/validar');

const PERIODOS = ['manha', 'tarde', 'noite', 'dia_todo'];
const STATUS = ['pendente', 'aprovada', 'rejeitada', 'cancelada'];

async function listar(usuario) {
  const condominioId = condominioDe(usuario);
  const [reservas, areas] = await Promise.all([
    prisma.reserva.findMany({
      where: { condominioId, ...(isSindico(usuario) ? {} : { usuarioId: usuario.id }) },
      include: {
        area: { select: { nome: true, taxa: true } },
        usuario: { select: { nome: true } },
        unidade: { select: { bloco: true, numero: true } }
      },
      orderBy: { data: 'desc' }
    }),
    prisma.area.findMany({ where: { condominioId }, orderBy: { nome: 'asc' } })
  ]);
  return {
    reservas: reservas.map(({ area, usuario: autor, unidade, ...r }) => ({
      ...r,
      areaNome: area?.nome ?? '—',
      taxa: area?.taxa ?? 0,
      solicitante: autor?.nome ?? '—',
      unidadeLabel: rotuloUnidade(unidade) ?? '-'
    })),
    areas
  };
}

async function criar(usuario, d) {
  const condominioId = condominioDe(usuario);
  if (!(await prisma.area.findFirst({ where: { id: obrigatorio(d.areaId, 'areaId'), condominioId } }))) {
    throw new HttpError(400, 'Área inválida');
  }
  return prisma.reserva.create({
    data: {
      areaId: d.areaId,
      data: paraData(obrigatorio(d.data, 'data')),
      periodo: umDe(d.periodo, PERIODOS, 'periodo'),
      observacao: d.observacao || '',
      usuarioId: usuario.id,
      unidadeId: usuario.unidadeId,
      condominioId
    }
  });
}

/** Síndico muda para qualquer status; o dono só cancela enquanto pendente. */
async function atualizarStatus(usuario, id, status) {
  umDe(status, STATUS, 'status');
  const condominioId = condominioDe(usuario);
  const where = isSindico(usuario)
    ? { id, condominioId }
    : status === 'cancelada'
      ? { id, condominioId, usuarioId: usuario.id, status: 'pendente' }
      : null;
  if (!where) throw new HttpError(403, 'Você só pode cancelar reservas pendentes');
  exigirAfetado(await prisma.reserva.updateMany({ where, data: { status } }));
}

module.exports = { listar, criar, atualizarStatus };
