import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Props = {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  /** Enquanto salva, o modal não fecha (clique fora / Esc). */
  salvando?: boolean;
  /** Ex.: 'sm:max-w-3xl' para formulários com muitos campos. */
  className?: string;
  children: ReactNode;
};

/** Modal padrão dos formulários de criar/editar (mesmo visual de tarefas e encomendas). */
export function FormModal({ aberto, titulo, onFechar, salvando, className, children }: Props) {
  return (
    <Dialog open={aberto} onOpenChange={(v) => !salvando && !v && onFechar()}>
      <DialogContent className={cn('max-h-[90vh] overflow-y-auto sm:max-w-xl', className)}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
