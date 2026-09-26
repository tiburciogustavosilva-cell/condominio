const prisma = require('../models/prisma');
const HttpError = require('../utils/httpError');
const { isSindico, condominioDe, exigirAfetado } = require('../utils/acesso');
const { obrigatorio, umDe } = require('../utils/validar');

const STATUS = ['aberto', 'em_andamento', 'concluido'];
const PRIORIDADES = ['baixa', 'media', 'alta'];
const COM_AUTOR = { usuario: { select: { nome: true } } };

// Síndico vê todos do condomínio; condômino só os próprios.
const escopo = (u) => ({ condominioId: condominioDe(u), ...(isSindico(u) ? {} : { usuarioId: u.id }) });

const formatar = ({ usuario, ...c }) => ({ ...c, autorNome: usuario?.nome ?? '—' });

async function listar(usuario, status) {
  const chamados = await prisma.chamado.findMany({
    where: { ...escopo(usuario), ...(status ? { status } : {}) },
    include: COM_AUTOR,
    orderBy: { criadoEm: 'desc' }
  });
  return chamados.map(formatar);
}

async function obter(usuario, id) {
  const chamado = await prisma.chamado.findFirst({
    where: { id, ...escopo(usuario) },
    include: {
      ...COM_AUTOR,
      comentarios: { include: { autor: { select: { nome: true } } }, orderBy: { criadoEm: 'asc' } }
    }
  });
  if (!chamado) throw new HttpError(404, 'Chamado não encontrado');
  const { comentarios, ...resto } = chamado;
  return {
    ...formatar(resto),
    comentarios: comentarios.map(({ autor, ...c }) => ({ ...c, autorNome: autor?.nome ?? '—' }))
  };
}

function criar(usuario, d) {
  return prisma.chamado.create({
    data: {
      titulo: obrigatorio(d.titulo, 'titulo'),
      descricao: obrigatorio(d.descricao, 'descricao'),
      categoria: d.categoria || 'geral',
      prioridade: umDe(d.prioridade || 'media', PRIORIDADES, 'prioridade'),
      usuarioId: usuario.id,
      unidadeId: usuario.unidadeId,
      condominioId: condominioDe(usuario)
    }
  });
}

async function atualizarStatus(usuario, id, status) {
  umDe(status, STATUS, 'status');
  exigirAfetado(await prisma.chamado.updateMany({ where: { id, condominioId: condominioDe(usuario) }, data: { status } }));
}

async function comentar(usuario, id, texto) {
  await obter(usuario, id); // 404 se o chamado não é visível para este usuário
  return prisma.chamadoComentario.create({
    data: { chamadoId: id, autorId: usuario.id, texto: obrigatorio(texto, 'texto'), condominioId: condominioDe(usuario) }
  });
}

module.exports = { listar, obter, criar, atualizarStatus, comentar, escopo };
