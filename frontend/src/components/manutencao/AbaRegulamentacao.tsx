import { useMemo, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { BuscaInput, bate } from '@/components/shared/BuscaInput';
import { FilterPills } from '@/components/shared/FilterPills';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AVISO_REGULAMENTACAO, GRUPOS, REGULAMENTACOES } from '@/lib/regulamentacaoManutencao';

const FILTROS = [{ value: '', label: 'Todas' }, ...Object.entries(GRUPOS).map(([value, label]) => ({ value, label }))];

/** Guia de referência: normas e periodicidade usuais de manutenção predial — só consulta, não altera cadastro. */
export function AbaRegulamentacao() {
  const [busca, setBusca] = useState('');
  const [grupo, setGrupo] = useState('');

  const visiveis = useMemo(
    () =>
      REGULAMENTACOES.filter((r) => !grupo || r.grupo === grupo).filter((r) =>
        bate(busca, r.equipamento, r.norma, r.observacao)
      ),
    [busca, grupo]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-warning/30 bg-warning/15 px-3 py-2 text-sm text-warning-foreground">
        {AVISO_REGULAMENTACAO}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterPills options={FILTROS} value={grupo} onChange={setGrupo} />
        <BuscaInput value={busca} onChange={setBusca} placeholder="Buscar equipamento ou norma…" />
      </div>
      {visiveis.length === 0 ? (
        <EmptyState icon={ScrollText} title="Nada encontrado" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visiveis.map((r) => (
            <Card key={r.equipamento}>
              <CardContent className="space-y-1.5 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{r.equipamento}</p>
                  <Badge variant="outline">{GRUPOS[r.grupo]}</Badge>
                </div>
                <p className="text-xs font-medium text-muted-foreground">{r.norma}</p>
                <p className="text-sm">{r.periodicidade}</p>
                <p className="text-xs text-muted-foreground">{r.observacao}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
