import { dataHora } from '@/lib/format';
import { nomeComFuncao, type Encomenda } from '@/types/condominio';

/**
 * Relatório .xlsx das encomendas recebidas entre `de` e `ate` (datas "YYYY-MM-DD", inclusivas).
 * Mesmo esquema do relatório de Manutenção: `xlsx` importado só no clique.
 */
export async function gerarRelatorioEncomendas(encomendas: Encomenda[], de: string, ate: string) {
  const XLSX = await import('xlsx');
  const dia = (iso: string) => new Date(iso).toLocaleDateString('sv-SE'); // YYYY-MM-DD no fuso local
  const periodo = encomendas.filter((e) => dia(e.criadoEm) >= de && dia(e.criadoEm) <= ate);

  const linhas = [
    [
      'Recebida em',
      'Unidade',
      'Descrição',
      'Remetente',
      'Rastreio',
      'Volume grande',
      'Perecível',
      'Entregador',
      'Registrada por',
      'Status',
      'Retirada por',
      'Retirada em',
      'Liberada por'
    ],
    ...periodo.map((e) => [
      dataHora(e.criadoEm),
      e.unidadeLabel ?? '',
      e.descricao,
      e.remetente,
      e.codigoRastreio ?? '',
      e.volumeGrande ? 'Sim' : 'Não',
      e.perecivel ? 'Sim' : 'Não',
      e.entregadorNome ?? '',
      e.registradoPor ? nomeComFuncao(e.registradoPor) : '',
      e.status === 'entregue' ? 'Retirada' : e.bloqueada ? 'Bloqueada' : 'Aguardando',
      e.recebidoPor ?? '',
      e.entregueEm ? dataHora(e.entregueEm) : '',
      e.liberadoPor ? nomeComFuncao(e.liberadoPor) : ''
    ])
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(linhas), 'Encomendas');
  XLSX.writeFile(wb, `encomendas_${de}_a_${ate}.xlsx`);
  return periodo.length;
}
