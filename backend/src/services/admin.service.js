const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../models/prisma');
const HttpError = require('../utils/httpError');
const { obrigatorio, parcial, paraData, umDe } = require('../utils/validar');
const { validarSenha, normalizarEmail, sessaoDe } = require('./auth.service');
const { gerarTokenSenha, gerarTokenSuporte } = require('../utils/jwt');
const { rotuloUnidade } = require('../utils/unidade');
const { PLANOS } = require('../utils/planos');
const { enviarEmail } = require('../integrations/mailer');
const { emailComBotao } = require('../integrations/emailLayout');

const APP_URL = process.env.APP_URL || 'http://localhost:8080';

const SELECT = {
  id: true,
  nome: true,
  endereco: true,
  cnpj: true,
  bloqueadoMotivo: true,
  criadoEm: true,
  administradora: { select: { nome: true } },
  // assinatura vigente
  pagamentos: { orderBy: { validoAte: 'desc' }, take: 1, select: { valor: true, pagoEm: true, validoAte: true } },
  _count: { select: { unidades: true, profiles: true } }
};

function listar() {
  return prisma.condominio.findMany({ select: SELECT, orderBy: { nome: 'asc' } });
}

function enviarConvite(profile, condominio) {
  return enviarEmail({
    para: profile.email,
    assunto: `Seu acesso ao ${condominio.nome}`,
    ...emailComBotao({
      etiqueta: 'Convite de acesso',
      titulo: condominio.nome,
      nome: profile.nome,
      texto: `Você é síndico do ${condominio.nome} no sistema. Crie sua senha para entrar.`,
      botao: 'Criar minha senha',
      link: `${APP_URL}/definir-senha?token=${gerarTokenSenha(profile)}`,
      aviso: 'O link vale por 7 dias e só pode ser usado uma vez.'
    })
  });
}

async function enviarConviteOuAvisar(profile, condominio) {
  try {
    await enviarConvite(profile, condominio);
  } catch (err) {
    console.error(err);
    throw new HttpError(502, `Não foi possível enviar o e-mail para ${profile.email}. Tente "Enviar link de senha".`);
  }
}

/** Condomínio novo + o síndico que vai entrar nele (perguntas de onboarding ficam com o síndico).
 * Sem sindicoSenha, o síndico recebe por e-mail o link pra criar a própria senha. */
async function criar(d) {
  const email = normalizarEmail(d.sindicoEmail);
  const convite = !d.sindicoSenha;
  if (!convite) validarSenha(d.sindicoSenha);
  if (await prisma.profile.findUnique({ where: { email } })) {
    throw new HttpError(409, 'Já existe uma conta com esse e-mail');
  }
  const condominio = await prisma.condominio.create({
    select: SELECT,
    data: {
      nome: String(obrigatorio(d.nome, 'nome')).trim(),
      endereco: d.endereco || '',
      cnpj: d.cnpj || '',
      plano: d.plano ? umDe(d.plano, Object.keys(PLANOS), 'plano') : undefined,
      profiles: {
        create: {
          nome: String(obrigatorio(d.sindicoNome, 'sindicoNome')).trim(),
          email,
          // convite: senha aleatória que ninguém sabe, até o síndico definir a dele pelo link
          senhaHash: await bcrypt.hash(convite ? crypto.randomBytes(32).toString('hex') : d.sindicoSenha, 10),
          papel: 'sindico'
        }
      }
    }
  });
  if (convite) await enviarConviteOuAvisar(await prisma.profile.findUnique({ where: { email } }), condominio);
  return condominio;
}

/** Manda (de novo) o link de criar senha pros síndicos do condomínio — serve também pra quem esqueceu a senha. */
async function reenviarConvite(id) {
  const condominio = await prisma.condominio.findUniqueOrThrow({ where: { id } });
  const sindicos = await prisma.profile.findMany({ where: { condominioId: id, papel: 'sindico' } });
  if (!sindicos.length) throw new HttpError(404, 'Este condomínio não tem síndico cadastrado');
  for (const s of sindicos) await enviarConviteOuAvisar(s, condominio);
  return { enviadosPara: sindicos.map((s) => s.email) };
}

/** Edita dados e trava/destrava: bloqueadoMotivo com texto = bloqueado, vazio/null = liberado. */
function atualizar(id, d) {
  const data = parcial(d, {
    nome: (v) => String(obrigatorio(v, 'nome')).trim(),
    endereco: (v) => String(v ?? '').trim(),
    cnpj: (v) => String(v ?? '').trim(),
    bloqueadoMotivo: (v) => (v && String(v).trim()) || null
  });
  return prisma.condominio.update({ where: { id }, data, select: SELECT });
}

/** Quem usa o condomínio — o admin escolhe como quem entrar pra dar suporte. */
async function usuariosDo(condominioId) {
  const usuarios = await prisma.profile.findMany({
    where: { condominioId },
    select: { id: true, nome: true, email: true, papel: true, cargo: true, emailConfirmadoEm: true, unidade: { select: { numero: true, bloco: true } } },
    orderBy: { nome: 'asc' }
  });
  return usuarios.map(({ unidade, emailConfirmadoEm, ...u }) => ({
    ...u,
    emailConfirmado: !!emailConfirmadoEm,
    unidadeLabel: rotuloUnidade(unidade)
  }));
}

/** Sessão como o usuário escolhido (token de suporte, 2h): vê e faz exatamente o que ele vê e faz. */
async function acessarComo(admin, id) {
  const profile = await prisma.profile.findUniqueOrThrow({ where: { id } });
  if (profile.papel === 'admin') throw new HttpError(400, 'Não é possível acessar como outro admin');
  console.log(`[suporte] ${admin.email} acessou como ${profile.email}`);
  return { token: gerarTokenSuporte(profile, admin.id), tokenType: 'Bearer', ...(await sessaoDe(profile)) };
}

/** Cadastros públicos que ainda não clicaram no link (inclui administradora sem condomínio). */
function pendentes() {
  return prisma.profile.findMany({
    where: { emailConfirmadoEm: null },
    select: { id: true, nome: true, email: true, papel: true, criadoEm: true },
    orderBy: { criadoEm: 'desc' }
  });
}

/** Fallback quando o link de confirmação não chega: o admin confirma o e-mail na mão. */
async function confirmarEmail(id) {
  await prisma.profile.update({ where: { id }, data: { emailConfirmadoEm: new Date() } });
}

const SELECT_PAGAMENTO = { id: true, valor: true, pagoEm: true, validoAte: true };

function pagamentosDo(condominioId) {
  return prisma.assinaturaPagamento.findMany({ where: { condominioId }, select: SELECT_PAGAMENTO, orderBy: { validoAte: 'desc' } });
}

async function registrarPagamento(condominioId, d) {
  await prisma.condominio.findUniqueOrThrow({ where: { id: condominioId } }); // 404, não "registro vinculado"
  const valor = Number(obrigatorio(d.valor, 'valor'));
  if (!(valor > 0)) throw new HttpError(400, 'Valor inválido');
  const pagoEm = paraData(obrigatorio(d.pagoEm, 'pagoEm'));
  const validoAte = paraData(obrigatorio(d.validoAte, 'validoAte'));
  if (isNaN(pagoEm) || isNaN(validoAte)) throw new HttpError(400, 'Data inválida');
  if (validoAte < pagoEm) throw new HttpError(400, '"Válido até" não pode ser antes do pagamento');
  return prisma.assinaturaPagamento.create({ data: { condominioId, valor, pagoEm, validoAte }, select: SELECT_PAGAMENTO });
}

async function excluirPagamento(id) {
  await prisma.assinaturaPagamento.delete({ where: { id } });
}

module.exports = {
  listar,
  criar,
  atualizar,
  reenviarConvite,
  usuariosDo,
  acessarComo,
  confirmarEmail,
  pendentes,
  pagamentosDo,
  registrarPagamento,
  excluirPagamento
};
