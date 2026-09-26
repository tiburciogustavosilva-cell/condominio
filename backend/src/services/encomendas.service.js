const { randomInt } = require('crypto');
const prisma = require('../models/prisma');
const { rotuloUnidade } = require('../utils/unidade');
const HttpError = require('../utils/httpError');
const { isEquipe, condominioDe, exigirAfetado } = require('../utils/acesso');
const { obrigatorio, cpf } = require('../utils/validar');

const FOTO_MAX_BYTES = 2 * 1024 * 1024;
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
    include: { unidade: { select: { bloco: true, numero: true } }, registradoPor: PESSOA, liberadoPor: PESSOA },
    orderBy: { criadoEm: 'desc' }
  });
  const comFoto = new Set(
    (await prisma.encomenda.findMany({ where: { ...where, foto: { not: null } }, select: { id: true } })).map((e) => e.id)
  );
  return encomendas.map(({ unidade, codigoRetirada, entregadorCpf, tentativasRetirada, ...e }) => ({
    ...e, // inclui registradoPor/liberadoPor: { nome, papel, cargo } | null
    bloqueada: tentativasRetirada >= LIMITE_TENTATIVAS,
    unidadeLabel: rotuloUnidade(unidade) ?? '-',
    temFoto: comFoto.has(e.id),
    // O código é só do morador: a portaria nunca vê, só digita o que foi informado.
    ...(equipe ? { entregadorCpf } : { codigoRetirada: e.status === 'aguardando' ? codigoRetirada : null })
  }));
}

/** Aceita data URL ou base64 puro; exige WebP de verdade (assinatura RIFF....WEBP). */
function lerFotoWebp(valor) {
  const buf = Buffer.from(String(obrigatorio(valor, 'foto')).replace(/^data:[^,]*,/, ''), 'base64');
  if (buf.length < 12 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') {
    throw new HttpError(400, 'A foto precisa estar em formato .webp');
  }
  if (buf.length > FOTO_MAX_BYTES) throw new HttpError(400, 'Foto muito grande (máx. 2 MB)');
  return buf;
}

async function criar(usuario, d) {
  const condominioId = condominioDe(usuario);
  if (!(await prisma.unidade.findFirst({ where: { id: obrigatorio(d.unidadeId, 'unidadeId'), condominioId } }))) {
    throw new HttpError(400, 'Unidade inválida');
  }
  const { id } = await prisma.encomenda.create({
    data: {
      unidadeId: d.unidadeId,
      descricao: obrigatorio(d.descricao, 'descricao'),
      remetente: d.remetente || '',
      codigoRastreio: String(d.codigoRastreio || '').trim().toUpperCase() || null,
      volumeGrande: !!d.volumeGrande,
      perecivel: !!d.perecivel,
      entregadorNome: String(obrigatorio(d.entregadorNome, 'entregadorNome')).trim(),
      entregadorCpf: cpf(d.entregadorCpf),
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

module.exports = { listar, criar, foto, retirar, desbloquear, remover };
