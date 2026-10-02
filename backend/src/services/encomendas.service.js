const { randomInt } = require('crypto');
const prisma = require('../models/prisma');
const { rotuloUnidade } = require('../utils/unidade');
const HttpError = require('../utils/httpError');
const { isEquipe, condominioDe, exigirAfetado } = require('../utils/acesso');
const { obrigatorio } = require('../utils/validar');
const { lerFotoWebp } = require('../utils/foto');
const { gerarTokenEncomendaQr, verificarTokenEncomendaQr } = require('../utils/jwt');

const LIMITE_TENTATIVAS = 5; // códigos errados até bloquear; só o síndico desbloqueia
const PESSOA = { select: { nome: true, papel: true, cargo: true } };

// Equipe vê todas; condômino só as da própria unidade (sem unidade = nenhuma).
function escopo(u) {
  const condominioId = condominioDe(u);
  if (isEquipe(u)) return { condominioId };
  return u.unidadeId ? { condominioId, unidadeId: u.unidadeId } : null;
}

async function listar(usuario) {
  const where = escopo(usuario);
  if (!where) return [];
  const equipe = isEquipe(usuario);
  const encomendas = await prisma.encomenda.findMany({
    where,
    omit: { foto: true },
    include: {
      unidade: { select: { bloco: true, numero: true } },
      registradoPor: PESSOA,
      liberadoPor: PESSOA,
      autorizados: { orderBy: { criadoEm: 'asc' } }
    },
    orderBy: { criadoEm: 'desc' }
  });
  const comFoto = new Set(
    (await prisma.encomenda.findMany({ where: { ...where, foto: { not: null } }, select: { id: true } })).map((e) => e.id)
  );
  return encomendas.map(({ unidade, codigoRetirada, tentativasRetirada, ...e }) => ({
    ...e, // inclui registradoPor/liberadoPor: { nome, papel, cargo } | null
    bloqueada: tentativasRetirada >= LIMITE_TENTATIVAS,
    unidadeLabel: rotuloUnidade(unidade) ?? '-',
    temFoto: comFoto.has(e.id),
    // O código é só do morador: a portaria nunca vê, só digita o que foi informado.
    // Síndico que mora no prédio vê o das encomendas da própria unidade.
    ...(equipe && e.unidadeId !== usuario.unidadeId
      ? {}
      : { codigoRetirada: e.status === 'aguardando' ? codigoRetirada : null })
  }));
}

async function criar(usuario, d) {
  const condominioId = condominioDe(usuario);
  if (!(await prisma.unidade.findFirst({ where: { id: obrigatorio(d.unidadeId, 'unidadeId'), condominioId } }))) {
    throw new HttpError(400, 'Unidade inválida');
  }
  const { id } = await prisma.encomenda.create({
    data: {
      unidadeId: d.unidadeId,
      observacao: obrigatorio(d.observacao, 'observacao'),
      remetente: d.remetente || '',
      codigoRastreio: String(d.codigoRastreio || '').trim().toUpperCase() || null,
      volumeGrande: !!d.volumeGrande,
      perecivel: !!d.perecivel,
      foto: lerFotoWebp(d.foto),
      codigoRetirada: String(randomInt(0, 100000)).padStart(5, '0'),
      registradoPorId: usuario.id,
      condominioId
    }
  });
  return { id }; // sem o código: quem registra é a portaria
}

async function foto(usuario, id) {
  const where = escopo(usuario);
  const encomenda = where && (await prisma.encomenda.findFirst({ where: { ...where, id }, select: { foto: true } }));
  if (!encomenda?.foto) throw new HttpError(404, 'Foto não encontrada');
  return encomenda.foto;
}

/** Portaria libera só com o código de 5 dígitos + nome de quem informou. */
async function retirar(usuario, id, { codigo, retiradoPor }) {
  const nome = String(obrigatorio(retiradoPor, 'retiradoPor')).trim();
  const encomenda = await prisma.encomenda.findFirst({
    where: { id, condominioId: condominioDe(usuario), status: 'aguardando' },
    select: { codigoRetirada: true, tentativasRetirada: true }
  });
  if (!encomenda) throw new HttpError(404, 'Encomenda não encontrada ou já retirada');
  if (encomenda.tentativasRetirada >= LIMITE_TENTATIVAS) {
    throw new HttpError(423, 'Retirada bloqueada por excesso de códigos errados — o síndico precisa desbloquear');
  }
  if (String(codigo || '').trim() !== encomenda.codigoRetirada) {
    // increment atômico: tentativas simultâneas não passam do limite sem contar
    const { tentativasRetirada } = await prisma.encomenda.update({
      where: { id },
      data: { tentativasRetirada: { increment: 1 } },
      select: { tentativasRetirada: true }
    });
    const restantes = LIMITE_TENTATIVAS - tentativasRetirada;
    throw new HttpError(
      400,
      restantes > 0
        ? `Código incorreto — ${restantes} tentativa(s) restante(s)`
        : 'Código incorreto — retirada bloqueada; o síndico precisa desbloquear'
    );
  }
  await prisma.encomenda.update({
    where: { id },
    data: { status: 'entregue', recebidoPor: nome, entregueEm: new Date(), liberadoPorId: usuario.id }
  });
}

/**
 * Portaria gera um QR de uso único (vale 3 min) pra mostrar na tela. O próprio
 * morador escaneia com o celular e confirma a retirada — vira a forma principal;
 * código de 5 dígitos + nome fica só de alternativa.
 */
async function gerarQrRetirada(usuario, id) {
  const encomenda = await prisma.encomenda.findFirst({
    where: { id, condominioId: condominioDe(usuario), status: 'aguardando' },
    select: { id: true, tentativasRetirada: true }
  });
  if (!encomenda) throw new HttpError(404, 'Encomenda não encontrada ou já retirada');
  if (encomenda.tentativasRetirada >= LIMITE_TENTATIVAS) {
    throw new HttpError(423, 'Retirada bloqueada por excesso de códigos errados — o síndico precisa desbloquear');
  }
  return { token: gerarTokenEncomendaQr(id, usuario.id), expiraEmSegundos: 180 };
}

/** Confirma a retirada pelo QR: só serve pra morador da própria unidade da encomenda. */
async function retirarComQr(usuario, token) {
  let payload;
  try {
    payload = verificarTokenEncomendaQr(obrigatorio(token, 'token'));
  } catch {
    throw new HttpError(400, 'QR code expirado ou inválido — peça para a portaria gerar outro');
  }
  const encomenda = await prisma.encomenda.findFirst({
    where: { id: payload.enc, condominioId: condominioDe(usuario), status: 'aguardando' },
    select: { id: true, unidadeId: true }
  });
  if (!encomenda) throw new HttpError(404, 'Encomenda não encontrada ou já retirada');
  if (!usuario.unidadeId || encomenda.unidadeId !== usuario.unidadeId) {
    throw new HttpError(403, 'Esse QR code é de uma encomenda de outra unidade');
  }
  await prisma.encomenda.update({
    where: { id: encomenda.id },
    data: { status: 'entregue', recebidoPor: usuario.nome, entregueEm: new Date(), liberadoPorId: payload.por }
  });
}

/** Síndico zera as tentativas de uma encomenda bloqueada. */
async function desbloquear(usuario, id) {
  exigirAfetado(
    await prisma.encomenda.updateMany({
      where: { id, condominioId: condominioDe(usuario), status: 'aguardando' },
      data: { tentativasRetirada: 0 }
    })
  );
}

async function remover(usuario, id) {
  exigirAfetado(await prisma.encomenda.deleteMany({ where: { id, condominioId: condominioDe(usuario) } }));
}

/** Encomenda dentro do escopo do usuário (equipe vê todas; morador só a da própria unidade). */
async function encomendaVisivel(usuario, id) {
  const where = escopo(usuario);
  const encomenda = where && (await prisma.encomenda.findFirst({ where: { ...where, id } }));
  if (!encomenda) throw new HttpError(404, 'Encomenda não encontrada');
  return encomenda;
}

/**
 * Terceiros que o morador autoriza a retirar (empregada, parente...). É só
 * referência pra portaria — quem libera de verdade é o código de 5 dígitos.
 */
async function adicionarAutorizado(usuario, id, nome) {
  const encomenda = await encomendaVisivel(usuario, id);
  if (encomenda.status !== 'aguardando') {
    throw new HttpError(400, 'Só é possível autorizar terceiros enquanto a encomenda aguarda retirada');
  }
  return prisma.encomendaAutorizado.create({
    data: { encomendaId: id, nome: String(obrigatorio(nome, 'nome')).trim() }
  });
}

async function removerAutorizado(usuario, id, autorizadoId) {
  await encomendaVisivel(usuario, id);
  exigirAfetado(await prisma.encomendaAutorizado.deleteMany({ where: { id: autorizadoId, encomendaId: id } }));
}

module.exports = {
  listar,
  criar,
  foto,
  retirar,
  gerarQrRetirada,
  retirarComQr,
  desbloquear,
  remover,
  adicionarAutorizado,
  removerAutorizado
};
