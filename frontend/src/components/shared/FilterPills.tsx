import { cn } from '@/lib/utils';

export type PillOption = { value: string; label: string };

type Props = {
  options: PillOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

/** Pills de filtro — seleção única. */
export function FilterPills({ options, value, onChange, className }: Props) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value || 'all'}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
