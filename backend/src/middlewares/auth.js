const prisma = require('../models/prisma');
const { verificarToken } = require('../utils/jwt');
const { isSindico, isEquipe } = require('../utils/acesso');
const { condominioComAcesso } = require('../services/planos.service');

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
  usuario.condominio = usuario.condominioId ? await condominioComAcesso(usuario.condominioId) : null;
  req.usuario = usuario;
  req.suporte = payload.suporte; // id do admin, quando é ele acessando como este usuário
  next();
}

// Condomínio travado pelo admin da plataforma (ex.: mensalidade atrasada). Suporte entra mesmo assim.
function exigirLiberado(req, res, next) {
  const motivo = req.usuario.condominio?.bloqueadoMotivo;
  if (motivo && !req.suporte) return res.status(423).json({ erro: `Acesso suspenso: ${motivo}` });
  next();
}

// Dono da plataforma: gerencia todos os condomínios.
function apenasAdmin(req, res, next) {
  if (req.usuario.papel !== 'admin') return res.status(403).json({ erro: 'Acesso restrito ao administrador' });
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

// Equipe interna do prédio: síndico/administradora e funcionários (condômino não).
function apenasStaff(req, res, next) {
  if (!isSindico(req.usuario) && req.usuario.papel !== 'funcionario') {
    return res.status(403).json({ erro: 'Acesso restrito à equipe do condomínio' });
  }
  next();
}

// Funcionário só usa perfil, avisos, encomendas, tarefas e a lista de unidades.
function semFuncionario(req, res, next) {
  if (req.usuario.papel === 'funcionario') return res.status(403).json({ erro: 'Acesso não permitido' });
  next();
}

// Módulo que não está no plano (e o teste acabou): 403. Suporte (admin da plataforma) passa.
function exigirRecurso(recurso) {
  return (req, res, next) => {
    const recursos = req.usuario.condominio?.acesso?.recursos ?? [];
    if (req.suporte || recursos.includes(recurso)) return next();
    res.status(403).json({ erro: 'Este módulo não está no plano do condomínio' });
  };
}

module.exports = { autenticar, exigirLiberado, exigirRecurso, apenasAdmin, apenasSindico, apenasEquipe, apenasStaff, semFuncionario };
