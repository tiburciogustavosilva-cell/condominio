/** Tenta reconhecer a transportadora pelo formato do código de rastreio, pra preencher sozinho. */
export function remetenteDoCodigo(codigo: string): string | null {
  const c = codigo.trim().toUpperCase();
  if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(c)) return 'Correios';
  return null;
}
