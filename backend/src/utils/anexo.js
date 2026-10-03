const HttpError = require('./httpError');
const { obrigatorio } = require('./validar');

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// Confere a assinatura real do arquivo (não só a extensão/mimetype informado).
const TIPOS_MIME = {
  'application/pdf': (b) => b.toString('ascii', 0, 4) === '%PDF',
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8,
  'image/png': (b) => b.toString('hex', 0, 8) === '89504e470d0a1a0a',
  'image/webp': (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP'
};

/** Aceita data URL (data:<mime>;base64,<...>) com PDF, JPG, PNG ou WEBP. */
function lerAnexo(valor) {
  const str = String(obrigatorio(valor, 'arquivo'));
  const match = str.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new HttpError(400, 'Arquivo inválido');
  const [, mimeType, base64] = match;
  const assinaturaValida = TIPOS_MIME[mimeType];
  if (!assinaturaValida) throw new HttpError(400, 'Formato não aceito — envie PDF, JPG, PNG ou WEBP');
  const arquivo = Buffer.from(base64, 'base64');
  if (!assinaturaValida(arquivo)) throw new HttpError(400, 'O arquivo não corresponde ao formato informado');
  if (arquivo.length > MAX_BYTES) throw new HttpError(400, 'Arquivo muito grande (máx. 8 MB)');
  return { arquivo, mimeType };
}

module.exports = { lerAnexo };
