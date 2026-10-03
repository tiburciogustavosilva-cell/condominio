/**
 * Guia de referência: normas e periodicidade usuais de manutenção predial no Brasil.
 * Conteúdo estático, só pra consulta — não tem CRUD nem persistência no banco.
 */

export type GrupoRegulamentacao = 'incendio' | 'agua' | 'elevadores' | 'eletrica' | 'estrutural' | 'lazer' | 'gas';

export interface RegraManutencao {
  equipamento: string;
  grupo: GrupoRegulamentacao;
  norma: string;
  periodicidade: string;
  observacao: string;
}

export const GRUPOS: Record<GrupoRegulamentacao, string> = {
  incendio: 'Incêndio',
  agua: 'Água / Hidráulica',
  elevadores: 'Elevadores',
  eletrica: 'Elétrica / SPDA',
  estrutural: 'Estrutural',
  lazer: 'Lazer',
  gas: 'Gás'
};

export const AVISO_REGULAMENTACAO =
  'Guia geral de referência — não substitui a legislação municipal/estadual nem o laudo de um profissional habilitado. Confirme prazos e exigências locais antes de se basear só nisso aqui.';

export const REGULAMENTACOES: RegraManutencao[] = [
  {
    equipamento: 'Extintores de incêndio',
    grupo: 'incendio',
    norma: 'NBR 12962 · Corpo de Bombeiros (AVCB)',
    periodicidade: 'Inspeção visual mensal · recarga anual · teste hidrostático a cada 5 anos',
    observacao: 'O prazo de recarga varia pelo agente extintor (pó, água, CO2, espuma); confira o selo do INMETRO.'
  },
  {
    equipamento: 'Sistema de hidrantes e mangueiras',
    grupo: 'incendio',
    norma: 'NBR 13714',
    periodicidade: 'Teste de acionamento mensal · manutenção completa anual',
    observacao: 'As mangueiras têm teste hidrostático trienal.'
  },
  {
    equipamento: 'Portas corta-fogo',
    grupo: 'incendio',
    norma: 'NBR 11742',
    periodicidade: 'Inspeção semestral',
    observacao: 'Verificar molas, barras antipânico e vedação.'
  },
  {
    equipamento: 'Piscinas',
    grupo: 'lazer',
    norma: 'Vigilância Sanitária municipal/estadual · NBR 10339',
    periodicidade: 'Análise da água diária (cloro/pH) · limpeza de filtro semanal · laudo técnico anual',
    observacao: 'As regras variam bastante por município — confira a vigilância sanitária local.'
  },
  {
    equipamento: 'Playground / brinquedos',
    grupo: 'lazer',
    norma: 'NBR 16071',
    periodicidade: 'Inspeção mensal · manutenção conforme o fabricante',
    observacao: 'Pisos de amortecimento e fixações são os pontos mais cobrados em vistoria.'
  },
  {
    equipamento: 'Elevadores',
    grupo: 'elevadores',
    norma: 'NBR 16083',
    periodicidade: 'Manutenção preventiva mensal por empresa credenciada · inspeção conforme idade do equipamento',
    observacao: 'Equipamentos mais antigos têm prazos de inspeção extraordinária mais curtos.'
  },
  {
    equipamento: 'Para-raios (SPDA)',
    grupo: 'eletrica',
    norma: 'NBR 5419',
    periodicidade: 'Inspeção visual anual · inspeção completa a cada 2–3 anos',
    observacao: 'Prédios mais altos ou críticos pedem inspeção mais frequente.'
  },
  {
    equipamento: 'Gerador de energia',
    grupo: 'eletrica',
    norma: 'Manual do fabricante · NBR 12300 (descarte do óleo)',
    periodicidade: 'Manutenção preventiva mensal/trimestral · teste de carga periódico',
    observacao: 'Não há uma norma nacional única — siga o manual do fabricante.'
  },
  {
    equipamento: 'Caixa d’água / reservatórios',
    grupo: 'agua',
    norma: 'Portaria de Consolidação nº 5/2017 (Ministério da Saúde) · NBR 5626',
    periodicidade: 'Limpeza e desinfecção semestral',
    observacao: 'Guarde o laudo/certificado da empresa que fez a limpeza.'
  },
  {
    equipamento: 'Central de gás (GLP/GN)',
    grupo: 'gas',
    norma: 'NBR 15526',
    periodicidade: 'Inspeção anual por empresa credenciada',
    observacao: 'Vazamento é emergência — não espere o ciclo programado.'
  },
  {
    equipamento: 'Estrutura e fachada (laudo técnico)',
    grupo: 'estrutural',
    norma: 'Lei municipal (varia por cidade) · NBR 16280 (reformas)',
    periodicidade: 'Laudo técnico a cada 5 anos (prazo comum — confira a lei do seu município)',
    observacao: 'Algumas cidades (ex.: São Paulo) já exigem laudo de fachada por lei específica.'
  }
];
