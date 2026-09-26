import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Web Speech API: nativa no Chrome/Edge/Safari (o áudio é transcrito pelo serviço do navegador). Firefox não tem.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Reconhecimento: any =
  typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

/** Junta o texto ditado ao que já estava no campo. */
export const juntarDitado = (atual: string, ditado: string) => (atual.trim() ? `${atual.trim()} ${ditado}` : ditado);

/**
 * Botão de microfone: grava enquanto ativo e entrega cada trecho transcrito (pt-BR) em `onTexto`.
 * Some sozinho em navegador sem suporte.
 */
export function BotaoDitado({ onTexto, className }: { onTexto: (texto: string) => void; className?: string }) {
  const [gravando, setGravando] = useState(false);
  const reconhecimento = useRef<any>(null);
  const onTextoRef = useRef(onTexto);
  onTextoRef.current = onTexto;

  useEffect(() => () => reconhecimento.current?.abort(), []);

  if (!Reconhecimento) return null;

  function alternar() {
    if (gravando) {
      reconhecimento.current?.stop();
      return;
    }
    const r = new Reconhecimento();
    r.lang = 'pt-BR';
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e: any) => {
      let texto = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) texto += e.results[i][0].transcript;
      }
      if (texto.trim()) onTextoRef.current(texto.trim());
    };
    r.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast.error('Permita o uso do microfone no navegador');
      else if (e.error !== 'no-speech' && e.error !== 'aborted') toast.error('Não foi possível transcrever o áudio');
    };
    r.onend = () => setGravando(false);
    reconhecimento.current = r;
    r.start();
    setGravando(true);
  }

  return (
    <Button
      type="button"
      size="icon"
      variant={gravando ? 'destructive' : 'outline'}
      onClick={alternar}
      aria-label={gravando ? 'Parar gravação' : 'Ditar por voz'}
      aria-pressed={gravando}
      title={gravando ? 'Parar gravação' : 'Ditar por voz'}
      className={cn('shrink-0', gravando && 'animate-pulse', className)}
    >
      {gravando ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}
