import type { Condominio, Unidade } from '@/types/condominio';

export type MoradorImportado = {
  nome: string;
  email: string;
  senha: string;
  telefone: string;
  vinculo: string;
  unidadeId: string;
};

export type LinhaComErro = { erro: string };

const COL_NOME = 'Nome';
const COL_EMAIL = 'E-mail';
const COL_SENHA = 'Senha inicial';
const COL_TELEFONE = 'Telefone';
const COL_VINCULO = 'Vínculo (proprietario/inquilino/procurador)';
const COL_NUMERO_UNIDADE = 'Número da unidade';
const COL_BLOCO_UNIDADE = 'Bloco da unidade';

const VINCULOS_VALIDOS: Record<string, string> = {
  proprietario: 'proprietario',
  proprietário: 'proprietario',
  inquilino: 'inquilino',
  procurador: 'procurador'
};

function normalizarVinculo(valor: string) {
  return VINCULOS_VALIDOS[valor.trim().toLowerCase()] ?? 'proprietario';
}

/** Modelo .xlsx com as colunas certas pro condomínio — "Bloco da unidade" só aparece se ele tiver blocos. */
export async function baixarModeloMoradores(condominio: Condominio) {
  const XLSX = await import('xlsx');
  const cabecalho = [
    COL_NOME,
    COL_EMAIL,
    COL_SENHA,
    COL_TELEFONE,
    COL_VINCULO,
    COL_NUMERO_UNIDADE,
    ...(condominio.temBlocos ? [COL_BLOCO_UNIDADE] : [])
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([cabecalho]), 'Moradores');
  XLSX.writeFile(wb, 'modelo_moradores.xlsx');
}

/**
 * Lê a planilha preenchida. Nunca lança por linha ruim — nome/e-mail/senha em
 * branco (ou senha curta) fazem a linha ser ignorada; unidade não encontrada
 * só vira aviso e a pessoa é cadastrada sem unidade (dá pra ligar depois).
 */
export async function lerModeloMoradores(
  arquivo: File,
  condominio: Condominio,
  unidades: Unidade[]
): Promise<{ moradores: MoradorImportado[]; erros: LinhaComErro[] }> {
  const XLSX = await import('xlsx');
  const buffer = await arquivo.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const linhas: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const moradores: MoradorImportado[] = [];
  const erros: LinhaComErro[] = [];

  linhas.forEach((linha, i) => {
    const numeroLinha = i + 2;
    const nome = String(linha[COL_NOME] ?? '').trim();
    const email = String(linha[COL_EMAIL] ?? '').trim();
    const senha = String(linha[COL_SENHA] ?? '').trim();
    if (!nome || !email || !senha) {
      erros.push({ erro: `Linha ${numeroLinha}: nome, e-mail e senha são obrigatórios — ignorada` });
      return;
    }
    if (senha.length < 6) {
      erros.push({ erro: `Linha ${numeroLinha} (${email}): senha precisa ter pelo menos 6 caracteres — ignorada` });
      return;
    }

    const numeroUnidade = String(linha[COL_NUMERO_UNIDADE] ?? '').trim();
    const blocoUnidade = condominio.temBlocos ? String(linha[COL_BLOCO_UNIDADE] ?? '').trim() : '';
    let unidadeId = '';
    if (numeroUnidade) {
      const unidade = unidades.find(
        (u) =>
          u.numero.trim().toLowerCase() === numeroUnidade.toLowerCase() &&
          (!condominio.temBlocos || u.bloco.trim().toLowerCase() === blocoUnidade.toLowerCase())
      );
      if (unidade) unidadeId = unidade.id;
      else {
        erros.push({
          erro: `Linha ${numeroLinha} (${email}): unidade "${blocoUnidade ? blocoUnidade + ' ' : ''}${numeroUnidade}" não encontrada — cadastrado sem unidade`
        });
      }
    }

    moradores.push({
      nome,
      email,
      senha,
      telefone: String(linha[COL_TELEFONE] ?? '').trim(),
      vinculo: normalizarVinculo(String(linha[COL_VINCULO] ?? '')),
      unidadeId
    });
  });

  return { moradores, erros };
}
