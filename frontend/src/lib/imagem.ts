/** Todas as fotos saem com o mesmo tamanho: quadrado LADO×LADO. */
export const LADO_FOTO = 1024;

/**
 * Converte qualquer foto (câmera do celular, jpg, png…) para .webp LADO_FOTO×LADO_FOTO, como data URL.
 * A imagem é encaixada inteira (sem cortar a etiqueta) e centralizada; a sobra vira fundo neutro.
 */
export async function paraWebp(arquivo: File, qualidade = 0.8): Promise<string> {
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
