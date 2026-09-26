const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!SECRET) throw new Error('JWT_SECRET não definido no .env');

function gerarToken(profile) {
  return jwt.sign({ sub: profile.id, papel: profile.papel }, SECRET, { expiresIn: EXPIRES_IN });
}

function verificarToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { gerarToken, verificarToken, EXPIRES_IN };
