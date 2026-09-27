import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { criarAssembleia, type NovaPauta } from '@/hooks/useAssembleias';
import { Field } from '@/components/shared/Field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CamposPauta, PAUTA_VAZIA } from './CamposPauta';

type Props = {
  aberto: boolean;
  onFechar: () => void;
  onCriada: (id: string) => void;
};

/** Nova assembleia: título + pautas (dá pra adicionar mais durante a reunião). */
export function FormAssembleia({ aberto, onFechar, onCriada }: Props) {
  const [titulo, setTitulo] = useState('');
  const [pautas, setPautas] = useState<NovaPauta[]>([PAUTA_VAZIA]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setTitulo('');
      setPautas([PAUTA_VAZIA]);
    }
  }, [aberto]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const { id } = await criarAssembleia({ titulo, pautas });
      toast.success('Assembleia criada');
      onFechar();
      onCriada(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !salvando && !v && onFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nova assembleia</DialogTitle>
          <DialogDescription>
            Na reunião, projete o código de presença. Só quem fizer o check-in vota: 1 voto secreto por unidade.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-5">
          <Field label="Nome da reunião" htmlFor="a-titulo">
            <Input
              id="a-titulo"
              placeholder="Ex.: Assembleia geral ordinária 2026"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </Field>

          {pautas.map((pauta, i) => (
            <fieldset key={i} className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <legend className="text-sm font-semibold">Pauta {i + 1}</legend>
                {pautas.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setPautas((ps) => ps.filter((_, j) => j !== i))}
                    aria-label={`Remover pauta ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <CamposPauta
                id={`p${i}`}
                pauta={pauta}
                onChange={(nova) => setPautas((ps) => ps.map((p, j) => (j === i ? nova : p)))}
              />
            </fieldset>
          ))}

          <div className="flex flex-wrap justify-between gap-2">
            <Button type="button" variant="outline" onClick={() => setPautas((ps) => [...ps, PAUTA_VAZIA])}>
              <Plus className="h-4 w-4" /> Outra pauta
            </Button>
            <Button type="submit" variant="brand" disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar assembleia
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
