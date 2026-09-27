/** Todas as fotos saem com o mesmo tamanho: quadrado LADO×LADO. */
export const LADO_FOTO = 1024;

/**
 * Converte qualquer foto (câmera do celular, jpg, png…) para .webp LADO_FOTO×LADO_FOTO, como data URL.
 * A imagem é encaixada inteira (sem cortar a etiqueta) e centralizada; a sobra vira fundo neutro.
 * Com `carimbo`, o texto (ex.: data/hora) fica gravado no canto da própria imagem.
 */
export async function paraWebp(
  arquivo: File,
  { carimbo, qualidade = 0.8 }: { carimbo?: string; qualidade?: number } = {}
): Promise<string> {
  const img = await createImageBitmap(arquivo);
  const escala = LADO_FOTO / Math.max(img.width, img.height);
  const largura = Math.round(img.width * escala);
  const altura = Math.round(img.height * escala);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = LADO_FOTO;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f4f4f5';
  ctx.fillRect(0, 0, LADO_FOTO, LADO_FOTO);
  ctx.drawImage(img, (LADO_FOTO - largura) / 2, (LADO_FOTO - altura) / 2, largura, altura);
  if (carimbo) {
    // faixa escura no rodapé garante leitura em foto clara ou escura
    ctx.font = 'bold 36px system-ui, sans-serif';
    const margem = 20;
    const larguraTexto = ctx.measureText(carimbo).width;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(
      LADO_FOTO - larguraTexto - margem * 2,
      LADO_FOTO - 36 - margem * 2,
      larguraTexto + margem * 2,
      36 + margem * 2
    );
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'bottom';
    ctx.fillText(carimbo, LADO_FOTO - larguraTexto - margem, LADO_FOTO - margem);
  }
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/webp', qualidade));
  // Navegador sem encoder WebP devolve PNG no lugar — o backend recusaria.
  if (!blob || blob.type !== 'image/webp') throw new Error('Este navegador não consegue gerar a foto em .webp');
  return new Promise((ok, erro) => {
    const leitor = new FileReader();
    leitor.onload = () => ok(leitor.result as string);
    leitor.onerror = () => erro(leitor.error);
    leitor.readAsDataURL(blob);
  });
}
