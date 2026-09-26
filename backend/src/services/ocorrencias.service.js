const prisma = require('../models/prisma');
const { rotuloUnidade } = require('../utils/unidade');
const { isSindico, condominioDe, exigirAfetado } = require('../utils/acesso');
const { obrigatorio, umDe } = require('../utils/validar');

const STATUS = ['aberto', 'em_andamento', 'concluido'];

async function listar(usuario) {
  const ocorrencias = await prisma.ocorrencia.findMany({
    where: { condominioId: condominioDe(usuario), ...(isSindico(usuario) ? {} : { usuarioId: usuario.id }) },
    include: { usuario: { select: { nome: true } }, unidade: { select: { bloco: true, numero: true } } },
    orderBy: { criadoEm: 'desc' }
  });
  return ocorrencias.map(({ usuario: autor, unidade, ...o }) => ({
    ...o,
    autorNome: autor?.nome ?? '—',
    unidadeLabel: rotuloUnidade(unidade) ?? undefined
  }));
}

function criar(usuario, d) {
  return prisma.ocorrencia.create({
    data: {
      titulo: obrigatorio(d.titulo, 'titulo'),
      descricao: obrigatorio(d.descricao, 'descricao'),
      categoria: d.categoria || 'outro',
      usuarioId: usuario.id,
      unidadeId: usuario.unidadeId,
      condominioId: condominioDe(usuario)
    }
  });
}

async function atualizarStatus(usuario, id, status) {
  umDe(status, STATUS, 'status');
  exigirAfetado(await prisma.ocorrencia.updateMany({ where: { id, condominioId: condominioDe(usuario) }, data: { status } }));
}

module.exports = { listar, criar, atualizarStatus };
