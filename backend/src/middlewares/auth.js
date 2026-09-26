const prisma = require('../models/prisma');
const { verificarToken } = require('../utils/jwt');
const { isSindico, isEquipe } = require('../utils/acesso');

async function autenticar(req, res, next) {
  const [esquema, token] = (req.headers.authorization || '').split(' ');
  if (esquema !== 'Bearer' || !token) return res.status(401).json({ erro: 'Token não fornecido' });

  let payload;
  try {
    payload = verificarToken(token);
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  // Busca no banco a cada request: o condomínio ativo da administradora pode ter mudado.
  const usuario = await prisma.profile.findUnique({ where: { id: payload.sub } });
  if (!usuario) return res.status(401).json({ erro: 'Usuário não encontrado' });
  req.usuario = usuario;
  next();
}

function apenasSindico(req, res, next) {
  if (!isSindico(req.usuario)) return res.status(403).json({ erro: 'Acesso restrito ao síndico' });
  next();
}

function apenasEquipe(req, res, next) {
  if (!isEquipe(req.usuario)) return res.status(403).json({ erro: 'Acesso restrito à portaria' });
  next();
}

// Funcionário só usa perfil, avisos, encomendas e a lista de unidades.
function semFuncionario(req, res, next) {
  if (req.usuario.papel === 'funcionario') return res.status(403).json({ erro: 'Acesso não permitido' });
  next();
}

module.exports = { autenticar, apenasSindico, apenasEquipe, semFuncionario };
