const prisma = require('../models/prisma');
const { condominioDe } = require('../utils/acesso');
const { statusManutencao } = require('../utils/recorrencia');
const HttpError = require('../utils/httpError');

/** Mesmo corte da tela de Encomendas: a partir daqui a encomenda conta como parada. */
const DIAS_PARADA = 3;
const PERIODOS = [3, 6, 12];
/** Teto do período personalizado (o gráfico tem uma coluna por mês). */
const MAX_MESES = 36;

const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const custo = (os) => Number(os.custoMaterial ?? 0) + Number(os.custoMaoDeObra ?? 0);

/** 1º dia (UTC) do mês que abre um período de `meses` meses terminando no mês atual. */
function inicioPeriodo(meses, hoje = new Date()) {
  return new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - (meses - 1), 1));
}

const diaValido = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? '') && !Number.isNaN(Date.parse(s));

/**
 * Período do relatório: `de`/`ate` ("YYYY-MM-DD", inclusive) ou os últimos `meses` (3, 6, 12; padrão 6).
 * Devolve `desde` (inclusive), `fim` (exclusivo), quantos meses o gráfico cobre e as datas em texto.
 */
function periodo({ meses, de, ate } = {}, hoje = new Date()) {
  let desde, fim;
  if (de || ate) {
    if (!diaValido(de) || !diaValido(ate) || de > ate) throw new HttpError(400, 'Período inválido');
    desde = new Date(`${de}T00:00:00Z`);
    fim = new Date(`${ate}T00:00:00Z`);
    fim.setUTCDate(fim.getUTCDate() + 1);
  } else {
    desde = inicioPeriodo(PERIODOS.includes(meses) ? meses : 6, hoje);
    fim = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 1));
  }
  const ultimo = new Date(fim.getTime() - 86400000);
  const n = (ultimo.getUTCFullYear() - desde.getUTCFullYear()) * 12 + ultimo.getUTCMonth() - desde.getUTCMonth() + 1;
  if (n > MAX_MESES) throw new HttpError(400, `Escolha um período de até ${MAX_MESES} meses`);
  return { desde, fim, meses: n, de: desde.toISOString().slice(0, 10), ate: ultimo.toISOString().slice(0, 10) };
}

/**
 * Soma itens `[data, valor = 1]` por mês: `[{ mes: 'YYYY-MM', total }]`, do mais antigo
 * ao atual, com mês vazio = 0 e datas fora do período ignoradas.
 * ponytail: mês em UTC — evento de timestamptz entre 21h e 0h do último dia cai no mês seguinte (UTC-3).
 */
function porMes(itens, desde, meses) {
  const serie = Array.from({ length: meses }, (_, i) => ({
    mes: new Date(Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth() + i, 1)).toISOString().slice(0, 7),
    total: 0
  }));
  const idx = new Map(serie.map((s, i) => [s.mes, i]));
  for (const [data, valor = 1] of itens) {
    const i = idx.get(new Date(data).toISOString().slice(0, 7));
    if (i !== undefined) serie[i].total += valor;
  }
  return serie;
}

// ponytail: agrupamento em memória; trocar por date_trunc via $queryRaw se o volume crescer
async function resumo(usuario, filtro) {
  const condominioId = condominioDe(usuario);
  const recursos = usuario.condominio?.acesso?.recursos ?? [];
  const tem = (r) => recursos.includes(r);
  const { desde, fim, meses, de, ate } = periodo(filtro);
  const no = { gte: desde, lt: fim };

  const [unidades, unidadesVazias, vinculos, funcionarios, ocorrencias, manutencoes, encomendas, assembleias] =
    await Promise.all([
      prisma.unidade.count({ where: { condominioId } }),
      prisma.unidade.count({ where: { condominioId, profiles: { none: {} } } }),
      prisma.profile.groupBy({
        by: ['vinculo'],
        where: { condominioId, papel: { notIn: ['administradora', 'funcionario'] } },
        _count: { _all: true }
      }),
      prisma.profile.count({ where: { condominioId, papel: 'funcionario' } }),
      tem('ocorrencias') ? ocorrenciasDoPeriodo(condominioId, no, meses) : null,
      tem('manutencoes') ? manutencoesDoPeriodo(condominioId, no, meses) : null,
      tem('encomendas') ? encomendasDoPeriodo(condominioId, no, meses) : null,
      tem('assembleias')
        ? prisma.assembleia.findMany({
            where: { condominioId, status: 'encerrada', encerradaEm: no },
            select: { id: true, titulo: true, encerradaEm: true, _count: { select: { presencas: true } } },
            orderBy: { encerradaEm: 'desc' },
            take: 6
          })
        : null
    ]);

  return {
    meses,
    de,
    ate,
    geral: {
      unidades,
      unidadesOcupadas: unidades - unidadesVazias,
      funcionarios,
      moradoresPorVinculo: vinculos.map((v) => ({ vinculo: v.vinculo, total: v._count._all }))
    },
    ocorrencias,
    manutencoes,
    encomendas,
    assembleias:
      assembleias &&
      assembleias.map((a) => ({ id: a.id, titulo: a.titulo, encerradaEm: a.encerradaEm, presencas: a._count.presencas }))
  };
}

async function ocorrenciasDoPeriodo(condominioId, no, meses) {
  const desde = no.gte;
  const [criadas, conclusoes, abertasAgora] = await Promise.all([
    prisma.ocorrencia.findMany({ where: { condominioId, criadoEm: no }, select: { criadoEm: true, categoria: true } }),
    prisma.ocorrenciaHistorico.findMany({
      where: { status: 'concluido', criadoEm: no, ocorrencia: { condominioId } },
      select: { ocorrenciaId: true, criadoEm: true, ocorrencia: { select: { criadoEm: true } } }
    }),
    prisma.ocorrencia.count({ where: { condominioId, status: { not: 'concluido' } } })
  ]);

  // Reaberta e concluída de novo conta uma vez só (a última conclusão).
  const ultimas = [...new Map(conclusoes.map((h) => [h.ocorrenciaId, h])).values()];
  const abertas = porMes(criadas.map((o) => [o.criadoEm]), desde, meses);
  const concluidas = porMes(ultimas.map((h) => [h.criadoEm]), desde, meses);

  const porCategoria = {};
  for (const o of criadas) porCategoria[o.categoria] = (porCategoria[o.categoria] ?? 0) + 1;

  const dias = media(ultimas.map((h) => (h.criadoEm - h.ocorrencia.criadoEm) / 86400000));
  return {
    porMes: abertas.map((a, i) => ({ mes: a.mes, abertas: a.total, concluidas: concluidas[i].total })),
    porCategoria: Object.entries(porCategoria)
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total),
    total: criadas.length,
    abertasAgora,
    diasMedioResolucao: dias === null ? null : Math.round(dias * 10) / 10
  };
}

async function manutencoesDoPeriodo(condominioId, no, meses) {
  const desde = no.gte;
  const [executadas, porStatus, planos] = await Promise.all([
    prisma.ordemServico.findMany({
      where: { condominioId, dataExecucao: no },
      select: { dataExecucao: true, tipo: true, custoMaterial: true, custoMaoDeObra: true }
    }),
    prisma.ordemServico.groupBy({ by: ['status'], where: { condominioId, dataAbertura: no }, _count: { _all: true } }),
    prisma.manutencao.findMany({
      where: { condominioId, ativo: true, statusManual: { notIn: ['concluida', 'cancelada'] } },
      select: { ultimaManutencao: true, frequenciaUnidade: true, frequenciaIntervalo: true, diasAntecedencia: true }
    })
  ]);

  const custoPorTipo = {};
  for (const os of executadas) custoPorTipo[os.tipo] = (custoPorTipo[os.tipo] ?? 0) + custo(os);
  const planosStatus = { em_dia: 0, proxima: 0, vencida: 0 };
  for (const m of planos) planosStatus[statusManutencao(m).status]++;

  return {
    custoPorMes: porMes(executadas.map((os) => [os.dataExecucao, custo(os)]), desde, meses),
    custoTotal: executadas.reduce((s, os) => s + custo(os), 0),
    custoPorTipo: Object.entries(custoPorTipo).map(([tipo, total]) => ({ tipo, total })),
    ordensPorStatus: porStatus.map((g) => ({ status: g.status, total: g._count._all })),
    planos: planosStatus
  };
}

async function encomendasDoPeriodo(condominioId, no, meses) {
  const desde = no.gte;
  const [recebidas, paradas] = await Promise.all([
    prisma.encomenda.findMany({ where: { condominioId, criadoEm: no }, select: { criadoEm: true, entregueEm: true } }),
    prisma.encomenda.count({
      where: { condominioId, status: 'aguardando', criadoEm: { lt: new Date(Date.now() - DIAS_PARADA * 86400000) } }
    })
  ]);
  const horas = media(recebidas.filter((e) => e.entregueEm).map((e) => (e.entregueEm - e.criadoEm) / 3600000));
  return {
    porMes: porMes(recebidas.map((e) => [e.criadoEm]), desde, meses),
    total: recebidas.length,
    horasMediaRetirada: horas === null ? null : Math.round(horas),
    paradas
  };
}

module.exports = { resumo, porMes, inicioPeriodo, periodo };
