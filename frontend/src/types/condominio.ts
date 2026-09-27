/**
 * Types + enums + labels compartilhados entre páginas, hooks e componentes.
 * Espelha as respostas da API (backend/prisma/schema.prisma). IDs são uuid (string).
 */

export type Papel = 'sindico' | 'condomino' | 'administradora' | 'funcionario';

/** Cargos de funcionário (espelha CARGOS em backend/src/utils/acesso.js). */
export type Cargo = 'porteiro' | 'zelador' | 'limpeza' | 'jardineiro' | 'manutencao' | 'seguranca' | 'outro';
/** Cargos que usam Encomendas (espelha CARGOS_PORTARIA no backend). */
export const CARGOS_PORTARIA: Cargo[] = ['porteiro'];

export interface Funcionario {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cargo: Cargo;
  criadoEm: string;
}

export type Recorrencia = 'diaria' | 'semanal' | 'mensal' | 'unica';

/** Tarefa recorrente atribuída a um cargo (cadastro do síndico). */
export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string;
  cargo: Cargo;
  recorrencia: Recorrencia;
  /** semanal: 0=dom … 6=sáb */
  diasSemana: number[];
  diaMes: number | null;
  /** unica: "YYYY-MM-DD" */
  data: string | null;
  ativa: boolean;
  /** Quantas vezes já foi concluída (só no cadastro). */
  execucoes?: number;
}

export interface ExecucaoTarefa {
  id: string;
  data: string;
  concluidaEm: string;
  concluidaPor: PessoaComFuncao | null;
  observacao: string;
  /** ids das fotos (GET /tarefas/fotos/:id) */
  fotos: string[];
  tarefa?: { titulo: string; cargo: Cargo };
}

/** Tarefa no painel do dia, com a execução de hoje (se já feita). */
export interface TarefaDoDia extends Tarefa {
  devidaEm: string;
  atrasada: boolean;
  execucao: ExecucaoTarefa | null;
}

export type PessoaComFuncao = { nome: string; papel: Papel; cargo: Cargo | null };

export interface Administradora {
  id: string;
  nome: string;
  cnpj: string;
}

export interface Condominio {
  id: string;
  nome: string;
  endereco: string;
  cnpj: string;
  temBlocos: boolean;
  qtdBlocos: number | null;
  temComercio: boolean;
  qtdComercio: number | null;
  temAreasReserva: boolean;
  temPorteiro: boolean;
  onboardingConcluido: boolean;
}

export interface RespostasOnboarding {
  temBlocos: boolean;
  qtdBlocos: number | null;
  temComercio: boolean;
  qtdComercio: number | null;
  temAreasReserva: boolean;
  temPorteiro: boolean;
}

export interface Unidade {
  id: string;
  numero: string;
  bloco: string;
  tipo: string;
  fracaoIdeal: number;
  /** Peso do voto nas assembleias (padrão 1 = um voto normal; pode ser outro inteiro ou fração). */
  pesoVoto: number;
  moradores?: string[];
}

export interface Area {
  id: string;
  nome: string;
  descricao: string;
  capacidade: number;
  taxa: number;
  horario: string;
}

export interface Morador {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  papel: Papel;
  unidadeId: string | null;
}

export type StatusChamado = 'aberto' | 'em_andamento' | 'concluido';
export type Prioridade = 'baixa' | 'media' | 'alta';

export interface Comentario {
  id: string;
  autorId: string;
  autorNome: string;
  texto: string;
  criadoEm: string;
}

export interface Chamado {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  status: StatusChamado;
  prioridade: Prioridade;
  usuarioId: string;
  unidadeId: string | null;
  autorNome?: string;
  comentarios?: Comentario[];
  criadoEm: string;
  atualizadoEm: string;
}

export interface Ocorrencia {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  status: StatusChamado;
  usuarioId: string;
  unidadeId: string | null;
  autorNome?: string;
  unidadeLabel?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Aviso {
  id: string;
  titulo: string;
  mensagem: string;
  fixado: boolean;
  autorId: string;
  autorNome?: string;
  criadoEm: string;
}

export type Periodo = 'manha' | 'tarde' | 'noite' | 'dia_todo';
export type StatusReserva = 'pendente' | 'aprovada' | 'rejeitada' | 'cancelada';

export interface Reserva {
  id: string;
  areaId: string;
  usuarioId: string;
  unidadeId: string | null;
  data: string;
  periodo: Periodo;
  status: StatusReserva;
  observacao: string;
  areaNome?: string;
  taxa?: number;
  solicitante?: string;
  unidadeLabel?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export type StatusEncomenda = 'aguardando' | 'entregue';

export interface EncomendaAutorizado {
  id: string;
  nome: string;
  criadoEm: string;
}

export interface Encomenda {
  id: string;
  unidadeId: string;
  descricao: string;
  remetente: string;
  status: StatusEncomenda;
  /** Quem retirou (nome registrado pela portaria junto com o código). */
  recebidoPor: string | null;
  unidadeLabel?: string;
  /** Código de rastreio da etiqueta (opcional). */
  codigoRastreio: string | null;
  /** Usuário (portaria/síndico) que registrou no sistema; null se foi removido. */
  registradoPor: PessoaComFuncao | null;
  /** Funcionário que liberou a retirada (conferiu o código). */
  liberadoPor: PessoaComFuncao | null;
  /** Travada após 5 códigos errados — só o síndico desbloqueia. */
  bloqueada: boolean;
  volumeGrande: boolean;
  perecivel: boolean;
  /** Só vem para o morador da unidade, e só enquanto aguardando. */
  codigoRetirada?: string | null;
  /** Terceiros que o morador autoriza a retirar (empregada, parente...) — só referência pra portaria. */
  autorizados: EncomendaAutorizado[];
  temFoto: boolean;
  criadoEm: string;
  entregueEm: string | null;
}

export interface Prestador {
  id: string;
  nome: string;
  email: string;
  servico: string;
  empresa: string;
  telefone: string;
  observacao: string;
  manutencoes?: number;
  criadoEm: string;
}

export type FrequenciaUnidade = 'semanal' | 'mensal' | 'anual';
export type StatusManutencao = 'em_dia' | 'proxima' | 'vencida';

export interface HistoricoManutencao {
  tipo: 'lembrete' | 'realizada';
  data: string;
  em: string;
  detalhe: string;
}

export type TipoManutencao = 'preventiva' | 'corretiva' | 'preditiva';
export type PrioridadeManutencao = 'baixa' | 'media' | 'alta' | 'critica';
export type StatusPlano = 'programada' | 'em_andamento' | 'concluida' | 'atrasada' | 'cancelada';
export type Categoria = 'eletrica' | 'hidraulica' | 'elevadores' | 'incendio' | 'climatizacao' | 'civil' | 'outros';

export interface Manutencao {
  id: string;
  prestadorId: string;
  titulo: string;
  descricao: string;
  ultimaManutencao: string;
  frequenciaUnidade: FrequenciaUnidade;
  frequenciaIntervalo: number;
  diasAntecedencia: number;
  ativo: boolean;
  ultimoLembreteCiclo: string | null;
  historico: HistoricoManutencao[];
  prestadorNome?: string;
  prestadorEmail?: string;
  proximaManutencao?: string | null;
  diasParaProxima?: number | null;
  /** Status calculado a partir do prazo (em_dia/proxima/vencida) — não confundir com statusManual. */
  status?: StatusManutencao;
  // Campos do "Plano de Manutenção" (ver planilha modelo)
  ativoId: string | null;
  ativoNome?: string;
  tipo: TipoManutencao;
  prioridade: PrioridadeManutencao;
  /** Status do fluxo de trabalho, definido manualmente pelo síndico. */
  statusManual: StatusPlano;
  custoPrevisto: number | null;
  numeroOs: string | null;
  criadoEm: string;
}

export interface Ativo {
  id: string;
  codigo: string;
  nome: string;
  categoria: Categoria;
  localizacao: string;
  fabricanteModelo: string;
  numeroSerie: string;
  dataInstalacao: string | null;
  vidaUtilAnos: number | null;
  responsavel: string;
  observacoes: string;
  criadoEm: string;
}

export interface OrdemServico {
  id: string;
  numeroOs: string | null;
  dataAbertura: string;
  dataExecucao: string | null;
  ativoId: string | null;
  ativoNome?: string;
  tipo: TipoManutencao;
  descricao: string;
  diagnostico: string;
  acaoExecutada: string;
  responsavel: string;
  prioridade: PrioridadeManutencao;
  status: StatusPlano;
  custoMaterial: number;
  custoMaoDeObra: number;
  custoTotal: number;
  observacoes: string;
  criadoEm: string;
}

export interface Perfil {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  papel: Papel;
  unidade: { bloco: string; numero: string } | null;
}

export interface DashboardResumo {
  chamados: { aberto: number; em_andamento: number; concluido: number };
  reservas: { pendentes: number; proximas: number };
  encomendas: { aguardando: number };
  manutencoes: { vencidas: number; proximas: number } | null;
  totais: { unidades: number; moradores: number } | null;
  avisos: Aviso[];
}

export const LABEL = {
  papel: {
    sindico: 'Síndico',
    condomino: 'Condômino',
    administradora: 'Administradora',
    funcionario: 'Funcionário'
  } as Record<string, string>,
  cargo: {
    porteiro: 'Porteiro',
    zelador: 'Zelador',
    limpeza: 'Limpeza / Faxina',
    jardineiro: 'Jardineiro',
    manutencao: 'Manutenção',
    seguranca: 'Segurança',
    outro: 'Outro'
  } as Record<string, string>,
  recorrencia: {
    diaria: 'Todo dia',
    semanal: 'Dias da semana',
    mensal: 'Mensal',
    unica: 'Uma vez'
  } as Record<string, string>,
  diaSemana: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  periodo: {
    manha: 'Manhã',
    tarde: 'Tarde',
    noite: 'Noite',
    dia_todo: 'Dia todo'
  } as Record<string, string>,
  frequencia: {
    semanal: 'Semanal',
    mensal: 'Mensal',
    anual: 'Anual'
  } as Record<string, string>,
  tipoManutencao: {
    preventiva: 'Preventiva',
    corretiva: 'Corretiva',
    preditiva: 'Preditiva'
  } as Record<string, string>,
  prioridadeManutencao: {
    baixa: 'Baixa',
    media: 'Média',
    alta: 'Alta',
    critica: 'Crítica'
  } as Record<string, string>,
  statusPlano: {
    programada: 'Programada',
    em_andamento: 'Em andamento',
    concluida: 'Concluída',
    atrasada: 'Atrasada',
    cancelada: 'Cancelada'
  } as Record<string, string>,
  categoria: {
    eletrica: 'Elétrica',
    hidraulica: 'Hidráulica',
    elevadores: 'Elevadores',
    incendio: 'Incêndio',
    climatizacao: 'Climatização',
    civil: 'Civil',
    outros: 'Outros'
  } as Record<string, string>,
  categoriaOcorrencia: {
    barulho: 'Barulho',
    seguranca: 'Segurança',
    convivencia: 'Convivência',
    dano: 'Dano/Estrutura',
    outro: 'Outro'
  } as Record<string, string>
};

/** "Porteiro João", "Síndico Maria": cargo (funcionário) ou papel antes do nome. */
export function nomeComFuncao(p: { nome: string; papel: Papel; cargo?: Cargo | null }) {
  const funcao = (p.cargo && LABEL.cargo[p.cargo]) || LABEL.papel[p.papel];
  return funcao ? `${funcao} ${p.nome}` : p.nome;
}

/** "Toda seg, qua", "Todo dia 5", "Em 10/10/2026"… */
export function textoRecorrencia(t: Pick<Tarefa, 'recorrencia' | 'diasSemana' | 'diaMes' | 'data'>) {
  switch (t.recorrencia) {
    case 'diaria':
      return 'Todo dia';
    case 'semanal':
      return 'Toda ' + t.diasSemana.map((d) => LABEL.diaSemana[d].toLowerCase()).join(', ');
    case 'mensal':
      return `Todo dia ${t.diaMes} do mês`;
    case 'unica':
      return t.data ? `Em ${t.data.split('-').reverse().join('/')}` : 'Uma vez';
  }
}

// ---------- Votações (assembleias) ----------

export type StatusPauta = 'rascunho' | 'votando' | 'encerrada';

export interface AssembleiaResumo {
  id: string;
  titulo: string;
  status: 'aberta' | 'encerrada';
  criadoEm: string;
  encerradaEm: string | null;
  presentes: number;
  pautas: number;
}

export interface Pauta {
  id: string;
  titulo: string;
  descricao: string;
  ordem: number;
  status: StatusPauta;
  /**
   * Só o total por opção (o voto é secreto) e só depois de encerrada: em votação, `votos`/`pesoVotos` vêm null.
   * `votos` conta unidades (1 unidade = 1); `pesoVotos` soma o peso do voto de cada unidade — é o que decide
   * o resultado (ver `pesoVoto` no cadastro da unidade).
   */
  opcoes: { id: string; texto: string; votos: number | null; pesoVotos: number | null }[];
  /** Quantas unidades já votaram. */
  votantes: number;
}

/** Estado da assembleia (GET /assembleias/:id), recarregado a cada 2 s. */
export interface Assembleia extends Omit<AssembleiaResumo, 'pautas'> {
  totalUnidades: number;
  /** Soma do peso do voto de todas as unidades do condomínio / das presentes — decide o quórum de verdade. */
  pesoTotal: number;
  pesoPresente: number;
  pautas: Pauta[];
  minhaUnidade: { presente: boolean; pautasVotadas: string[] } | null;
  /** Só síndico. */
  presencas?: { manual: boolean; criadoEm: string; unidade: { id: string; numero: string; bloco: string } }[];
  /** Só síndico: registro (ata) de procurações concedidas nessa assembleia. */
  procuracoes?: {
    id: string;
    criadoEm: string;
    unidadeOutorgante: { id: string; numero: string; bloco: string };
    unidadeProcuradora: { id: string; numero: string; bloco: string };
  }[];
  /** Só síndico, com a assembleia aberta: código de check-in que troca a cada minuto. */
  codigo?: string;
  codigoExpiraEm?: string;
  /** Só síndico: token do QR do telão (vale 10 min, dá tempo de fazer login). */
  qr?: string;
  agora?: string;
}
