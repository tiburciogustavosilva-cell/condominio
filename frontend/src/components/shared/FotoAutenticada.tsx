import { useEffect, useState } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/** Imagem que exige o token (não dá pra usar a URL direto no <img>): baixa como blob e libera no unmount. */
export function FotoAutenticada({
  carregar,
  alt,
  className
}: {
  carregar: () => Promise<string>;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let atual: string | null = null;
    let vivo = true;
    carregar()
      .then((u) => (vivo ? setUrl((atual = u)) : URL.revokeObjectURL(u)))
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
      if (atual) URL.revokeObjectURL(atual);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const caixa = cn('grid aspect-square place-items-center rounded-md bg-muted', className);
  if (erro)
    return (
      <div className={caixa}>
        <ImageOff className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  if (!url)
    return (
      <div className={caixa}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  return <img src={url} alt={alt} className={cn('aspect-square rounded-md bg-muted object-contain', className)} />;
}

/** Miniatura que abre a foto grande num modal. */
export function MiniaturaFoto({ carregar, alt }: { carregar: () => Promise<string>; alt: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="h-20 w-20 shrink-0 overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <FotoAutenticada carregar={carregar} alt={alt} className="h-20 w-20 object-cover" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{alt}</DialogTitle>
        </DialogHeader>
        <FotoAutenticada carregar={carregar} alt={alt} className="w-full" />
      </DialogContent>
    </Dialog>
  );
}
