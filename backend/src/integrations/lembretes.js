const cron = require('node-cron');
const prisma = require('../models/prisma');
const { statusManutencao } = require('../utils/recorrencia');
const { enviarEmail } = require('./mailer');
const { esc, BRAND, layoutEmail } = require('./emailLayout');

const dia = (d) => d.toISOString().slice(0, 10);
const dataBR = (iso) => iso.split('-').reverse().join('/');

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

function linha(rotulo, valor) {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #E6E9F0;color:#5B6478;font-size:13px;width:42%;vertical-align:top">${rotulo}</td>
    <td style="padding:10px 0;border-bottom:1px solid #E6E9F0;color:#0B2545;font-size:14px;font-weight:600">${valor}</td>
  </tr>`;
}

function htmlEmail(condominio, prestador, m, proxima) {
  const cond = esc(condominio?.nome || 'Condomínio');
  return layoutEmail(
    `<tr><td style="padding:28px 28px 8px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle">
          <p style="margin:0 0 6px;color:#2F5BA8;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Manutenção a agendar</p>
          <h1 style="margin:0 0 12px;color:#0B2545;font-size:22px;line-height:1.3">${esc(m.titulo)}</h1>
          <p style="margin:0;color:#3A4358;font-size:15px;line-height:1.55">Olá, <strong>${esc(prestador.nome)}</strong>! O <strong>${cond}</strong> solicita o agendamento da manutenção abaixo.</p>
        </td>
        <td width="110" style="vertical-align:bottom;padding-left:12px">
          <img src="${BRAND}/mascote.png" width="110" alt="" style="display:block;border:0">
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:12px 28px 4px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${linha('Serviço', esc(m.titulo))}
        ${linha('Detalhes', esc(m.descricao || '-'))}
        ${linha('Última realização', dataBR(dia(m.ultimaManutencao)))}
        ${linha('Próxima prevista', `<span style="color:#B88E43">${dataBR(proxima)}</span>`)}
      </table>
    </td></tr>
    <tr><td style="padding:20px 28px 28px">
      <p style="margin:0;padding:14px 16px;background:#F4F6FB;border-left:4px solid #2F5BA8;border-radius:6px;color:#3A4358;font-size:14px;line-height:1.5">
        Por favor, entre em contato com a administração do condomínio para confirmar a data. Obrigado!
      </p>
    </td></tr>`,
    `Mensagem automática do sistema de gestão do ${cond}.<br>Enviado por Áquila Condomínios · não responda este e-mail.`
  );
}

/** Monta assunto, texto simples (fallback), HTML e imagens do lembrete. */
function emailLembrete(condominio, prestador, m, proxima) {
  return {
    assunto: `Manutenção a agendar: ${m.titulo}`,
    texto: corpoEmail(condominio, prestador, m, proxima),
    html: htmlEmail(condominio, prestador, m, proxima)
  };
}

/**
 * Varre as manutenções (de todos os condomínios) e dispara e-mail pra cada
 * prestador (pode ter mais de um) quando entra na janela de antecedência (ou
 * vence) e ainda não foi avisada neste ciclo. Com `forcarId`, envia imediatamente.
 */
async function processarLembretes({ forcarId = null } = {}) {
  const manutencoes = await prisma.manutencao.findMany({
    where: forcarId ? { id: forcarId } : { ativo: true },
    include: { prestadores: { include: { prestador: true } }, condominio: { select: { nome: true } } }
  });
  const enviados = [];

  for (const m of manutencoes) {
    const { proxima, status } = statusManutencao(m);
    if (!proxima) continue;
    if (!forcarId) {
      if (status !== 'vencida' && status !== 'proxima') continue;
      if (m.ultimoLembreteCiclo && dia(m.ultimoLembreteCiclo) === proxima) continue; // já avisado neste ciclo
    }
    const prestadoresComEmail = m.prestadores.map((p) => p.prestador).filter((p) => p?.email);
    if (!prestadoresComEmail.length) continue;

    const desteCiclo = [];
    for (const prestador of prestadoresComEmail) {
      try {
        const { simulado } = await enviarEmail({
          para: prestador.email,
          ...emailLembrete(m.condominio, prestador, m, proxima)
        });
        desteCiclo.push({ prestador: prestador.nome, para: prestador.email, simulado });
      } catch (e) {
        console.error(`Falha ao enviar lembrete da manutenção ${m.id} para ${prestador.email}:`, e.message);
      }
    }
    if (!desteCiclo.length) continue; // nenhum envio deu certo: tenta de novo no próximo ciclo

    await prisma.manutencao.update({
      where: { id: m.id },
      data: {
        ultimoLembreteCiclo: new Date(proxima),
        historico: {
          create: {
            tipo: 'lembrete',
            data: new Date(proxima),
            detalhe: `E-mail enviado para ${desteCiclo.map((e) => `${e.prestador}${e.simulado ? ' (simulado)' : ''}`).join(', ')}`,
            condominioId: m.condominioId
          }
        }
      }
    });
    for (const e of desteCiclo) enviados.push({ manutencaoId: m.id, prestador: e.prestador, para: e.para, proxima, simulado: e.simulado });
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

module.exports = { iniciarAgendador, processarLembretes, emailLembrete };
