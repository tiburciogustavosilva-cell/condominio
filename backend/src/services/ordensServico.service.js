const prisma = require('../models/prisma');
const HttpError = require('../utils/httpError');
const { condominioDe, exigirAfetado } = require('../utils/acesso');
const { obrigatorio, umDe, paraData, parcial } = require('../utils/validar');

const TIPOS = ['preventiva', 'corretiva', 'preditiva'];
const PRIORIDADES = ['baixa', 'media', 'alta', 'critica'];
const STATUS = ['programada', 'em_andamento', 'concluida', 'atrasada', 'cancelada'];
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

module.exports = { listar, criar, atualizar, remover };
