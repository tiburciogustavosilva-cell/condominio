import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

type Props = {
  sucesso: number;
  erros: { erro: string }[];
  onFechar: () => void;
};

/** Resumo de uma importação em lote (planilha): quantos entraram + a lista de linhas com problema. */
export function ResultadoImportacao({ sucesso, erros, onFechar }: Props) {
  return (
    <Card className={erros.length ? 'border-warning/40' : 'border-success/40'}>
      <CardContent className="space-y-2 pt-5">
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            {erros.length === 0 ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
            )}
            {sucesso} importado(s) com sucesso
            {erros.length > 0 && ` · ${erros.length} com problema`}
          </p>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {erros.length > 0 && (
          <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-muted-foreground">
            {erros.map((e, i) => (
              <li key={i}>{e.erro}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
