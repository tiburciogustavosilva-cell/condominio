const MAX_BYTES = 8 * 1024 * 1024; // 8 MB — mesmo limite do backend

/** Lê qualquer arquivo como data URL (base64), sem conversão — usado pra anexos (PDF, foto de nota fiscal/orçamento). */
export function lerComoDataUrl(arquivo: File): Promise<string> {
  if (arquivo.size > MAX_BYTES) return Promise.reject(new Error('Arquivo muito grande (máx. 8 MB)'));
  return new Promise((ok, erro) => {
    const leitor = new FileReader();
    leitor.onload = () => ok(leitor.result as string);
    leitor.onerror = () => erro(leitor.error);
    leitor.readAsDataURL(arquivo);
  });
}
