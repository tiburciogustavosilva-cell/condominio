const prisma = require('../models/prisma');
const HttpError = require('../utils/httpError');
const { condominioDe, exigirAfetado } = require('../utils/acesso');
const { obrigatorio, umDe, paraData, parcial } = require('../utils/validar');
const { lerAnexo } = require('../utils/anexo');

const TIPOS = ['preventiva', 'corretiva', 'preditiva'];
const PRIORIDADES = ['baixa', 'media', 'alta', 'critica'];
const STATUS = ['programada', 'em_andamento', 'concluida', 'atrasada', 'cancelada'];
const TIPOS_ANEXO = ['nota_fiscal', 'orcamento'];
const vazioParaNull = (v) => v || null;

const CAMPOS = {
  numeroOs: vazioParaNull,
  dataAbertura: paraData,
  dataExecucao: paraData,
  ativoId: vazioParaNull,
  tipo: (v) => umDe(v, TIPOS, 'tipo'),
  descricao: null,
  diagnostico: null,
  acaoExecutada: null,
  responsavel: null,
  prioridade: (v) => umDe(v, PRIORIDADES, 'prioridade'),
  status: (v) => umDe(v, STATUS, 'status'),
  custoMaterial: (v) => Number(v) || 0,
  custoMaoDeObra: (v) => Number(v) || 0,
  observacoes: null
};

async function listar(usuario) {
  const ordens = await prisma.ordemServico.findMany({
    where: { condominioId: condominioDe(usuario) },
    include: { ativo: { select: { nome: true } } },
    orderBy: { dataAbertura: 'desc' }
  });
  return ordens.map(({ ativo, ...o }) => ({
    ...o,
    ativoNome: ativo?.nome ?? '—',
    custoTotal: Number(o.custoMaterial) + Number(o.custoMaoDeObra) // era coluna generated no Supabase
  }));
}

async function validarAtivo(condominioId, ativoId) {
  if (ativoId && !(await prisma.ativo.findFirst({ where: { id: ativoId, condominioId } }))) {
    throw new HttpError(400, 'Ativo inválido');
  }
}

async function criar(usuario, d) {
  const condominioId = condominioDe(usuario);
  obrigatorio(d.descricao, 'descricao');
  const data = parcial(d, CAMPOS);
  if (!data.dataAbertura) delete data.dataAbertura; // default: hoje
  await validarAtivo(condominioId, data.ativoId);
  return prisma.ordemServico.create({ data: { ...data, condominioId } });
}

async function atualizar(usuario, id, d) {
  const condominioId = condominioDe(usuario);
  const data = parcial(d, CAMPOS);
  await validarAtivo(condominioId, data.ativoId);
  exigirAfetado(await prisma.ordemServico.updateMany({ where: { id, condominioId }, data }));
}

async function remover(usuario, id) {
  exigirAfetado(await prisma.ordemServico.deleteMany({ where: { id, condominioId: condominioDe(usuario) } }));
}

async function ordemVisivel(usuario, id) {
  const ordem = await prisma.ordemServico.findFirst({ where: { id, condominioId: condominioDe(usuario) }, select: { id: true } });
  if (!ordem) throw new HttpError(404, 'Ordem de serviço não encontrada');
}

/** Notas fiscais / orçamentos anexados — sem os bytes (só a lista). */
async function listarAnexos(usuario, id) {
  await ordemVisivel(usuario, id);
  return prisma.ordemServicoAnexo.findMany({
    where: { ordemServicoId: id },
    select: { id: true, tipo: true, nome: true, mimeType: true, criadoEm: true },
    orderBy: { criadoEm: 'asc' }
  });
}

async function adicionarAnexo(usuario, id, d) {
  await ordemVisivel(usuario, id);
  umDe(d.tipo, TIPOS_ANEXO, 'tipo');
  const { arquivo, mimeType } = lerAnexo(d.arquivo);
  return prisma.ordemServicoAnexo.create({
    data: {
      ordemServicoId: id,
      tipo: d.tipo,
      nome: String(obrigatorio(d.nome, 'nome')).trim(),
      mimeType,
      arquivo
    },
    select: { id: true, tipo: true, nome: true, mimeType: true, criadoEm: true }
  });
}

async function anexo(usuario, id, anexoId) {
  const a = await prisma.ordemServicoAnexo.findFirst({
    where: { id: anexoId, ordemServicoId: id, ordemServico: { condominioId: condominioDe(usuario) } },
    select: { nome: true, mimeType: true, arquivo: true }
  });
  if (!a) throw new HttpError(404, 'Anexo não encontrado');
  return a;
}

async function removerAnexo(usuario, id, anexoId) {
  await ordemVisivel(usuario, id);
  exigirAfetado(await prisma.ordemServicoAnexo.deleteMany({ where: { id: anexoId, ordemServicoId: id } }));
}

module.exports = { listar, criar, atualizar, remover, listarAnexos, adicionarAnexo, anexo, removerAnexo };
