import { useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Emblema + wordmark "ALPHA CONDOMÍNIOS", igual ao header da landing page. */
export function Brand({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img src="/brand/emblema.png" alt={compact ? 'Alpha Condomínios' : ''} className="h-auto w-11 shrink-0 dark:hidden" />
      <img src="/brand/emblema-dark.png" alt={compact ? 'Alpha Condomínios' : ''} className="hidden h-auto w-11 shrink-0 dark:block" />
      {!compact && (
        <span className="font-brand leading-none text-foreground">
          <b className="block text-lg font-bold tracking-[0.06em]">ALPHA</b>
          <span className="mt-0.5 block text-[8px] font-semibold tracking-[0.32em]">CONDOMÍNIOS</span>
        </span>
      )}
    </div>
  );
}

/** Painel lateral das telas de login/cadastro: logo, chamada e mascote (hero da LP) ou vídeo. */
export function BrandPanel({ title, children, video }: { title: ReactNode; children: ReactNode; video?: string }) {
  const reduzirMovimento = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mudo, setMudo] = useState(true);

  function alternarSom() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !mudo;
    // ligou o som depois do vídeo acabar: toca de novo, agora com áudio
    if (mudo && v.ended) v.currentTime = 0;
    if (mudo) v.play();
    setMudo(!mudo);
  }

  return (
    <div className="relative hidden overflow-hidden border-r bg-background p-12 lg:flex lg:flex-col lg:justify-between">
      <Brand />
      <div className="relative z-10 space-y-4">
        <h1 className="font-heading text-4xl font-black leading-tight text-foreground">{title}</h1>
        <p className="max-w-md text-muted-foreground">{children}</p>
      </div>
      {video && !reduzirMovimento ? (
        // começa mudo (navegador bloqueia autoplay com som); o botão liga o áudio
        <div className="relative">
          <video
            ref={videoRef}
            src={video}
            autoPlay
            muted
            playsInline
            preload="auto"
            aria-hidden
            className="aspect-video w-full rounded-2xl bg-muted object-cover shadow-lg"
          />
          <button
            type="button"
            onClick={alternarSom}
            aria-label={mudo ? 'Ativar som do vídeo' : 'Desativar som do vídeo'}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-black/70"
          >
            {mudo ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {mudo ? 'Ativar som' : 'Som ligado'}
          </button>
        </div>
      ) : (
        <div className="relative mx-auto w-full max-w-xs">
          <div className="absolute inset-[8%] rounded-full bg-white dark:bg-white/5" />
          <img
            src="/brand/mascote.png"
            alt="Mascote da Alpha Condomínios: uma águia sorridente de camisa polo azul acenando"
            className="relative w-full drop-shadow-[0_18px_24px_hsl(213_72%_16%/0.12)]"
          />
        </div>
      )}
      <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Alpha Condomínios</p>
    </div>
  );
}
