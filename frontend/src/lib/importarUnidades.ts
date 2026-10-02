import type { Condominio } from '@/types/condominio';

export type UnidadeImportada = {
  numero: string;
  bloco: string;
  tipo: string;
  fracaoIdeal: string;
  pesoVoto: string;
  pontos: string;
};

export type LinhaComErro = { erro: string };

const COL_NUMERO = 'Número';
const COL_BLOCO = 'Bloco';
const COL_TIPO = 'Tipo (apartamento/casa/comercial/garagem)';
const COL_FRACAO = 'Fração ideal (%)';
const COL_PESO = 'Peso do voto';
const COL_PONTOS = 'Pontos';

const TIPOS_VALIDOS = ['apartamento', 'casa', 'comercial', 'garagem'];

function normalizarTipo(valor: string) {
  const t = valor.trim().toLowerCase();
  return TIPOS_VALIDOS.includes(t) ? t : 'apartamento';
}

/** Modelo .xlsx com as colunas certas pro condomínio — "Bloco" só aparece se ele tiver blocos. */
export async function baixarModeloUnidades(condominio: Condominio) {
  const XLSX = await import('xlsx');
  const cabecalho = [COL_NUMERO, ...(condominio.temBlocos ? [COL_BLOCO] : []), COL_TIPO, COL_FRACAO, COL_PESO, COL_PONTOS];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([cabecalho]), 'Unidades');
  XLSX.writeFile(wb, 'modelo_unidades.xlsx');
}

/** Lê a planilha preenchida. Nunca lança por linha ruim — só marca como erro e segue as demais. */
export async function lerModeloUnidades(
  arquivo: File,
  condominio: Condominio
): Promise<{ unidades: UnidadeImportada[]; erros: LinhaComErro[] }> {
  const XLSX = await import('xlsx');
  const buffer = await arquivo.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const linhas: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const unidades: UnidadeImportada[] = [];
  const erros: LinhaComErro[] = [];

  linhas.forEach((linha, i) => {
    const numeroLinha = i + 2; // +1 cabeçalho, +1 índice 0-based
    const numero = String(linha[COL_NUMERO] ?? '').trim();
    if (!numero) {
      erros.push({ erro: `Linha ${numeroLinha}: número em branco — ignorada` });
      return;
    }
    unidades.push({
      numero,
      bloco: condominio.temBlocos ? String(linha[COL_BLOCO] ?? '').trim() : '',
      tipo: normalizarTipo(String(linha[COL_TIPO] ?? '')),
      fracaoIdeal: String(linha[COL_FRACAO] ?? '').trim(),
      pesoVoto: String(linha[COL_PESO] ?? '').trim() || '1',
      pontos: String(linha[COL_PONTOS] ?? '').trim()
    });
  });

  return { unidades, erros };
}
