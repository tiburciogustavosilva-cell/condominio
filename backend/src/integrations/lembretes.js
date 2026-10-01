const path = require('path');
const cron = require('node-cron');
const prisma = require('../models/prisma');
const { statusManutencao } = require('../utils/recorrencia');
const { enviarEmail } = require('./mailer');

const dia = (d) => d.toISOString().slice(0, 10);
const dataBR = (iso) => iso.split('-').reverse().join('/');

// Campos vêm do cadastro (texto livre): escapa antes de pôr no HTML.
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Imagens embutidas no e-mail (cid), não dependem do site estar no ar.
const ASSETS = path.join(__dirname, 'email-assets');
const IMAGENS = [
  { filename: 'emblema.png', path: path.join(ASSETS, 'emblema.png'), cid: 'emblema' },
  { filename: 'mascote.png', path: path.join(ASSETS, 'mascote.png'), cid: 'mascote' }
];

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
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#EEF0F5;font-family:Segoe UI,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF0F5;padding:24px 12px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:14px;overflow:hidden">
    <tr><td align="center" style="background:#0B2545;padding:24px 24px 18px">
      <img src="cid:emblema" width="90" alt="Áquila Condomínios" style="display:block;border:0;background:#FFFFFF;border-radius:10px;padding:8px">
      <p style="margin:12px 0 0;color:#FFFFFF;font-size:18px;font-weight:700;letter-spacing:2px">ÁQUILA</p>
      <p style="margin:2px 0 0;color:#C9A45C;font-size:11px;letter-spacing:3px">CONDOMÍNIOS</p>
    </td></tr>
    <tr><td style="height:4px;background:#C9A45C;line-height:4px;font-size:0">&nbsp;</td></tr>
    <tr><td style="padding:28px 28px 8px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle">
          <p style="margin:0 0 6px;color:#2F5BA8;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Manutenção a agendar</p>
          <h1 style="margin:0 0 12px;color:#0B2545;font-size:22px;line-height:1.3">${esc(m.titulo)}</h1>
          <p style="margin:0;color:#3A4358;font-size:15px;line-height:1.55">Olá, <strong>${esc(prestador.nome)}</strong>! O <strong>${cond}</strong> solicita o agendamento da manutenção abaixo.</p>
        </td>
        <td width="110" style="vertical-align:bottom;padding-left:12px">
          <img src="cid:mascote" width="110" alt="" style="display:block;border:0">
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
    </td></tr>
    <tr><td align="center" style="padding:16px 24px;background:#F4F6FB;color:#8A93A6;font-size:12px;line-height:1.5">
      Mensagem automática do sistema de gestão do ${cond}.<br>Enviado por Áquila Condomínios · não responda este e-mail.
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

/** Monta assunto, texto simples (fallback), HTML e imagens do lembrete. */
function emailLembrete(condominio, prestador, m, proxima) {
  return {
    assunto: `Manutenção a agendar: ${m.titulo}`,
    texto: corpoEmail(condominio, prestador, m, proxima),
    html: htmlEmail(condominio, prestador, m, proxima),
    attachments: IMAGENS
  };
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
        ...emailLembrete(m.condominio, m.prestador, m, proxima)
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

module.exports = { iniciarAgendador, processarLembretes, emailLembrete };
