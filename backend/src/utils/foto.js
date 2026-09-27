const HttpError = require('./httpError');
const { obrigatorio } = require('./validar');

const FOTO_MAX_BYTES = 2 * 1024 * 1024;

/** Aceita data URL ou base64 puro; exige WebP de verdade (assinatura RIFF....WEBP). */
function lerFotoWebp(valor) {
  const buf = Buffer.from(String(obrigatorio(valor, 'foto')).replace(/^data:[^,]*,/, ''), 'base64');
  if (buf.length < 12 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') {
    throw new HttpError(400, 'A foto precisa estar em formato .webp');
  }
  if (buf.length > FOTO_MAX_BYTES) throw new HttpError(400, 'Foto muito grande (máx. 2 MB)');
  return buf;
}

module.exports = { lerFotoWebp };
