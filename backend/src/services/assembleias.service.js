const crypto = require('node:crypto');
const prisma = require('../models/prisma');
const HttpError = require('../utils/httpError');
const { isSindico, condominioDe, exigirAfetado } = require('../utils/acesso');
const { obrigatorio } = require('../utils/validar');

const JANELA_MS = 60_000; // muitos idosos: código troca devagar e vale por até 3 min (janela atual + 2)
const JANELAS_ACEITAS = 3;
// QR do telão: quem escaneia ainda pode ter que fazer login (idoso digitando senha) → vale 10 min.
const JANELAS_QR = 10;
const OPCOES_PADRAO = ['Sim', 'Não', 'Abstenção'];
const STATUS_PAUTA = ['rascunho', 'votando', 'encerrada']; // só avança nessa ordem

// ---------- Código de check-in rotativo ----------

const janelaAtual = (agora = Date.now()) => Math.floor(agora / JANELA_MS);

/** 6 dígitos derivados do segredo da assembleia e da janela de 60 s (estilo TOTP). */
function codigo(segredo, janela) {
  const hmac = crypto.createHmac('sha256', segredo).update(String(janela)).digest();
  return String(hmac.readUInt32BE(0) % 1_000_000).padStart(6, '0');
}

/** Token do QR: derivado de outro segredo, para um não servir no lugar do outro. */
const tokenQr = (segredo, janela) => codigo(`${segredo}|qr`, janela);

const valeEm = (gerar, janelas, digitado, agora) => {
  const j = janelaAtual(agora);
  const alvo = String(digitado ?? '').replace(/\D/g, '');
  return alvo.length === 6 && Array.from({ length: janelas }, (_, i) => j - i).some((n) => gerar(n) === alvo);
};

/** Aceita a janela atual e as 2 anteriores (quem digita devagar). Repassar pelo WhatsApp ainda fica difícil. */
const codigoValido = (segredo, digitado, agora = Date.now()) =>
  valeEm((j) => codigo(segredo, j), JANELAS_ACEITAS, digitado, agora);

/** ponytail: foto do QR repassada vale 10 min; encurtar JANELAS_QR se virar abuso (o síndico vê os presentes). */
const qrValido = (segredo, digitado, agora = Date.now()) => valeEm((j) => tokenQr(segredo, j), JANELAS_QR, digitado, agora);

// ---------- Limite de tentativas de check-in (contra adivinhar o código por script) ----------

const MAX_FALHAS = 5;
const BLOQUEIO_MS = 60_000;
const falhas = new Map(); // "usuario|assembleia" → { n, desde }

/**
 * ponytail: em memória, por processo; zera ao reiniciar a API. Mover para o banco/Redis se rodar em várias instâncias.
 * Com 5 erros/minuto, acertar 1 de 3 códigos válidos em 1 milhão leva, em média, mais de 100 dias.
 */
function bloqueado(chave, agora = Date.now()) {
  const f = falhas.get(chave);
  if (f && agora - f.desde > BLOQUEIO_MS) falhas.delete(chave);
  return (falhas.get(chave)?.n ?? 0) >= MAX_FALHAS;
}

function registrarFalha(chave, agora = Date.now()) {
  const f = falhas.get(chave);
  if (!f || agora - f.desde > BLOQUEIO_MS) falhas.set(chave, { n: 1, desde: agora });
  else f.n += 1;
}

// ---------- Validação ----------

function dadosPauta(p, ordem) {
  const opcoes = [...new Set((p.opcoes?.length ? p.opcoes : OPCOES_PADRAO).map((o) => String(o).trim()).filter(Boolean))];
  if (opcoes.length < 2) throw new HttpError(400, 'A pauta precisa de pelo menos 2 opções');
  return {
    titulo: obrigatorio(String(p.titulo ?? '').trim(), 'titulo da pauta'),
    descricao: String(p.descricao ?? '').trim(),
    ordem,
    opcoes: { create: opcoes.map((texto, i) => ({ texto, ordem: i })) }
  };
}

async function buscar(usuario, id) {
  const assembleia = await prisma.assembleia.findFirst({ where: { id, condominioId: condominioDe(usuario) } });
  if (!assembleia) throw new HttpError(404, 'Assembleia não encontrada');
  return assembleia;
}

const exigirAberta = (a) => {
  if (a.status !== 'aberta') throw new HttpError(400, 'A assembleia já foi encerrada');
};

// ---------- Síndico ----------

async function listar(usuario) {
  const assembleias = await prisma.assembleia.findMany({
    where: { condominioId: condominioDe(usuario) },
    select: { id: true, titulo: true, status: true, criadoEm: true, encerradaEm: true, _count: { select: { presencas: true, pautas: true } } },
    orderBy: [{ status: 'asc' }, { criadoEm: 'desc' }] // "aberta" < "encerrada"
  });
  return assembleias.map(({ _count, ...a }) => ({ ...a, presentes: _count.presencas, pautas: _count.pautas }));
}

async function criar(usuario, d) {
  const pautas = d.pautas || [];
  return prisma.assembleia.create({
    data: {
      condominioId: condominioDe(usuario),
      titulo: obrigatorio(String(d.titulo ?? '').trim(), 'titulo'),
      segredo: crypto.randomBytes(20).toString('hex'),
      pautas: { create: pautas.map((p, i) => ({ ...dadosPauta(p, i), condominioId: condominioDe(usuario) })) }
    },
    select: { id: true }
  });
}

async function adicionarPauta(usuario, id, d) {
  const assembleia = await buscar(usuario, id);
  exigirAberta(assembleia);
  const ordem = await prisma.pauta.count({ where: { assembleiaId: id } });
  return prisma.pauta.create({
    data: { ...dadosPauta(d, ordem), assembleiaId: id, condominioId: assembleia.condominioId },
    select: { id: true }
  });
}

async function pautaEmRascunho(usuario, pautaId) {
  const pauta = await prisma.pauta.findFirst({ where: { id: pautaId, condominioId: condominioDe(usuario) } });
  if (!pauta) throw new HttpError(404, 'Pauta não encontrada');
  if (pauta.status !== 'rascunho') throw new HttpError(400, 'Depois de aberta, a votação não pode ser alterada');
  return pauta;
}

/** Só antes de abrir a votação (sem votos): corrige título, explicação e opções. */
async function editarPauta(usuario, pautaId, d) {
  const pauta = await pautaEmRascunho(usuario, pautaId);
  const { opcoes, ...campos } = dadosPauta(d, pauta.ordem);
  await prisma.$transaction([
    prisma.pautaOpcao.deleteMany({ where: { pautaId } }),
    prisma.pauta.update({ where: { id: pautaId }, data: { ...campos, opcoes } })
  ]);
}

async function removerPauta(usuario, pautaId) {
  await pautaEmRascunho(usuario, pautaId);
  await prisma.pauta.delete({ where: { id: pautaId } });
}

/** Presença marcada por engano: só sai se a unidade ainda não votou em nada (senão o voto ficaria sem presença). */
async function removerPresenca(usuario, id, unidadeId) {
  const assembleia = await buscar(usuario, id);
  exigirAberta(assembleia);
  const votou = await prisma.pautaVotante.count({ where: { unidadeId, pauta: { assembleiaId: id } } });
  if (votou) throw new HttpError(409, 'Essa unidade já votou; a presença não pode ser removida');
  exigirAfetado(await prisma.assembleiaPresenca.deleteMany({ where: { assembleiaId: id, unidadeId } }));
}

/** Assembleia criada por engano: só enquanto ninguém votou (depois disso ela é registro da reunião). */
async function remover(usuario, id) {
  await buscar(usuario, id);
  const votos = await prisma.pautaVotante.count({ where: { pauta: { assembleiaId: id } } });
  if (votos) throw new HttpError(409, 'Essa assembleia já tem votos e não pode ser excluída');
  await prisma.assembleia.delete({ where: { id } }); // presenças, pautas e opções caem em cascata
}

async function mudarStatusPauta(usuario, pautaId, status) {
  if (!STATUS_PAUTA.includes(status)) throw new HttpError(400, 'Status inválido');
  const pauta = await prisma.pauta.findFirst({
    where: { id: pautaId, condominioId: condominioDe(usuario) },
    include: { assembleia: true }
  });
  if (!pauta) throw new HttpError(404, 'Pauta não encontrada');
  exigirAberta(pauta.assembleia);
  if (STATUS_PAUTA.indexOf(status) <= STATUS_PAUTA.indexOf(pauta.status)) {
    throw new HttpError(400, 'A votação não pode voltar atrás');
  }
  await prisma.pauta.update({ where: { id: pautaId }, data: { status } });
}

async function marcarPresenca(usuario, id, unidadeId) {
  const assembleia = await buscar(usuario, id);
  exigirAberta(assembleia);
  const unidade = await prisma.unidade.findFirst({ where: { id: String(unidadeId), condominioId: assembleia.condominioId } });
  if (!unidade) throw new HttpError(404, 'Unidade não encontrada');
  await prisma.assembleiaPresenca.upsert({
    where: { assembleiaId_unidadeId: { assembleiaId: id, unidadeId: unidade.id } },
    create: { assembleiaId: id, unidadeId: unidade.id, manual: true },
    update: {}
  });
}

/**
 * Registro de procuração (documento da assembleia): a unidade outorgante
 * concede a procuração pra unidade procuradora representá-la. É só ata —
 * não muda check-in nem contagem de voto.
 */
async function adicionarProcuracao(usuario, id, d) {
  const assembleia = await buscar(usuario, id);
  exigirAberta(assembleia);
  const outorganteId = String(obrigatorio(d.unidadeOutorganteId, 'unidadeOutorganteId'));
  const procuradoraId = String(obrigatorio(d.unidadeProcuradoraId, 'unidadeProcuradoraId'));
  if (outorganteId === procuradoraId) {
    throw new HttpError(400, 'A unidade não pode conceder procuração a si mesma');
  }
  const condominioId = assembleia.condominioId;
  const [outorgante, procuradora] = await Promise.all([
    prisma.unidade.findFirst({ where: { id: outorganteId, condominioId } }),
    prisma.unidade.findFirst({ where: { id: procuradoraId, condominioId } })
  ]);
  if (!outorgante || !procuradora) throw new HttpError(404, 'Unidade não encontrada');
  try {
    return await prisma.procuracao.create({
      data: { condominioId, assembleiaId: id, unidadeOutorganteId: outorganteId, unidadeProcuradoraId: procuradoraId },
      select: { id: true }
    });
  } catch (err) {
    if (err.code === 'P2002') throw new HttpError(409, 'Essa unidade já concedeu procuração a alguém nessa assembleia');
    throw err;
  }
}

async function removerProcuracao(usuario, id, procuracaoId) {
  const assembleia = await buscar(usuario, id);
  exigirAberta(assembleia);
  exigirAfetado(await prisma.procuracao.deleteMany({ where: { id: procuracaoId, assembleiaId: id } }));
}

async function encerrar(usuario, id) {
  const assembleia = await buscar(usuario, id);
  exigirAberta(assembleia);
  await prisma.$transaction([
    prisma.pauta.updateMany({ where: { assembleiaId: id, status: { not: 'encerrada' } }, data: { status: 'encerrada' } }),
    prisma.assembleia.update({ where: { id }, data: { status: 'encerrada', encerradaEm: new Date() } })
  ]);
}

// ---------- Condômino ----------

function exigirUnidade(usuario) {
  if (usuario.papel !== 'condomino' || !usuario.unidadeId) {
    throw new HttpError(403, 'Só condômino com unidade cadastrada participa da votação');
  }
  return usuario.unidadeId;
}

/** Presença pelo número digitado (`codigo`) ou pelo QR do telão (`qr`). */
async function checkin(usuario, id, { codigo: digitado, qr } = {}) {
  const unidadeId = exigirUnidade(usuario);
  const assembleia = await buscar(usuario, id);
  exigirAberta(assembleia);
  const chave = `${usuario.id}|${id}`;
  if (bloqueado(chave)) {
    throw new HttpError(429, 'Muitas tentativas. Espere 1 minuto ou fale com o síndico na entrada.');
  }
  const erro =
    qr !== undefined
      ? !qrValido(assembleia.segredo, qr) && 'O QR code expirou. Digite o número do telão.'
      : !codigoValido(assembleia.segredo, digitado) && 'Esse número não confere. Olhe o telão e digite de novo.';
  if (erro) {
    registrarFalha(chave);
    throw new HttpError(400, erro);
  }
  falhas.delete(chave);
  await prisma.assembleiaPresenca.upsert({
    where: { assembleiaId_unidadeId: { assembleiaId: id, unidadeId } },
    create: { assembleiaId: id, unidadeId, profileId: usuario.id },
    update: {}
  });
}

/**
 * Condômino vota pela própria unidade. Síndico vota pela unidade dele (se tiver) ou "pela mesa": informa a unidade
 * presente de quem não tem celular e entrega o aparelho para a pessoa escolher sozinha. O banco nunca liga voto a unidade.
 */
async function votar(usuario, pautaId, { opcaoId, unidadeId: unidadeInformada } = {}) {
  const sindico = isSindico(usuario);
  const unidadeId = sindico
    ? String(obrigatorio(unidadeInformada ?? usuario.unidadeId, 'unidade'))
    : exigirUnidade(usuario);
  const pauta = await prisma.pauta.findFirst({
    where: { id: pautaId, condominioId: condominioDe(usuario) },
    include: { opcoes: { select: { id: true } } }
  });
  if (!pauta) throw new HttpError(404, 'Pauta não encontrada');
  if (pauta.status !== 'votando') throw new HttpError(400, 'Essa pauta não está em votação');
  if (!pauta.opcoes.some((o) => o.id === opcaoId)) throw new HttpError(400, 'Opção inválida');
  const presenca = { assembleiaId_unidadeId: { assembleiaId: pauta.assembleiaId, unidadeId } };
  if (sindico && unidadeId === usuario.unidadeId) {
    // o síndico está na reunião: votar pela própria unidade já registra a presença dela
    await prisma.assembleiaPresenca.upsert({
      where: presenca,
      create: { assembleiaId: pauta.assembleiaId, unidadeId, profileId: usuario.id },
      update: {}
    });
  } else if (!(await prisma.assembleiaPresenca.findUnique({ where: presenca }))) {
    throw new HttpError(403, sindico ? 'Marque a presença dessa unidade antes' : 'Faça o check-in na reunião antes de votar');
  }

  try {
    await prisma.$transaction(async (tx) => {
      // trava a pauta: "encerrar" espera este voto terminar (ou o voto vê a pauta já encerrada) — nunca conta voto atrasado
      const [atual] = await tx.$queryRaw`SELECT status FROM pautas WHERE id = ${pautaId}::uuid FOR UPDATE`;
      if (atual?.status !== 'votando') throw new HttpError(400, 'A votação dessa pauta acabou de ser encerrada');
      await tx.pautaVotante.create({ data: { pautaId, unidadeId } });
      await tx.pautaOpcao.update({ where: { id: opcaoId }, data: { votos: { increment: 1 } } });
    });
  } catch (err) {
    if (err.code === 'P2002') throw new HttpError(409, 'Sua unidade já votou nessa pauta');
    throw err;
  }
}

// ---------- Estado (polling) ----------

const UNIDADE = { select: { id: true, numero: true, bloco: true } };

/**
 * Tudo que a tela da assembleia precisa. Nunca liga voto a unidade. Enquanto a pauta está em votação, nem o total
 * por opção sai (votos: null) — senão quem olha o placar na hora de um voto (ex.: na mesa) descobre o voto.
 */
async function estado(usuario, id) {
  const assembleia = await buscar(usuario, id);
  const sindico = isSindico(usuario);
  const [pautas, presencas, totalUnidades, votadas, procuracoes] = await Promise.all([
    prisma.pauta.findMany({
      where: { assembleiaId: id },
      include: { opcoes: { orderBy: { ordem: 'asc' } }, _count: { select: { votantes: true } } },
      orderBy: { ordem: 'asc' }
    }),
    prisma.assembleiaPresenca.findMany({
      where: { assembleiaId: id },
      select: { unidadeId: true, manual: true, criadoEm: true, unidade: UNIDADE },
      orderBy: { criadoEm: 'asc' }
    }),
    prisma.unidade.count({ where: { condominioId: assembleia.condominioId } }),
    usuario.unidadeId
      ? prisma.pautaVotante.findMany({ where: { unidadeId: usuario.unidadeId, pauta: { assembleiaId: id } }, select: { pautaId: true } })
      : [],
    isSindico(usuario)
      ? prisma.procuracao.findMany({
          where: { assembleiaId: id },
          select: { id: true, criadoEm: true, unidadeOutorgante: UNIDADE, unidadeProcuradora: UNIDADE },
          orderBy: { criadoEm: 'asc' }
        })
      : []
  ]);

  const agora = Date.now();
  return {
    id: assembleia.id,
    titulo: assembleia.titulo,
    status: assembleia.status,
    criadoEm: assembleia.criadoEm,
    encerradaEm: assembleia.encerradaEm,
    presentes: presencas.length,
    totalUnidades,
    pautas: pautas.map(({ _count, condominioId, assembleiaId, ...p }) => ({
      ...p,
      opcoes: p.status === 'votando' ? p.opcoes.map((o) => ({ ...o, votos: null })) : p.opcoes,
      votantes: _count.votantes
    })),
    minhaUnidade: usuario.unidadeId
      ? { presente: presencas.some((p) => p.unidadeId === usuario.unidadeId), pautasVotadas: votadas.map((v) => v.pautaId) }
      : null,
    ...(sindico && {
      presencas: presencas.map(({ unidadeId, ...p }) => p),
      procuracoes,
      ...(assembleia.status === 'aberta' && {
        agora: new Date(agora), // a contagem regressiva usa a hora do servidor, não a do aparelho
        codigo: codigo(assembleia.segredo, janelaAtual(agora)),
        qr: tokenQr(assembleia.segredo, janelaAtual(agora)),
        codigoExpiraEm: new Date((janelaAtual(agora) + 1) * JANELA_MS)
      })
    })
  };
}

module.exports = {
  listar,
  criar,
  remover,
  adicionarPauta,
  editarPauta,
  removerPauta,
  removerPresenca,
  mudarStatusPauta,
  marcarPresenca,
  adicionarProcuracao,
  removerProcuracao,
  encerrar,
  checkin,
  votar,
  estado,
  codigo,
  codigoValido,
  tokenQr,
  qrValido,
  bloqueado,
  registrarFalha,
  JANELA_MS
};
