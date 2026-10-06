const bcrypt = require('bcryptjs');
const prisma = require('../models/prisma');
const HttpError = require('../utils/httpError');
const { obrigatorio, umDe } = require('../utils/validar');
const { gerarToken, gerarTokenSenha, idDoTokenSenha, verificarTokenSenha, EXPIRES_IN } = require('../utils/jwt');
const { condominioComAcesso } = require('./planos.service');
const { enviarEmail } = require('../integrations/mailer');
const { emailComBotao } = require('../integrations/emailLayout');

const APP_URL = process.env.APP_URL || 'http://localhost:8080';

function formatarUsuario(p) {
  return {
    id: p.id,
    nome: p.nome,
    email: p.email,
    papel: p.papel,
    cargo: p.cargo,
    vinculo: p.vinculo,
    unidadeId: p.unidadeId,
    condominioId: p.condominioId,
    administradoraId: p.administradoraId,
    tutorialVisto: p.tutorialVistoEm !== null
  };
}

async function sessaoDe(profile) {
  const condominio = profile.condominioId ? await condominioComAcesso(profile.condominioId) : null;
  return { usuario: formatarUsuario(profile), condominio };
}

async function emitirToken(profile) {
  return { token: gerarToken(profile), tokenType: 'Bearer', expiresIn: EXPIRES_IN, ...(await sessaoDe(profile)) };
}

function validarSenha(senha) {
  if (!senha || String(senha).length < 6) throw new HttpError(400, 'Senha inválida (mínimo de 6 caracteres)');
}

const normalizarEmail = (email) => String(obrigatorio(email, 'email')).trim().toLowerCase();

async function login(email, senha) {
  const profile = await prisma.profile.findUnique({ where: { email: normalizarEmail(email) } });
  // Mesma mensagem para e-mail inexistente e senha errada (não revela quais e-mails existem).
  if (!profile || !(await bcrypt.compare(String(senha || ''), profile.senhaHash))) {
    throw new HttpError(401, 'E-mail ou senha inválidos');
  }
  if (!profile.emailConfirmadoEm) {
    await enviarConfirmacao(profile);
    throw new HttpError(403, 'Confirme seu e-mail para entrar. Enviamos um novo link.');
  }
  return emitirToken(profile);
}

function enviarConfirmacao(profile) {
  return enviarEmail({
    para: profile.email,
    assunto: 'Confirme seu e-mail — Áquila Condomínios',
    ...emailComBotao({
      etiqueta: 'Confirmação de cadastro',
      titulo: 'Confirme seu e-mail',
      nome: profile.nome,
      texto: 'Falta só um passo: confirme seu e-mail para ativar sua conta.',
      botao: 'Confirmar e-mail',
      link: `${APP_URL}/confirmar-email?token=${gerarTokenSenha(profile)}`,
      aviso: 'O link vale por 7 dias. Se você não fez este cadastro, ignore esta mensagem.'
    })
  });
}

/** Link do e-mail de cadastro: marca o e-mail como confirmado e já entra. */
async function confirmarEmail(token) {
  let profile;
  try {
    profile = await prisma.profile.findUnique({ where: { id: idDoTokenSenha(token) } });
    verificarTokenSenha(token, profile);
  } catch {
    throw new HttpError(400, 'Link inválido ou expirado. Tente entrar para receber um novo.');
  }
  if (!profile.emailConfirmadoEm) {
    profile = await prisma.profile.update({ where: { id: profile.id }, data: { emailConfirmadoEm: new Date() } });
  }
  return emitirToken(profile);
}

/** Síndico (+ 1 condomínio novo) ou administradora (+ a empresa, sem condomínio ainda). */
async function cadastrar(dados) {
  const tipo = umDe(dados.tipo, ['sindico', 'administradora'], 'tipo');
  const email = normalizarEmail(dados.email);
  validarSenha(dados.senha);
  const base = {
    nome: String(obrigatorio(dados.nome, 'nome')).trim(),
    email,
    senhaHash: await bcrypt.hash(dados.senha, 10),
    papel: tipo,
    emailConfirmadoEm: null
  };

  if (await prisma.profile.findUnique({ where: { email } })) {
    throw new HttpError(409, 'Já existe uma conta com esse e-mail');
  }

  // Escrita aninhada = uma transação só (o que o trigger handle_new_user fazia).
  const profile = await prisma.profile.create({
    data:
      tipo === 'administradora'
        ? {
            ...base,
            administradora: {
              create: { nome: obrigatorio(dados.administradoraNome, 'administradoraNome'), cnpj: dados.administradoraCnpj || '' }
            }
          }
        : {
            ...base,
            condominio: {
              create: {
                nome: obrigatorio(dados.condominioNome, 'condominioNome'),
                endereco: dados.condominioEndereco || '',
                cnpj: dados.condominioCnpj || ''
              }
            }
          }
  });
  await enviarConfirmacao(profile);
  return { precisaConfirmarEmail: true };
}

async function trocarSenha(usuario, senhaAtual, novaSenha) {
  if (!(await bcrypt.compare(String(senhaAtual || ''), usuario.senhaHash))) {
    throw new HttpError(400, 'Senha atual incorreta');
  }
  validarSenha(novaSenha);
  await prisma.profile.update({ where: { id: usuario.id }, data: { senhaHash: await bcrypt.hash(novaSenha, 10) } });
}

/** Link do convite (e-mail): a pessoa escolhe a senha e já entra logada. */
async function definirSenha(token, senha) {
  validarSenha(senha);
  let profile;
  try {
    profile = await prisma.profile.findUnique({ where: { id: idDoTokenSenha(token) } });
    verificarTokenSenha(token, profile);
  } catch {
    throw new HttpError(400, 'Link inválido ou expirado. Peça um novo ao suporte.');
  }
  profile = await prisma.profile.update({ where: { id: profile.id }, data: { senhaHash: await bcrypt.hash(senha, 10), emailConfirmadoEm: profile.emailConfirmadoEm ?? new Date() } });
  return emitirToken(profile);
}

module.exports = { login, cadastrar, confirmarEmail, definirSenha, trocarSenha, sessaoDe, validarSenha, normalizarEmail };
