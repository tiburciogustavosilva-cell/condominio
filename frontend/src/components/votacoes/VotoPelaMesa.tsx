import { useState } from 'react';
import { CheckCircle2, HandHelping } from 'lucide-react';
import type { useAssembleia } from '@/hooks/useAssembleias';
import { rotuloUnidade } from '@/lib/format';
import type { Assembleia, Pauta } from '@/types/condominio';
import { Field } from '@/components/shared/Field';
import { UnidadeSelect } from '@/components/shared/UnidadeSelect';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VotarAgora } from './VotacaoCondomino';

type Acoes = ReturnType<typeof useAssembleia>;

/**
 * Quem não tem celular: o síndico escolhe a unidade presente e entrega o aparelho;
 * a pessoa vota sozinha na mesma tela grande do condômino e devolve. O voto continua secreto.
 */
export function VotoPelaMesa({
  assembleia,
  pauta,
  votar
}: {
  assembleia: Assembleia;
  pauta: Pauta;
  votar: Acoes['votar'];
}) {
  const [aberto, setAberto] = useState(false);
  const [unidadeId, setUnidadeId] = useState('');
  const [etapa, setEtapa] = useState<'unidade' | 'votar' | 'feito'>('unidade');
  const presentes = assembleia.presencas ?? [];
  const unidade = presentes.find((p) => p.unidade.id === unidadeId)?.unidade;

  function abrir() {
    setUnidadeId('');
    setEtapa('unidade');
    setAberto(true);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={abrir}>
        <HandHelping className="h-4 w-4" /> Votar pela mesa (sem celular)
      </Button>
      {/* no meio do voto não fecha tocando fora: o aparelho está na mão do morador */}
      <Dialog open={aberto} onOpenChange={(v) => (v || etapa !== 'votar') && setAberto(v)}>
        <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-lg">
          {etapa === 'unidade' && (
            <>
              <DialogHeader>
                <DialogTitle>Voto pela mesa</DialogTitle>
                <DialogDescription>
                  Para quem está na reunião e não tem celular. Escolha a unidade, entregue o aparelho e deixe a pessoa
                  votar sozinha.
                </DialogDescription>
              </DialogHeader>
              <p className="font-semibold">{pauta.titulo}</p>
              {presentes.length ? (
                <Field
                  label="Unidade"
                  htmlFor="mesa-unidade"
                  hint="Só aparecem unidades presentes. Marque a presença antes, se precisar."
                >
                  <UnidadeSelect
                    id="mesa-unidade"
                    unidades={presentes.map((p) => p.unidade)}
                    value={unidadeId}
                    onChange={setUnidadeId}
                    placeholder="Escolha a unidade…"
                  />
                </Field>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma unidade presente ainda. Marque a presença primeiro.
                </p>
              )}
              <Button
                variant="brand"
                className="h-12 text-base"
                disabled={!unidadeId}
                onClick={() => setEtapa('votar')}
              >
                Entregar o aparelho ao morador
              </Button>
            </>
          )}

          {etapa === 'votar' && unidade && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">Unidade {rotuloUnidade(unidade)}</DialogTitle>
                <DialogDescription className="text-base">Escolha sua opção e toque em confirmar.</DialogDescription>
              </DialogHeader>
              <VotarAgora
                pauta={pauta}
                votar={(pautaId, opcaoId) => votar(pautaId, opcaoId, unidade.id).then(() => setEtapa('feito'))}
              />
              <Button variant="ghost" onClick={() => setEtapa('unidade')}>
                Cancelar (devolver sem votar)
              </Button>
            </>
          )}

          {etapa === 'feito' && (
            <div className="space-y-4 py-4 text-center">
              <CheckCircle2 className="mx-auto h-16 w-16 text-success" aria-hidden />
              <p className="text-2xl font-bold">Voto registrado</p>
              <p className="text-lg text-muted-foreground">Obrigado! Devolva o aparelho ao síndico.</p>
              <div className="flex flex-col gap-2 pt-2">
                <Button variant="brand" className="h-12 text-base" onClick={abrir}>
                  Próxima unidade
                </Button>
                <Button variant="outline" className="h-12 text-base" onClick={() => setAberto(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
