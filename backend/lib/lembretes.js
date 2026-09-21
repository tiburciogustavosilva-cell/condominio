const cron = require('node-cron');
const { readDB, writeDB } = require('../db');
const { statusManutencao } = require('./recorrencia');
const { enviarEmail } = require('./mailer');

function corpoEmail(db, prestador, m, proxima) {
  const cond = (db.condominio && db.condominio.nome) || 'Condomínio';
  return (
    `Olá, ${prestador.nome}.\n\n` +
    `O ${cond} solicita o agendamento da seguinte manutenção:\n\n` +
    `• Serviço: ${m.titulo}\n` +
    `• Detalhes: ${m.descricao || '-'}\n` +
    `• Última realização: ${m.ultimaManutencao}\n` +
    `• Data prevista para a próxima: ${proxima}\n\n` +
    `Por favor, entre em contato para confirmar a data. Obrigado.\n\n` +
    `-- Mensagem automática do sistema de gestão do ${cond}.`
  );
}

/**
 * Varre as manutenções e dispara e-mail para o prestador quando a manutenção
 * entra na janela de antecedência (ou está vencida) e ainda não foi avisada
 * neste ciclo. Com `forcarId`, envia imediatamente aquela manutenção.
 */
async function processarLembretes({ forcarId = null } = {}) {
  const db = readDB();
  const hoje = new Date().toISOString().slice(0, 10);
  const enviados = [];

  for (const m of db.manutencoes) {
    if (forcarId && m.id !== forcarId) continue;
    if (!forcarId && !m.ativo) continue;

    const { proxima, status } = statusManutencao(m, hoje);
    if (!proxima) continue;

    const precisaAvisar = forcarId ? true : status === 'vencida' || status === 'proxima';
    if (!precisaAvisar) continue;
    if (!forcarId && m.ultimoLembreteCiclo === proxima) continue; // já avisado neste ciclo

    const prestador = db.prestadores.find((p) => p.id === m.prestadorId);
    if (!prestador || !prestador.email) continue;

    try {
      const { simulado } = await enviarEmail({
        para: prestador.email,
        assunto: `Manutenção a agendar: ${m.titulo}`,
        texto: corpoEmail(db, prestador, m, proxima)
      });
      m.ultimoLembreteCiclo = proxima;
      m.historico = m.historico || [];
      m.historico.push({
        tipo: 'lembrete',
        data: proxima,
        em: new Date().toISOString(),
        detalhe: `E-mail ${simulado ? '(simulado) ' : ''}enviado para ${prestador.email}`
      });
      enviados.push({ manutencaoId: m.id, prestador: prestador.nome, para: prestador.email, proxima, simulado });
    } catch (e) {
      console.error(`Falha ao enviar lembrete da manutenção ${m.id}:`, e.message);
    }
  }

  if (enviados.length) writeDB(db);
  return enviados;
}

function iniciarAgendador() {
  // Varredura logo após subir o servidor (pega o que já está vencido).
  setTimeout(() => {
    processarLembretes()
      .then((n) => n.length && console.log(`${n.length} lembrete(s) de manutenção enviado(s) na inicialização.`))
      .catch((e) => console.error('Erro na varredura inicial de lembretes:', e.message));
  }, 4000);

  // Todo dia às 08:00.
  cron.schedule('0 8 * * *', () => {
    processarLembretes()
      .then((n) => n.length && console.log(`${n.length} lembrete(s) de manutenção enviado(s).`))
      .catch((e) => console.error('Erro no agendador de lembretes:', e.message));
  });

  console.log('Agendador de lembretes de manutenção ativo (diário às 08:00).');
}

module.exports = { iniciarAgendador, processarLembretes };
