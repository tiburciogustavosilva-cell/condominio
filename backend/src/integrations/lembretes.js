const cron = require('node-cron');
const prisma = require('../models/prisma');
const { statusManutencao } = require('../utils/recorrencia');
const { enviarEmail } = require('./mailer');

const dia = (d) => d.toISOString().slice(0, 10);

function corpoEmail(condominio, prestador, m, proxima) {
  const cond = condominio?.nome || 'Condomínio';
  return (
    `Olá, ${prestador.nome}.\n\n` +
    `O ${cond} solicita o agendamento da seguinte manutenção:\n\n` +
    `• Serviço: ${m.titulo}\n` +
    `• Detalhes: ${m.descricao || '-'}\n` +
    `• Última realização: ${dia(m.ultimaManutencao)}\n` +
    `• Data prevista para a próxima: ${proxima}\n\n` +
    `Por favor, entre em contato para confirmar a data. Obrigado.\n\n` +
    `-- Mensagem automática do sistema de gestão do ${cond}.`
  );
}

/**
 * Varre as manutenções (de todos os condomínios) e dispara e-mail para o
 * prestador quando entra na janela de antecedência (ou vence) e ainda não foi
 * avisada neste ciclo. Com `forcarId`, envia imediatamente aquela manutenção.
 */
async function processarLembretes({ forcarId = null } = {}) {
  const manutencoes = await prisma.manutencao.findMany({
    where: forcarId ? { id: forcarId } : { ativo: true },
    include: { prestador: true, condominio: { select: { nome: true } } }
  });
  const enviados = [];

  for (const m of manutencoes) {
    const { proxima, status } = statusManutencao(m);
    if (!proxima) continue;
    if (!forcarId) {
      if (status !== 'vencida' && status !== 'proxima') continue;
      if (m.ultimoLembreteCiclo && dia(m.ultimoLembreteCiclo) === proxima) continue; // já avisado neste ciclo
    }
    if (!m.prestador?.email) continue;

    try {
      const { simulado } = await enviarEmail({
        para: m.prestador.email,
        assunto: `Manutenção a agendar: ${m.titulo}`,
        texto: corpoEmail(m.condominio, m.prestador, m, proxima)
      });
      await prisma.manutencao.update({
        where: { id: m.id },
        data: {
          ultimoLembreteCiclo: new Date(proxima),
          historico: {
            create: {
              tipo: 'lembrete',
              data: new Date(proxima),
              detalhe: `E-mail ${simulado ? '(simulado) ' : ''}enviado para ${m.prestador.email}`,
              condominioId: m.condominioId
            }
          }
        }
      });
      enviados.push({ manutencaoId: m.id, prestador: m.prestador.nome, para: m.prestador.email, proxima, simulado });
    } catch (e) {
      console.error(`Falha ao enviar lembrete da manutenção ${m.id}:`, e.message);
    }
  }

  return enviados;
}

function rodar(rotulo) {
  processarLembretes()
    .then((n) => n.length && console.log(`${n.length} lembrete(s) de manutenção enviado(s) ${rotulo}.`))
    .catch((e) => console.error(`Erro nos lembretes ${rotulo}:`, e.message));
}

function iniciarAgendador() {
  setTimeout(() => rodar('na inicialização'), 4000); // pega o que já está vencido
  cron.schedule('0 8 * * *', () => rodar('(diário)'));
  console.log('Agendador de lembretes de manutenção ativo (diário às 08:00).');
}

module.exports = { iniciarAgendador, processarLembretes };
