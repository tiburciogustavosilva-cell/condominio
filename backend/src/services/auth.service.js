const bcrypt = require('bcryptjs');
const prisma = require('../models/prisma');
const HttpError = require('../utils/httpError');
const { obrigatorio, umDe } = require('../utils/validar');
const { gerarToken, EXPIRES_IN } = require('../utils/jwt');

function formatarUsuario(p) {
  return {
    id: p.id,
    nome: p.nome,
    email: p.email,
    papel: p.papel,
    cargo: p.cargo,
    unidadeId: p.unidadeId,
    condominioId: p.condominioId,
    administradoraId: p.administradoraId,
    tutorialVisto: p.tutorialVistoEm !== null
  };
}

async function sessaoDe(profile) {
  const condominio = profile.condominioId
    ? await prisma.condominio.findUnique({ where: { id: profile.condominioId } })
    : null;
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
    papel: tipo
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
  return emitirToken(profile);
}

async function trocarSenha(usuario, senhaAtual, novaSenha) {
  if (!(await bcrypt.compare(String(senhaAtual || ''), usuario.senhaHash))) {
    throw new HttpError(400, 'Senha atual incorreta');
  }
  validarSenha(novaSenha);
  await prisma.profile.update({ where: { id: usuario.id }, data: { senhaHash: await bcrypt.hash(novaSenha, 10) } });
}

module.exports = { login, cadastrar, trocarSenha, sessaoDe, validarSenha, normalizarEmail };
