const prisma = require('../models/prisma');
const { isSindico, condominioDe } = require('../utils/acesso');
const { statusManutencao } = require('../utils/recorrencia');
const avisosService = require('./avisos.service');

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
  if (sindico) {
    const [unidades, moradores, planos] = await Promise.all([
      prisma.unidade.count({ where: { condominioId } }),
      prisma.profile.count({ where: { condominioId, papel: { notIn: ['administradora', 'funcionario'] } } }),
      prisma.manutencao.findMany({ where: { condominioId, ativo: true } })
    ]);
    totais = { unidades, moradores };
    manutencoes = { vencidas: 0, proximas: 0 };
    for (const m of planos) {
      const { status } = statusManutencao(m);
      if (status === 'vencida') manutencoes.vencidas++;
      else if (status === 'proxima') manutencoes.proximas++;
    }
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
    avisos
  };
}

module.exports = { resumo };
