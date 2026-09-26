const nodemailer = require('nodemailer');

// Se houver SMTP configurado no .env, envia de verdade.
// Caso contrário, usa o transporte "jsonTransport": o e-mail não sai,
// apenas é registrado no console (modo simulado, bom para desenvolvimento).
const temSMTP = Boolean(process.env.SMTP_HOST);

function criarTransporte() {
  if (temSMTP) {
    const porta = Number(process.env.SMTP_PORT) || 587;
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: porta,
      secure: porta === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined
    });
  }
  return nodemailer.createTransport({ jsonTransport: true });
}

const transporte = criarTransporte();
const emailSimulado = !temSMTP;

async function enviarEmail({ para, assunto, texto, html }) {
  const from = process.env.MAIL_FROM || 'Condomínio <nao-responder@condominio.local>';
  const info = await transporte.sendMail({ from, to: para, subject: assunto, text: texto, html });
  if (emailSimulado) {
    console.log(
      `\n───────── E-MAIL (SIMULADO) ─────────\n` +
        `Para: ${para}\nAssunto: ${assunto}\n\n${texto}\n` +
        `────────────────────────────────────\n`
    );
  } else {
    console.log(`E-mail enviado para ${para} (id ${info.messageId})`);
  }
  return { simulado: emailSimulado, id: info.messageId };
}

module.exports = { enviarEmail, emailSimulado };
