const HttpError = require('../utils/httpError');

const PRISMA = {
  P2002: [409, 'Registro duplicado'],
  P2003: [409, 'Há registros vinculados a este item'],
  P2023: [400, 'ID inválido'],
  P2025: [404, 'Registro não encontrado']
};

// eslint-disable-next-line no-unused-vars
function tratarErro(err, req, res, next) {
  if (err instanceof HttpError) return res.status(err.status).json({ erro: err.message });
  if (PRISMA[err.code]) {
    const [status, erro] = PRISMA[err.code];
    return res.status(status).json({ erro });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido' });
  console.error(err);
  res.status(500).json({ erro: 'Erro interno no servidor' });
}

module.exports = tratarErro;
