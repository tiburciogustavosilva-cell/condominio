const prisma = require('../models/prisma');
const { rotuloUnidade } = require('../utils/unidade');
const { isSindico, condominioDe, exigirAfetado } = require('../utils/acesso');
const { obrigatorio, umDe } = require('../utils/validar');
const { lerFotoWebp } = require('../utils/foto');
const HttpError = require('../utils/httpError');

const STATUS = ['aberto', 'em_andamento', 'concluido'];

// Síndico vê todas as do condomínio; morador só as que ele mesmo abriu.
function escopo(usuario) {
  return { condominioId: condominioDe(usuario), ...(isSindico(usuario) ? {} : { usuarioId: usuario.id }) };
}

async function listar(usuario) {
  const where = escopo(usuario);
  const ocorrencias = await prisma.ocorrencia.findMany({
    where,
    omit: { foto: true },
    include: {
      usuario: { select: { nome: true } },
      unidade: { select: { bloco: true, numero: true } },
      historico: { include: { autor: { select: { nome: true } } }, orderBy: { criadoEm: 'asc' } }
    },
    orderBy: { criadoEm: 'desc' }
  });
  const comFoto = new Set(
    (await prisma.ocorrencia.findMany({ where: { ...where, foto: { not: null } }, select: { id: true } })).map((o) => o.id)
  );
  return ocorrencias.map(({ usuario: autor, unidade, historico, ...o }) => ({
    ...o,
    autorNome: autor?.nome ?? '—',
    unidadeLabel: rotuloUnidade(unidade) ?? undefined,
    temFoto: comFoto.has(o.id),
    historico: historico.map(({ autor, ...h }) => ({ ...h, autorNome: autor?.nome ?? 'Síndico' }))
  }));
}

function criar(usuario, d) {
  return prisma.ocorrencia.create({
    data: {
      titulo: obrigatorio(d.titulo, 'titulo'),
      descricao: obrigatorio(d.descricao, 'descricao'),
      categoria: d.categoria || 'outro',
      foto: d.foto ? lerFotoWebp(d.foto) : null,
      usuarioId: usuario.id,
      unidadeId: usuario.unidadeId,
      condominioId: condominioDe(usuario)
    }
  });
}

async function foto(usuario, id) {
  const ocorrencia = await prisma.ocorrencia.findFirst({ where: { ...escopo(usuario), id }, select: { foto: true } });
  if (!ocorrencia?.foto) throw new HttpError(404, 'Foto não encontrada');
  return ocorrencia.foto;
}

async function atualizarStatus(usuario, id, status, descricao) {
  umDe(status, STATUS, 'status');
  obrigatorio(descricao, 'descricao');
  await prisma.$transaction(async (tx) => {
    exigirAfetado(await tx.ocorrencia.updateMany({ where: { id, condominioId: condominioDe(usuario) }, data: { status } }));
    await tx.ocorrenciaHistorico.create({
      data: { ocorrenciaId: id, status, descricao: String(descricao).trim(), autorId: usuario.id }
    });
  });
}

module.exports = { listar, criar, foto, atualizarStatus };
