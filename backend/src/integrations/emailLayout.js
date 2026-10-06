// Campos vêm do cadastro (texto livre): escapa antes de pôr no HTML.
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Imagens por URL pública: embutidas (cid) o Gmail lista como anexo.
const BRAND = 'https://app.aquilacondominios.com.br/brand';

/** Moldura Áquila (topo navy + faixa dourada + rodapé). `conteudo` são <tr> já montados. */
function layoutEmail(conteudo, rodape) {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#EEF0F5;font-family:Segoe UI,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF0F5;padding:24px 12px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:14px;overflow:hidden">
    <tr><td align="center" style="background:#0B2545;padding:24px 24px 18px">
      <img src="${BRAND}/emblema.png" width="90" alt="Áquila Condomínios" style="display:block;border:0;background:#FFFFFF;border-radius:10px;padding:8px">
      <p style="margin:12px 0 0;color:#FFFFFF;font-size:18px;font-weight:700;letter-spacing:2px">ÁQUILA</p>
      <p style="margin:2px 0 0;color:#C9A45C;font-size:11px;letter-spacing:3px">CONDOMÍNIOS</p>
    </td></tr>
    <tr><td style="height:4px;background:#C9A45C;line-height:4px;font-size:0">&nbsp;</td></tr>
    ${conteudo}
    <tr><td align="center" style="padding:16px 24px;background:#F4F6FB;color:#8A93A6;font-size:12px;line-height:1.5">
      ${rodape}
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

/** E-mail curto com um botão (confirmação de e-mail, convite de senha). */
function emailComBotao({ etiqueta, titulo, nome, texto, botao, link, aviso }) {
  const html = layoutEmail(
    `<tr><td style="padding:28px 28px 8px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle">
          <p style="margin:0 0 6px;color:#2F5BA8;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">${esc(etiqueta)}</p>
          <h1 style="margin:0 0 12px;color:#0B2545;font-size:22px;line-height:1.3">${esc(titulo)}</h1>
          <p style="margin:0;color:#3A4358;font-size:15px;line-height:1.55">Olá, <strong>${esc(nome)}</strong>! ${esc(texto)}</p>
        </td>
        <td width="110" style="vertical-align:bottom;padding-left:12px">
          <img src="${BRAND}/mascote.png" width="110" alt="" style="display:block;border:0">
        </td>
      </tr></table>
    </td></tr>
    <tr><td align="center" style="padding:20px 28px 8px">
      <a href="${esc(link)}" style="display:inline-block;padding:14px 28px;background:#C9A45C;color:#0B2545;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px">${esc(botao)}</a>
    </td></tr>
    <tr><td style="padding:12px 28px 28px">
      <p style="margin:0;padding:14px 16px;background:#F4F6FB;border-left:4px solid #2F5BA8;border-radius:6px;color:#3A4358;font-size:13px;line-height:1.5">
        ${esc(aviso)}<br>Se o botão não funcionar, copie e cole no navegador:<br><span style="word-break:break-all;color:#2F5BA8">${esc(link)}</span>
      </p>
    </td></tr>`,
    'Mensagem automática da Áquila Condomínios · não responda este e-mail.'
  );
  return { html, texto: `Olá, ${nome}!\n\n${texto}\n\n${link}\n\n${aviso}` };
}

module.exports = { esc, BRAND, layoutEmail, emailComBotao };
