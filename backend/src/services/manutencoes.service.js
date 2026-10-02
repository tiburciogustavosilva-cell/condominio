const prisma = require('../models/prisma');
const HttpError = require('../utils/httpError');
const { condominioDe, exigirAfetado } = require('../utils/acesso');
const { obrigatorio, umDe, paraData, numeroOuNull, parcial } = require('../utils/validar');
const { statusManutencao, UNIDADES } = require('../utils/recorrencia');
const { processarLembretes } = require('../integrations/lembretes');
const { emailSimulado } = require('../integrations/mailer');

const vazioParaNull = (v) => v || null;

const CAMPOS = {
  ativoId: vazioParaNull,
  titulo: null,
  descricao: null,
  ultimaManutencao: paraData,
  frequenciaUnidade: (v) => umDe(v, UNIDADES, 'frequenciaUnidade'),
  frequenciaIntervalo: (v) => Math.max(1, Number(v) || 1),
  diasAntecedencia: (v) => Number(v) || 0,
  ativo: Boolean,
  tipo: (v) => umDe(v, ['preventiva', 'corretiva', 'preditiva'], 'tipo'),
  prioridade: (v) => umDe(v, ['baixa', 'media', 'alta', 'critica'], 'prioridade'),
  statusManual: (v) => umDe(v, ['programada', 'em_andamento', 'concluida', 'atrasada', 'cancelada'], 'statusManual'),
  custoPrevisto: numeroOuNull,
  numeroOs: vazioParaNull
};

async function listar(usuario) {
  const manutencoes = await prisma.manutencao.findMany({
    where: { condominioId: condominioDe(usuario) },
    include: {
      prestadores: { select: { prestador: { select: { id: true, nome: true, email: true } } } },
      equipamento: { select: { nome: true } },
      historico: { select: { tipo: true, data: true, em: true, detalhe: true }, orderBy: { em: 'asc' } }
    }
  });
  return manutencoes
    .map(({ prestadores, equipamento, ...m }) => {
      const { proxima, dias, status } = statusManutencao(m);
      const lista = prestadores.map((p) => p.prestador);
      return {
        ...m,
        prestadores: lista,
        prestadorNome: lista.map((p) => p.nome).join(', ') || '—',
        ativoNome: equipamento?.nome ?? '',
        proximaManutencao: proxima,
        diasParaProxima: dias,
        status
      };
    })
    .sort((a, b) => (a.proximaManutencao ?? '').localeCompare(b.proximaManutencao ?? ''));
}

/** Pelo menos um prestador (um plano de manutenção pode ter mais de um responsável). */
function prestadorIdsDe(d) {
  const ids = [...new Set((Array.isArray(d.prestadorIds) ? d.prestadorIds : []).map(String).filter(Boolean))];
  if (ids.length === 0) throw new HttpError(400, 'Selecione pelo menos um prestador');
  return ids;
}

// Prestadores e ativo precisam ser do mesmo condomínio.
async function validarVinculos(condominioId, { ativoId }, prestadorIds) {
  const totalValidos = await prisma.prestador.count({ where: { id: { in: prestadorIds }, condominioId } });
  if (totalValidos !== prestadorIds.length) throw new HttpError(400, 'Prestador inválido');
  if (ativoId && !(await prisma.ativo.findFirst({ where: { id: ativoId, condominioId } }))) {
    throw new HttpError(400, 'Ativo inválido');
  }
}

async function criar(usuario, d) {
  const condominioId = condominioDe(usuario);
  obrigatorio(d.titulo, 'titulo');
  obrigatorio(d.ultimaManutencao, 'ultimaManutencao');
  obrigatorio(d.frequenciaUnidade, 'frequenciaUnidade');
  const prestadorIds = prestadorIdsDe(d);
  const data = parcial(d, CAMPOS);
  await validarVinculos(condominioId, data, prestadorIds);
  return prisma.manutencao.create({
    data: { ...data, condominioId, prestadores: { create: prestadorIds.map((prestadorId) => ({ prestadorId })) } }
  });
}

async function atualizar(usuario, id, d) {
  const condominioId = condominioDe(usuario);
  const prestadorIds = prestadorIdsDe(d);
  const data = parcial(d, CAMPOS);
  await validarVinculos(condominioId, data, prestadorIds);
  await prisma.$transaction(async (tx) => {
    exigirAfetado(await tx.manutencao.updateMany({ where: { id, condominioId }, data }));
    await tx.manutencaoPrestador.deleteMany({ where: { manutencaoId: id } });
    await tx.manutencaoPrestador.createMany({ data: prestadorIds.map((prestadorId) => ({ manutencaoId: id, prestadorId })) });
  });
}

async function remover(usuario, id) {
  exigirAfetado(await prisma.manutencao.deleteMany({ where: { id, condominioId: condominioDe(usuario) } }));
}

/** Registra a manutenção como feita (hoje ou `data`) — reinicia o ciclo de lembretes. */
async function concluir(usuario, id, data) {
  const condominioId = condominioDe(usuario);
  const dia = paraData(data || new Date().toISOString());
  await prisma.$transaction(async (tx) => {
    exigirAfetado(await tx.manutencao.updateMany({ where: { id, condominioId }, data: { ultimaManutencao: dia } }));
    await tx.manutencaoHistorico.create({
      data: { manutencaoId: id, tipo: 'realizada', data: dia, detalhe: `Registrada por ${usuario.nome}`, condominioId }
    });
  });
}

/** Envia o lembrete por e-mail agora (a todos os prestadores com e-mail), fora do agendamento. */
async function notificar(usuario, id) {
  const condominioId = condominioDe(usuario);
  if (!(await prisma.manutencao.findFirst({ where: { id, condominioId } }))) {
    throw new HttpError(404, 'Registro não encontrado');
  }
  const enviados = await processarLembretes({ forcarId: id });
  if (!enviados.length) throw new HttpError(400, 'Não foi possível enviar (nenhum prestador com e-mail?)');
  return { para: enviados.map((e) => e.para), simulado: enviados.some((e) => e.simulado) };
}

const config = () => ({ emailSimulado });

module.exports = { listar, criar, atualizar, remover, concluir, notificar, config };
