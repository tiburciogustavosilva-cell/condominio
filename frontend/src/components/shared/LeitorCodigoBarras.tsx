import { useEffect, useRef, useState } from 'react';
import { Barcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// BarcodeDetector: nativo no Chrome/Edge/Android. Safari/Firefox não têm — o botão some.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DetectorNativo: any = typeof window !== 'undefined' ? (window as any).BarcodeDetector : null;

const FORMATOS = ['code_128', 'code_39', 'ean_13', 'ean_8', 'itf', 'upc_a', 'upc_e', 'codabar'];

/**
 * Botão que abre a câmera e lê o código de barras da etiqueta (Correios, transportadora...).
 * Ao detectar, entrega o código em `onCodigo` e fecha sozinho.
 */
export function BotaoLeitorCodigoBarras({
  onCodigo,
  className
}: {
  onCodigo: (codigo: string) => void;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCodigoRef = useRef(onCodigo);
  onCodigoRef.current = onCodigo;

  useEffect(() => {
    if (!aberto) return;
    setErro(null);
    let parado = false;
    let frame = 0;
    let stream: MediaStream | null = null;
    let detector: any;
    try {
      detector = new DetectorNativo({ formats: FORMATOS });
    } catch {
      setErro('Seu navegador não suporta leitura automática — digite o código manualmente.');
      return;
    }

    async function tick() {
      if (parado || !videoRef.current) return;
      try {
        const [codigo] = await detector.detect(videoRef.current);
        if (codigo?.rawValue) {
          onCodigoRef.current(codigo.rawValue.trim().toUpperCase());
          setAberto(false);
          return;
        }
      } catch {
        // frame ilegível (ex.: vídeo ainda carregando) — tenta o próximo
      }
      frame = requestAnimationFrame(tick);
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        if (parado) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
        }
        tick();
      })
      .catch(() => setErro('Permita o uso da câmera para escanear o código de barras.'));

    return () => {
      parado = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [aberto]);

  if (!DetectorNativo) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setAberto(true)}
        aria-label="Escanear código de barras"
        title="Escanear código de barras"
        className={cn('shrink-0', className)}
      >
        <Barcode className="h-4 w-4" />
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escanear código de barras</DialogTitle>
          </DialogHeader>
          {erro ? (
            <p className="text-sm text-muted-foreground">{erro}</p>
          ) : (
            <div className="space-y-2">
              <div className="overflow-hidden rounded-md bg-black">
                <video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Aponte a câmera para o código de barras da etiqueta
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
