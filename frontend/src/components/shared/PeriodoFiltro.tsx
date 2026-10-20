import { cn } from '@/lib/utils';
import { FilterPills } from '@/components/shared/FilterPills';
import { Input } from '@/components/ui/input';

/** `meses` = '3' | '6' | '12' ou 'custom' (aí valem `de`/`ate`, "YYYY-MM-DD"). */
export type Periodo = { meses: string; de: string; ate: string };

const OPCOES = [
  { value: '3', label: '3 meses' },
  { value: '6', label: '6 meses' },
  { value: '12', label: '12 meses' },
  { value: 'custom', label: 'Personalizado' }
];

/** Query string do período, ou null enquanto o personalizado está incompleto/invertido. */
export function periodoQuery({ meses, de, ate }: Periodo) {
  if (meses !== 'custom') return `meses=${meses}`;
  return de && ate && de <= ate ? `de=${de}&ate=${ate}` : null;
}

/** Atalhos de meses + "Personalizado" com De/Até. */
export function PeriodoFiltro({ value, onChange, className }: { value: Periodo; onChange: (p: Periodo) => void; className?: string }) {
  const custom = value.meses === 'custom';
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <FilterPills options={OPCOES} value={value.meses} onChange={(meses) => onChange({ ...value, meses })} />
      {custom && (
        <div className="flex items-center gap-2">
          <Input type="date" aria-label="De" className="h-8 w-auto" value={value.de} max={value.ate || undefined} onChange={(e) => onChange({ ...value, de: e.target.value })} />
          <span className="text-xs text-muted-foreground">até</span>
          <Input type="date" aria-label="Até" className="h-8 w-auto" value={value.ate} min={value.de || undefined} onChange={(e) => onChange({ ...value, ate: e.target.value })} />
        </div>
      )}
    </div>
  );
}
