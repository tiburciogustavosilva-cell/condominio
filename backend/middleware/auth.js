const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ erro: 'Token não fornecido' });

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'segredo_dev');
    req.usuario = payload;
    next();
  } catch (e) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

function apenasSindico(req, res, next) {
  if (req.usuario.papel !== 'sindico') {
    return res.status(403).json({ erro: 'Acesso restrito ao síndico' });
  }
  next();
}

module.exports = { autenticar, apenasSindico };
