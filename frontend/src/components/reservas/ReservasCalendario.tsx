import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isToday, startOfMonth, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, Moon, Sun, Sunset } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Periodo, Reserva } from '@/types/condominio';
import { LABEL } from '@/types/condominio';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';

export type ModoCalendario = 'mes' | 'semana' | 'dia';

type Props = {
  modo: ModoCalendario;
  dataRef: Date;
  onDataRefChange: (data: Date) => void;
  onSelecionarDia: (data: Date) => void;
  reservas: Reserva[];
  isSindico: boolean;
};

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const PERIODOS: { valor: Periodo; label: string; icon: typeof Sun }[] = [
  { valor: 'manha', label: LABEL.periodo.manha, icon: Sun },
  { valor: 'tarde', label: LABEL.periodo.tarde, icon: Sunset },
  { valor: 'noite', label: LABEL.periodo.noite, icon: Moon },
  { valor: 'dia_todo', label: LABEL.periodo.dia_todo, icon: CalendarDays }
];

const CHIP_BG: Record<string, string> = {
  pendente: 'bg-warning/20 text-warning-foreground',
  aprovada: 'bg-success/15 text-success',
  rejeitada: 'bg-destructive/15 text-destructive line-through',
  cancelada: 'bg-muted text-muted-foreground line-through'
};

function toISO(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

export function ReservasCalendario({ modo, dataRef, onDataRefChange, onSelecionarDia, reservas, isSindico }: Props) {
  const porData = new Map<string, Reserva[]>();
  for (const r of reservas) {
    const lista = porData.get(r.data) ?? [];
    lista.push(r);
    porData.set(r.data, lista);
  }

  function goPrev() {
    if (modo === 'mes') onDataRefChange(addMonths(dataRef, -1));
    else if (modo === 'semana') onDataRefChange(addWeeks(dataRef, -1));
    else onDataRefChange(addDays(dataRef, -1));
  }
  function goNext() {
    if (modo === 'mes') onDataRefChange(addMonths(dataRef, 1));
    else if (modo === 'semana') onDataRefChange(addWeeks(dataRef, 1));
    else onDataRefChange(addDays(dataRef, 1));
  }

  const titulo =
    modo === 'mes'
      ? format(dataRef, 'MMMM yyyy', { locale: ptBR })
      : modo === 'semana'
        ? (() => {
            const inicio = startOfWeek(dataRef);
            const fim = endOfWeek(dataRef);
            return `${format(inicio, 'dd MMM', { locale: ptBR })} – ${format(fim, 'dd MMM yyyy', { locale: ptBR })}`;
          })()
        : format(dataRef, "dd 'de' MMMM 'de' yyyy - EEEE", { locale: ptBR });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" onClick={goPrev} aria-label="Anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-center text-sm font-bold capitalize">{titulo}</h3>
        <Button variant="ghost" size="icon" onClick={goNext} aria-label="Próximo">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {modo === 'mes' && <VisaoMes dataRef={dataRef} porData={porData} onSelecionarDia={onSelecionarDia} />}
      {modo === 'semana' && <VisaoSemana dataRef={dataRef} porData={porData} onSelecionarDia={onSelecionarDia} />}
      {modo === 'dia' && <VisaoDia dataRef={dataRef} porData={porData} isSindico={isSindico} />}
    </div>
  );
}

function VisaoMes({
  dataRef,
  porData,
  onSelecionarDia
}: {
  dataRef: Date;
  porData: Map<string, Reserva[]>;
  onSelecionarDia: (data: Date) => void;
}) {
  const inicioGrade = startOfWeek(startOfMonth(dataRef));
  const fimGrade = endOfWeek(endOfMonth(dataRef));
  const dias: Date[] = [];
  for (let d = inicioGrade; d <= fimGrade; d = addDays(d, 1)) dias.push(d);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((dia) => {
          const foraDoMes = dia.getMonth() !== dataRef.getMonth();
          const itens = porData.get(toISO(dia)) ?? [];
          const visiveis = itens.slice(0, 3);
          const restantes = itens.length - visiveis.length;
          return (
            <button
              key={dia.toISOString()}
              type="button"
              onClick={() => onSelecionarDia(dia)}
              className={cn(
                'min-h-[92px] space-y-1 border-b border-r border-border p-1.5 text-left align-top transition-colors hover:bg-accent',
                foraDoMes && 'bg-muted/20 text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  isToday(dia) && 'bg-primary text-primary-foreground'
                )}
              >
                {dia.getDate()}
              </span>
              <div className="space-y-0.5">
                {visiveis.map((r) => (
                  <div key={r.id} className={cn('truncate rounded px-1 py-0.5 text-[10px] font-medium', CHIP_BG[r.status])}>
                    {r.areaNome}
                  </div>
                ))}
                {restantes > 0 && <div className="text-[10px] text-muted-foreground">+{restantes} mais</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VisaoSemana({
  dataRef,
  porData,
  onSelecionarDia
}: {
  dataRef: Date;
  porData: Map<string, Reserva[]>;
  onSelecionarDia: (data: Date) => void;
}) {
  const inicio = startOfWeek(dataRef);
  const dias = Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
  const colunas = '112px repeat(7, minmax(96px, 1fr))';

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <div className="min-w-[720px]">
        <div className="grid border-b border-border bg-muted/40" style={{ gridTemplateColumns: colunas }}>
          <div />
          {dias.map((d) => (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onSelecionarDia(d)}
              className="border-l border-border py-2 text-center transition-colors hover:bg-accent"
            >
              <div className="text-[11px] font-semibold uppercase text-muted-foreground">{DIAS_SEMANA[d.getDay()]}</div>
              <div
                className={cn(
                  'mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold',
                  isToday(d) && 'bg-primary text-primary-foreground'
                )}
              >
                {d.getDate()}
              </div>
            </button>
          ))}
        </div>

        {PERIODOS.map((periodo) => (
          <div key={periodo.valor} className="grid border-b border-border" style={{ gridTemplateColumns: colunas }}>
            <div className="flex items-center gap-1.5 px-2 py-3 text-xs font-semibold text-muted-foreground">
              <periodo.icon className="h-3.5 w-3.5" />
              {periodo.label}
            </div>
            {dias.map((d) => {
              const itens = (porData.get(toISO(d)) ?? []).filter((r) => r.periodo === periodo.valor);
              return (
                <div key={d.toISOString()} className="min-h-[64px] space-y-1 border-l border-border p-1.5">
                  {itens.map((r) => (
                    <div key={r.id} className={cn('truncate rounded px-1 py-0.5 text-[10px] font-medium', CHIP_BG[r.status])}>
                      {r.areaNome}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function VisaoDia({
  dataRef,
  porData,
  isSindico
}: {
  dataRef: Date;
  porData: Map<string, Reserva[]>;
  isSindico: boolean;
}) {
  const itens = porData.get(toISO(dataRef)) ?? [];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {PERIODOS.map((periodo) => {
        const evts = itens.filter((r) => r.periodo === periodo.valor);
        return (
          <div key={periodo.valor} className="min-h-[180px] rounded-xl bg-muted/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <periodo.icon className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-bold">{periodo.label}</p>
              </div>
              <span className="rounded-full bg-background/70 px-2 py-0.5 text-xs font-semibold">{evts.length}</span>
            </div>
            <div className="space-y-2">
              {evts.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma reserva</p>
              ) : (
                evts.map((r) => (
                  <div key={r.id} className="space-y-1 rounded-lg border-l-4 border-l-primary bg-card p-2.5 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug">{r.areaNome}</p>
                      <StatusBadge status={r.status} className="shrink-0" />
                    </div>
                    {isSindico && r.solicitante && (
                      <p className="text-xs text-muted-foreground">
                        {r.solicitante} {r.unidadeLabel ? `(${r.unidadeLabel})` : ''}
                      </p>
                    )}
                    {r.observacao && <p className="text-xs text-muted-foreground">"{r.observacao}"</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
