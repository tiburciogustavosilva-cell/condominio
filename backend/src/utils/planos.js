// Preço por unidade/mês e módulos de cada plano. O período de teste libera tudo.
const PLANOS = {
  basic: { nome: 'Basic', precoUnidade: 0.99, recursos: ['assembleias'] },
  pro: {
    nome: 'Pro',
    precoUnidade: 1.49,
    recursos: ['assembleias', 'avisos', 'ocorrencias', 'encomendas', 'chamados', 'reservas', 'funcionarios']
  },
  premium: {
    nome: 'Premium',
    precoUnidade: 1.99,
    recursos: [
      'assembleias', 'avisos', 'ocorrencias', 'encomendas', 'chamados', 'reservas', 'funcionarios',
      'tarefas', 'mapa', 'manutencoes'
    ]
  }
};

const TODOS_RECURSOS = [...new Set(Object.values(PLANOS).flatMap((p) => p.recursos))];

const MSG_TESTE_ENCERRADO = 'Período de teste encerrado — regularize a assinatura pra continuar';

const iso = (d) => new Date(d).toISOString();

/**
 * Decide o que o condomínio pode usar agora. `pagoAte` é o fim da última assinatura paga (Date ou null).
 * Enquanto o teste vale, todos os recursos; depois, só com assinatura vigente e só os do plano.
 * O motivo de bloqueio vindo do admin da plataforma tem prioridade sobre o do teste.
 */
function resumoDeAcesso({ plano, trialAte, pagoAte, bloqueadoMotivo }, agora = new Date()) {
  const hoje = iso(agora).slice(0, 10);
  const emTeste = iso(trialAte) > iso(agora);
  const assinado = !!pagoAte && iso(pagoAte).slice(0, 10) >= hoje;
  const liberado = emTeste || assinado;
  return {
    bloqueadoMotivo: bloqueadoMotivo || (liberado ? null : MSG_TESTE_ENCERRADO),
    acesso: {
      emTeste,
      liberado,
      trialAte,
      pagoAte: assinado ? pagoAte : null,
      recursos: emTeste ? TODOS_RECURSOS : (PLANOS[plano]?.recursos ?? [])
    }
  };
}

module.exports = { PLANOS, TODOS_RECURSOS, resumoDeAcesso };
