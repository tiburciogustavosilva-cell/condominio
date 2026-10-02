const prisma = require('../models/prisma');
const { isSindico, condominioDe } = require('../utils/acesso');
const { statusManutencao } = require('../utils/recorrencia');
const avisosService = require('./avisos.service');
const tarefasService = require('./tarefas.service');

/** Mesmo corte da tela de Encomendas: a partir daqui a encomenda conta como parada. */
const DIAS_PARADA = 3;

// Conta por status numa lista de { status, _count } do groupBy.
const contar = (grupos, status) => grupos.find((g) => g.status === status)?._count._all ?? 0;

/** Substitui a RPC dashboard_resumo + contagem de manutenções do hook antigo. */
async function resumo(usuario) {
  const condominioId = condominioDe(usuario);
  const sindico = isSindico(usuario);
  const doUsuario = sindico ? {} : { usuarioId: usuario.id };
  const hoje = new Date(new Date().toISOString().slice(0, 10));

  const [chamados, reservas, proximasReservas, encomendas, avisos] = await Promise.all([
    prisma.chamado.groupBy({ by: ['status'], where: { condominioId, ...doUsuario }, _count: { _all: true } }),
    prisma.reserva.count({ where: { condominioId, ...doUsuario, status: 'pendente' } }),
    prisma.reserva.count({ where: { condominioId, ...doUsuario, status: 'aprovada', data: { gte: hoje } } }),
    sindico || usuario.unidadeId
      ? prisma.encomenda.count({
          where: { condominioId, status: 'aguardando', ...(sindico ? {} : { unidadeId: usuario.unidadeId }) }
        })
      : 0,
    avisosService.listar(usuario, 4)
  ]);

  let totais = null;
  let manutencoes = null;
  let sindicoExtra = null;
  if (sindico) {
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const [
      unidades, moradores, funcionarios, unidadesVazias, planos,
      ocorrencias, ocorrenciasRecentes, paradas, assembleia, ordensAbertas, custoMes, tarefasHoje
    ] = await Promise.all([
      prisma.unidade.count({ where: { condominioId } }),
      prisma.profile.count({ where: { condominioId, papel: { notIn: ['administradora', 'funcionario'] } } }),
      prisma.profile.count({ where: { condominioId, papel: 'funcionario' } }),
      prisma.unidade.count({ where: { condominioId, profiles: { none: {} } } }),
      prisma.manutencao.findMany({
        where: { condominioId, ativo: true, statusManual: { notIn: ['concluida', 'cancelada'] } },
        include: { prestadores: { select: { prestador: { select: { nome: true } } } } }
      }),
      prisma.ocorrencia.groupBy({ by: ['status'], where: { condominioId }, _count: { _all: true } }),
      prisma.ocorrencia.findMany({
        where: { condominioId, status: { not: 'concluido' } },
        select: { id: true, titulo: true, categoria: true, status: true, criadoEm: true },
        orderBy: { criadoEm: 'desc' },
        take: 4
      }),
      prisma.encomenda.count({
        where: { condominioId, status: 'aguardando', criadoEm: { lt: new Date(Date.now() - DIAS_PARADA * 86400000) } }
      }),
      prisma.assembleia.findFirst({ where: { condominioId, status: 'aberta' }, select: { id: true, titulo: true } }),
      prisma.ordemServico.count({ where: { condominioId, status: { notIn: ['concluida', 'cancelada'] } } }),
      prisma.ordemServico.aggregate({
        where: { condominioId, dataExecucao: { gte: inicioMes } },
        _sum: { custoMaterial: true, custoMaoDeObra: true }
      }),
      tarefasService.doDia(usuario)
    ]);
    totais = { unidades, moradores, funcionarios, unidadesVazias };

    manutencoes = { vencidas: 0, proximas: 0 };
    const agenda = [];
    for (const m of planos) {
      const { status, proxima, dias } = statusManutencao(m);
      if (status === 'vencida') manutencoes.vencidas++;
      else if (status === 'proxima') manutencoes.proximas++;
      if (proxima) {
        const prestadorNome = m.prestadores.map((p) => p.prestador.nome).join(', ');
        agenda.push({ id: m.id, titulo: m.titulo, prestadorNome, proxima, dias, status });
      }
    }
    agenda.sort((a, b) => a.dias - b.dias);

    const lista = tarefasHoje.tarefas;
    sindicoExtra = {
      ocorrencias: {
        aberto: contar(ocorrencias, 'aberto'),
        em_andamento: contar(ocorrencias, 'em_andamento'),
        recentes: ocorrenciasRecentes
      },
      encomendasParadas: paradas,
      assembleiaAberta: assembleia,
      tarefasHoje: {
        total: lista.length,
        feitas: lista.filter((t) => t.execucao).length,
        atrasadas: lista.filter((t) => t.atrasada).length
      },
      proximasManutencoes: agenda.slice(0, 5),
      ordensAbertas,
      custoMes: Number(custoMes._sum.custoMaterial ?? 0) + Number(custoMes._sum.custoMaoDeObra ?? 0)
    };
  }

  return {
    chamados: {
      aberto: contar(chamados, 'aberto'),
      em_andamento: contar(chamados, 'em_andamento'),
      concluido: contar(chamados, 'concluido')
    },
    reservas: { pendentes: reservas, proximas: proximasReservas },
    encomendas: { aguardando: encomendas },
    totais,
    manutencoes,
    sindico: sindicoExtra,
    avisos
  };
}

module.exports = { resumo };
