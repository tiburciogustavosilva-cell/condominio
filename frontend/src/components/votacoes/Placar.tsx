import type { Pauta } from '@/types/condominio';
import { rotuloUnidade } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Barras com o total de cada opção (em tempo real, mesmo com a pauta ainda em votação) + o voto de cada
 * unidade; a mais votada fica destacada (na cor do resultado, se informada).
 */
type Props = {
  pauta: Pauta;
  corLider?: string;
  /** Resultado final: a opção vencedora (null = empate/sem votos, nenhuma destacada). Sem ela, destaca a mais votada. */
  liderId?: string | null;
  /** Mostra "de X presentes" ao lado do total de unidades que já votaram (pauta ainda aberta). */
  presentes?: number;
};

export function Placar({ pauta, corLider = 'bg-primary', liderId, presentes }: Props) {
  const votos = (o: Pauta['opcoes'][number]) => o.votos ?? 0;
  const peso = (o: Pauta['opcoes'][number]) => o.pesoVotos ?? 0;
  const totalVotos = pauta.opcoes.reduce((soma, o) => soma + votos(o), 0);
  const totalPeso = pauta.opcoes.reduce((soma, o) => soma + peso(o), 0);
  const maior = Math.max(...pauta.opcoes.map(peso));
  // Só mostra o peso separado se alguma unidade tiver peso diferente de 1 (senão soma bate com a contagem simples).
  const pesosDiferentes = totalPeso !== totalVotos;

  return (
    <div className="space-y-2">
      {pauta.opcoes.map((o) => {
        const pct = totalPeso ? Math.round((peso(o) / totalPeso) * 100) : 0;
        const lider = liderId !== undefined ? o.id === liderId : totalPeso > 0 && peso(o) === maior;
        return (
          <div key={o.id} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className={cn(lider && 'font-semibold')}>{o.texto}</span>
              <span className="tabular-nums text-muted-foreground">
                {votos(o)} voto(s){pesosDiferentes && ` · peso ${peso(o)}`} · {pct}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  lider ? corLider : 'bg-muted-foreground/30'
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        {pauta.votantes}
        {presentes != null ? ` de ${presentes}` : ''} unidade(s) votaram
      </p>
      {pauta.votosPorUnidade && pauta.votosPorUnidade.length > 0 && (
        <div className="space-y-1.5 pt-2">
          <p className="text-xs font-medium text-muted-foreground">Voto de cada unidade</p>
          <ul className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
            {pauta.votosPorUnidade.map((v) => (
              <li key={v.unidade.id} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{rotuloUnidade(v.unidade)}</span>
                <span className="font-medium">
                  {pauta.opcoes.find((o) => o.id === v.opcaoId)?.texto ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
