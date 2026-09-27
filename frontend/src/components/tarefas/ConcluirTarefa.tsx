import { useState } from 'react';
import { Camera, CheckCircle2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { paraWebp } from '@/lib/imagem';
import type { TarefaDoDia } from '@/types/condominio';
import { Field } from '@/components/shared/Field';
import { BotaoDitado, juntarDitado } from '@/components/shared/BotaoDitado';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

const MAX_FOTOS = 5;

type Props = {
  tarefa: TarefaDoDia;
  /** Hora do servidor (o carimbo usa ela, não o relógio do aparelho). */
  agora: () => Date;
  onConcluir: (dados: { observacao: string; fotos: string[] }) => Promise<unknown>;
};

/** Funcionário marca a tarefa como feita: fotos obrigatórias, carimbadas com data/hora, + observação opcional. */
export function ConcluirTarefa({ tarefa, agora, onConcluir }: Props) {
  const [aberto, setAberto] = useState(false);
  const [fotos, setFotos] = useState<string[]>([]);
  const [observacao, setObservacao] = useState('');
  const [processando, setProcessando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function adicionarFotos(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    const livres = MAX_FOTOS - fotos.length;
    if (arquivos.length > livres) toast.error(`No máximo ${MAX_FOTOS} fotos`);
    setProcessando(true);
    try {
      const novas: string[] = [];
      for (const arquivo of Array.from(arquivos).slice(0, livres)) {
        novas.push(
          await paraWebp(arquivo, {
            carimbo: agora().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
          })
        );
      }
      setFotos((f) => [...f, ...novas]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível ler a foto');
    } finally {
      setProcessando(false);
    }
  }

  async function enviar() {
    if (!fotos.length) {
      toast.error('Tire pelo menos uma foto do serviço');
      return;
    }
    setEnviando(true);
    try {
      await onConcluir({ observacao, fotos });
      toast.success('Tarefa concluída');
      setAberto(false);
      setFotos([]);
      setObservacao('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao concluir');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !enviando && setAberto(v)}>
      <DialogTrigger asChild>
        <Button variant="brand" size="sm">
          <CheckCircle2 className="h-4 w-4" /> Concluir
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tarefa.titulo}</DialogTitle>
          <DialogDescription>Tire foto do serviço feito. A data e a hora ficam gravadas na foto.</DialogDescription>
        </DialogHeader>

        <Field label={`Fotos (${fotos.length}/${MAX_FOTOS})`} htmlFor={`fotos-${tarefa.id}`}>
          <div className="flex flex-wrap gap-2">
            {fotos.map((foto, i) => (
              <div key={i} className="relative">
                <img src={foto} alt={`Foto ${i + 1}`} className="h-20 w-20 rounded-md object-cover" />
                <button
                  type="button"
                  onClick={() => setFotos((f) => f.filter((_, j) => j !== i))}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                  aria-label={`Remover foto ${i + 1}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {fotos.length < MAX_FOTOS && (
              <label
                htmlFor={`fotos-${tarefa.id}`}
                className="grid h-20 w-20 cursor-pointer place-items-center rounded-md border border-dashed border-input text-muted-foreground hover:bg-accent"
              >
                {processando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                <span className="sr-only">Tirar foto</span>
              </label>
            )}
          </div>
          <input
            id={`fotos-${tarefa.id}`}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="sr-only"
            onChange={(e) => {
              adicionarFotos(e.target.files);
              e.target.value = ''; // permite tirar outra foto em seguida
            }}
          />
        </Field>

        <Field label="Observação (opcional)" htmlFor={`obs-${tarefa.id}`}>
          <div className="flex gap-2">
            <textarea
              id={`obs-${tarefa.id}`}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
            <BotaoDitado onTexto={(texto) => setObservacao((o) => juntarDitado(o, texto))} />
          </div>
        </Field>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setAberto(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button variant="brand" onClick={enviar} disabled={enviando || processando || !fotos.length}>
            {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
            Marcar como feita
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
