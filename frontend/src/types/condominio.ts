/**
 * Types + enums + labels compartilhados entre páginas, hooks e componentes.
 * Espelha as tabelas do Supabase (ver supabase/migrations/). IDs são uuid (string).
 */

export type Papel = 'sindico' | 'condomino';

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

export interface Encomenda {
  id: string;
  unidadeId: string;
  descricao: string;
  remetente: string;
  status: StatusEncomenda;
  recebidoPor: string | null;
  unidadeLabel?: string;
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
  papel: { sindico: 'Síndico', condomino: 'Condômino' } as Record<string, string>,
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
  } as Record<string, string>
};
