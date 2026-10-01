const prisma = require('../models/prisma');
const HttpError = require('../utils/httpError');
const { condominioDe } = require('../utils/acesso');

const TIPOS_AREA = ['rua', 'area_verde', 'playground', 'piscina', 'convivencia', 'quadra', 'estacionamento', 'portaria', 'outro'];
const TIPOS = ['unidade', 'bloco', ...TIPOS_AREA];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAIDA = { id: true, camada: true, tipo: true, unidadeId: true, bloco: true, rotulo: true, x: true, y: true, largura: true, altura: true };

function listar(usuario) {
  return prisma.mapaItem.findMany({ where: { condominioId: condominioDe(usuario) }, select: SAIDA, orderBy: { criadoEm: 'asc' } });
}

const invalido = (msg) => {
  throw new HttpError(400, msg);
};
const inteiro = (v, min, max, campo) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : invalido(`${campo} inválido no mapa`);
};
const texto = (v, max) => String(v ?? '').trim().slice(0, max);
// camada/bloco são comparados no app com o bloco da unidade como foi salvo: recusa, nunca altera.
const exato = (v, max, campo) => {
  const s = String(v ?? '');
  return s.length <= max ? s : invalido(`${campo} longo demais no mapa`);
};

function validar(item) {
  if (!UUID.test(String(item?.id))) invalido('Item do mapa sem id');
  if (!TIPOS.includes(item.tipo)) invalido('Tipo de item do mapa inválido');
  const camada = exato(item.camada, 80, 'Camada');
  if (camada !== 'geral' && !/^bloco:.+/.test(camada)) invalido('Camada do mapa inválida');
  return {
    id: item.id,
    camada,
    tipo: item.tipo,
    unidadeId: item.tipo === 'unidade' ? (UUID.test(String(item.unidadeId)) ? item.unidadeId : invalido('Unidade inválida')) : null,
    bloco: item.tipo === 'bloco' ? (item.bloco && exato(item.bloco, 60, 'Bloco')) || invalido('Informe o bloco do prédio') : null,
    rotulo: texto(item.rotulo, 60),
    x: inteiro(item.x, 0, 199, 'Posição'),
    y: inteiro(item.y, 0, 199, 'Posição'),
    largura: inteiro(item.largura ?? 1, 1, 20, 'Largura'),
    altura: inteiro(item.altura ?? 1, 1, 20, 'Altura')
  };
}

/**
 * Grava várias mudanças de uma vez (mover, trocar, redimensionar, criar e apagar peças) numa transação.
 * O id vem do app, assim a peça nova já nasce com o id que a tela está usando.
 * ponytail: sobreposição de peças é evitada só no app; validar aqui se o mapa passar a ser editado por API.
 */
async function salvar(usuario, { itens = [], removidos = [] } = {}) {
  if (!Array.isArray(itens) || !Array.isArray(removidos) || itens.length + removidos.length === 0 || itens.length + removidos.length > 1000) {
    invalido('Nada para salvar no mapa');
  }
  const condominioId = condominioDe(usuario);
  const dados = itens.map(validar);

  const unidadeIds = dados.filter((d) => d.unidadeId).map((d) => d.unidadeId);
  if (new Set(unidadeIds).size !== unidadeIds.length) invalido('A mesma unidade apareceu duas vezes no mapa');
  if (unidadeIds.length && (await prisma.unidade.count({ where: { id: { in: unidadeIds }, condominioId } })) !== unidadeIds.length) {
    invalido('Unidade inválida');
  }
  const apagar = removidos.filter((id) => UUID.test(String(id)));

  // conflitos que o banco recusaria (id de outro condomínio, unidade que já tem peça): responde 400 em vez de estourar
  const ids = dados.map((d) => d.id);
  const existentes = await prisma.mapaItem.findMany({
    where: { OR: [{ id: { in: ids } }, { unidadeId: { in: unidadeIds } }] },
    select: { id: true, condominioId: true, unidadeId: true }
  });
  for (const e of existentes) {
    if (ids.includes(e.id) && e.condominioId !== condominioId) invalido('Item do mapa inválido');
    const outraPeca = e.unidadeId && unidadeIds.includes(e.unidadeId) && !ids.includes(e.id) && !apagar.includes(e.id);
    if (outraPeca) invalido('Essa unidade já está no mapa. Recarregue a página e tente de novo.');
  }

  await prisma.$transaction(async (tx) => {
    if (apagar.length) await tx.mapaItem.deleteMany({ where: { id: { in: apagar }, condominioId } });
    for (const { id, ...d } of dados) {
      const { count } = await tx.mapaItem.updateMany({ where: { id, condominioId }, data: d });
      if (!count) await tx.mapaItem.create({ data: { id, ...d, condominioId } });
    }
  });
}

module.exports = { listar, salvar, TIPOS_AREA };
