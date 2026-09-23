import { dataCurta } from '@/lib/format';
import { LABEL } from '@/types/condominio';
import type { Ativo, Manutencao, OrdemServico } from '@/types/condominio';

/**
 * Gera um .xlsx no mesmo formato do modelo "Controle de Manutenções
 * Prediais": abas Cadastro, Plano de Manutenção, Registro de Serviços e
 * Dashboard. Roda 100% no navegador (biblioteca `xlsx`, só usada para
 * ESCREVER — nunca lemos arquivo de terceiro com ela, então os CVEs de
 * parsing dela não se aplicam aqui).
 *
 * `xlsx` é importado dinamicamente (~700KB) pra não engordar o bundle
 * principal — só baixa quando alguém clica em "Baixar relatório".
 */

function codigoAtivo(ativos: Ativo[], id: string | null) {
  return ativos.find((a) => a.id === id)?.codigo ?? '';
}

function nomeAtivo(ativos: Ativo[], id: string | null) {
  return ativos.find((a) => a.id === id)?.nome ?? '';
}

export async function gerarRelatorioXlsx({
  ativos,
  manutencoes,
  ordens
}: {
  ativos: Ativo[];
  manutencoes: Manutencao[];
  ordens: OrdemServico[];
}) {
  const XLSX = await import('xlsx');
  const planilha = (linhas: (string | number | null)[][]) => XLSX.utils.aoa_to_sheet(linhas);
  const wb = XLSX.utils.book_new();

  // ---- Cadastro ----
  const cadastro: (string | number | null)[][] = [
    ['CADASTRO DE EQUIPAMENTOS E ÁREAS'],
    [],
    [
      'Código',
      'Equipamento / Área',
      'Categoria',
      'Localização',
      'Fabricante / Modelo',
      'Nº Série / Patrimônio',
      'Data Instalação',
      'Vida Útil (anos)',
      'Responsável',
      'Observações'
    ],
    ...ativos.map((a) => [
      a.codigo,
      a.nome,
      LABEL.categoria[a.categoria] ?? a.categoria,
      a.localizacao,
      a.fabricanteModelo,
      a.numeroSerie,
      dataCurta(a.dataInstalacao),
      a.vidaUtilAnos,
      a.responsavel,
      a.observacoes
    ])
  ];
  XLSX.utils.book_append_sheet(wb, planilha(cadastro), 'Cadastro');

  // ---- Plano de Manutenção ----
  const plano: (string | number | null)[][] = [
    ['PLANO DE MANUTENÇÃO PREDIAL'],
    [],
    [
      'ID',
      'Código Equip.',
      'Equipamento / Área',
      'Tipo',
      'Atividade / Serviço',
      'Periodicidade',
      'Última Manutenção',
      'Próxima Manutenção',
      'Dias p/ Vencimento',
      'Prioridade',
      'Responsável / Empresa',
      'Status',
      'Custo Previsto (R$)',
      'Nº OS / Contrato',
      'Observações'
    ],
    ...manutencoes.map((m, i) => [
      i + 1,
      codigoAtivo(ativos, m.ativoId),
      m.ativoNome || nomeAtivo(ativos, m.ativoId),
      LABEL.tipoManutencao[m.tipo] ?? m.tipo,
      m.titulo,
      `${LABEL.frequencia[m.frequenciaUnidade] ?? m.frequenciaUnidade} (a cada ${m.frequenciaIntervalo})`,
      dataCurta(m.ultimaManutencao),
      dataCurta(m.proximaManutencao),
      m.diasParaProxima ?? '',
      LABEL.prioridadeManutencao[m.prioridade] ?? m.prioridade,
      m.prestadorNome ?? '',
      LABEL.statusPlano[m.statusManual] ?? m.statusManual,
      m.custoPrevisto ?? '',
      m.numeroOs ?? '',
      m.descricao
    ])
  ];
  XLSX.utils.book_append_sheet(wb, planilha(plano), 'Plano de Manutenção');

  // ---- Registro de Serviços ----
  const registro: (string | number | null)[][] = [
    ['REGISTRO DE SERVIÇOS DE MANUTENÇÃO'],
    [],
    [
      'Nº OS',
      'Data Abertura',
      'Data Execução',
      'Código Equip.',
      'Equipamento / Área',
      'Tipo',
      'Descrição da Ocorrência / Serviço',
      'Diagnóstico / Causa',
      'Ação Executada',
      'Responsável / Empresa',
      'Prioridade',
      'Status',
      'Custo Material (R$)',
      'Custo Mão de Obra (R$)',
      'Custo Total (R$)',
      'Observações'
    ],
    ...ordens.map((o) => [
      o.numeroOs ?? '',
      dataCurta(o.dataAbertura),
      dataCurta(o.dataExecucao),
      codigoAtivo(ativos, o.ativoId),
      o.ativoNome || nomeAtivo(ativos, o.ativoId),
      LABEL.tipoManutencao[o.tipo] ?? o.tipo,
      o.descricao,
      o.diagnostico,
      o.acaoExecutada,
      o.responsavel,
      LABEL.prioridadeManutencao[o.prioridade] ?? o.prioridade,
      LABEL.statusPlano[o.status] ?? o.status,
      o.custoMaterial,
      o.custoMaoDeObra,
      o.custoTotal,
      o.observacoes
    ])
  ];
  XLSX.utils.book_append_sheet(wb, planilha(registro), 'Registro de Serviços');

  // ---- Dashboard ----
  const hoje = new Date().toISOString().slice(0, 10);
  const vencidas = manutencoes.filter((m) => m.status === 'vencida').length;
  const vencem30 = manutencoes.filter((m) => (m.diasParaProxima ?? 999) >= 0 && (m.diasParaProxima ?? 999) <= 30).length;
  const porTipo = (tipo: string) => manutencoes.filter((m) => m.tipo === tipo).length;
  const custoPrevisto = manutencoes.reduce((s, m) => s + (m.custoPrevisto ?? 0), 0);
  const custoRealizado = ordens.reduce((s, o) => s + o.custoTotal, 0);

  const dash: (string | number | null)[][] = [
    ['DASHBOARD – MANUTENÇÃO PREDIAL'],
    [],
    ['INDICADOR', 'VALOR', '', 'TIPO', 'QTDE'],
    ['Equipamentos / áreas cadastrados', ativos.length, '', 'Preventiva', porTipo('preventiva')],
    ['Manutenções planejadas', manutencoes.length, '', 'Corretiva', porTipo('corretiva')],
    ['Preventivas', porTipo('preventiva'), '', 'Preditiva', porTipo('preditiva')],
    ['Corretivas', porTipo('corretiva')],
    ['Preditivas', porTipo('preditiva')],
    ['Vencidas', vencidas],
    ['Vencem em até 30 dias', vencem30],
    ['Custo previsto', custoPrevisto],
    ['Custo realizado', custoRealizado],
    [],
    [`Gerado em ${dataCurta(hoje)}`]
  ];
  XLSX.utils.book_append_sheet(wb, planilha(dash), 'Dashboard');

  XLSX.writeFile(wb, `Controle_Manutencoes_Prediais_${hoje}.xlsx`);
}
