import type { Pauta } from '@/types/condominio';
import { cn } from '@/lib/utils';

/** Barras com o total de cada opção; a mais votada fica destacada (na cor do resultado, se informada). */
type Props = {
  pauta: Pauta;
  corLider?: string;
  /** Resultado final: a opção vencedora (null = empate/sem votos, nenhuma destacada). Sem ela, destaca a mais votada. */
  liderId?: string | null;
};

export function Placar({ pauta, corLider = 'bg-primary', liderId }: Props) {
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
      <p className="text-xs text-muted-foreground">{pauta.votantes} unidade(s) votaram · voto secreto</p>
    </div>
  );
}

/**
 * Votação ainda aberta: só quantas unidades já votaram. O placar por opção fica escondido até encerrar,
 * senão quem olha a tela na hora de um voto (ex.: voto pela mesa) descobre o que a pessoa escolheu.
 */
export function Andamento({ pauta, presentes, grande }: { pauta: Pauta; presentes: number; grande?: boolean }) {
  const pct = presentes ? Math.min(100, Math.round((pauta.votantes / presentes) * 100)) : 0;
  return (
    <div className="space-y-2">
      <p className={cn('font-semibold', grande ? 'text-lg' : 'text-sm')}>
        {pauta.votantes} de {presentes} unidade(s) presentes já votaram
      </p>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className={cn('text-muted-foreground', grande ? 'text-base' : 'text-xs')}>
        O resultado aparece quando a votação for encerrada. Assim o voto de cada um continua secreto.
      </p>
    </div>
  );
}
