const prisma = require('../models/prisma');
const HttpError = require('../utils/httpError');
const { condominioDe, exigirAfetado } = require('../utils/acesso');
const { obrigatorio, umDe, paraData, numeroOuNull, parcial } = require('../utils/validar');
const { statusManutencao, UNIDADES } = require('../utils/recorrencia');
const { processarLembretes } = require('../integrations/lembretes');
const { emailSimulado } = require('../integrations/mailer');

const vazioParaNull = (v) => v || null;

const CAMPOS = {
  prestadorId: null,
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
      prestador: { select: { nome: true, email: true } },
      equipamento: { select: { nome: true } },
      historico: { select: { tipo: true, data: true, em: true, detalhe: true }, orderBy: { em: 'asc' } }
    }
  });
  return manutencoes
    .map(({ prestador, equipamento, ...m }) => {
      const { proxima, dias, status } = statusManutencao(m);
      return {
        ...m,
        prestadorNome: prestador?.nome ?? '—',
        prestadorEmail: prestador?.email ?? '',
        ativoNome: equipamento?.nome ?? '',
        proximaManutencao: proxima,
        diasParaProxima: dias,
        status
      };
    })
    .sort((a, b) => (a.proximaManutencao ?? '').localeCompare(b.proximaManutencao ?? ''));
}

// Prestador e ativo precisam ser do mesmo condomínio.
async function validarVinculos(condominioId, { prestadorId, ativoId }) {
  if (prestadorId && !(await prisma.prestador.findFirst({ where: { id: prestadorId, condominioId } }))) {
    throw new HttpError(400, 'Prestador inválido');
  }
  if (ativoId && !(await prisma.ativo.findFirst({ where: { id: ativoId, condominioId } }))) {
    throw new HttpError(400, 'Ativo inválido');
  }
}

async function criar(usuario, d) {
  const condominioId = condominioDe(usuario);
  obrigatorio(d.prestadorId, 'prestadorId');
  obrigatorio(d.titulo, 'titulo');
  obrigatorio(d.ultimaManutencao, 'ultimaManutencao');
  obrigatorio(d.frequenciaUnidade, 'frequenciaUnidade');
  const data = parcial(d, CAMPOS);
  await validarVinculos(condominioId, data);
  return prisma.manutencao.create({ data: { ...data, condominioId } });
}

async function atualizar(usuario, id, d) {
  const condominioId = condominioDe(usuario);
  const data = parcial(d, CAMPOS);
  await validarVinculos(condominioId, data);
  exigirAfetado(await prisma.manutencao.updateMany({ where: { id, condominioId }, data }));
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

/** Envia o lembrete por e-mail agora, fora do agendamento. */
async function notificar(usuario, id) {
  const condominioId = condominioDe(usuario);
  if (!(await prisma.manutencao.findFirst({ where: { id, condominioId } }))) {
    throw new HttpError(404, 'Registro não encontrado');
  }
  const [enviado] = await processarLembretes({ forcarId: id });
  if (!enviado) throw new HttpError(400, 'Não foi possível enviar (prestador sem e-mail?)');
  return enviado;
}

const config = () => ({ emailSimulado });

module.exports = { listar, criar, atualizar, remover, concluir, notificar, config };
