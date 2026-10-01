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

// Admin da plataforma "acessando como" o usuário (suporte). Curto de propósito.
// ponytail: não revalida o admin a cada request — rebaixado, o token ainda vale até expirar (2h).
function gerarTokenSuporte(profile, adminId) {
  return jwt.sign({ sub: profile.id, papel: profile.papel, suporte: adminId }, SECRET, { expiresIn: '2h' });
}

// Link de definir senha (convite): assinado com a hash atual da senha, então vale
// uma vez só — trocou a senha, o link morre. Não serve como token de sessão.
const segredoSenha = (profile) => SECRET + profile.senhaHash;

function gerarTokenSenha(profile) {
  return jwt.sign({ sub: profile.id }, segredoSenha(profile), { expiresIn: '7d' });
}

/** Quem é o dono do link (sem validar ainda — a chave depende da senha dele). */
const idDoTokenSenha = (token) => jwt.decode(String(token))?.sub;

function verificarTokenSenha(token, profile) {
  return jwt.verify(token, segredoSenha(profile));
}

module.exports = { gerarToken, verificarToken, gerarTokenSuporte, gerarTokenSenha, idDoTokenSenha, verificarTokenSenha, EXPIRES_IN };
