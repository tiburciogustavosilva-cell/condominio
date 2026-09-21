import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type Props = {
  /** valor no formato ISO "yyyy-MM-dd" (compatível com <input type=date>) */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabledBefore?: Date;
  className?: string;
  id?: string;
};

function parse(value?: string) {
  if (!value) return undefined;
  const d = new Date(value + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecionar data',
  disabledBefore,
  className,
  id
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = parse(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start font-normal',
            !selected && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          {selected ? format(selected, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          disabled={disabledBefore ? { before: disabledBefore } : undefined}
          onSelect={(d) => {
            if (d) onChange(format(d, 'yyyy-MM-dd'));
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
