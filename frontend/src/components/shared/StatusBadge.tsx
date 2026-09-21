import { Badge, type BadgeProps } from '@/components/ui/badge';

type Variant = NonNullable<BadgeProps['variant']>;
type Entry = { label: string; variant: Variant };

/**
 * Mapa único de status do domínio → rótulo PT-BR + variante do Badge.
 * Cobre chamados, reservas, encomendas e manutenções. Fallback = "muted".
 */
const STATUS_MAP: Record<string, Entry> = {
  // chamados
  aberto: { label: 'Aberto', variant: 'warning' },
  em_andamento: { label: 'Em andamento', variant: 'info' },
  concluido: { label: 'Concluído', variant: 'success' },
  // reservas
  pendente: { label: 'Pendente', variant: 'warning' },
  aprovada: { label: 'Aprovada', variant: 'success' },
  rejeitada: { label: 'Rejeitada', variant: 'destructive' },
  cancelada: { label: 'Cancelada', variant: 'muted' },
  // encomendas
  aguardando: { label: 'Aguardando retirada', variant: 'info' },
  entregue: { label: 'Entregue', variant: 'success' },
  // manutenções
  em_dia: { label: 'Em dia', variant: 'success' },
  proxima: { label: 'Próxima', variant: 'warning' },
  vencida: { label: 'Vencida', variant: 'destructive' }
};

const PRIORIDADE_MAP: Record<string, Entry> = {
  baixa: { label: 'Baixa', variant: 'muted' },
  media: { label: 'Média', variant: 'warning' },
  alta: { label: 'Alta', variant: 'destructive' }
};

function fallback(value: string): Entry {
  return { label: value.replace(/_/g, ' '), variant: 'muted' };
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const entry = STATUS_MAP[status] ?? fallback(status);
  return (
    <Badge variant={entry.variant} className={className}>
      {entry.label}
    </Badge>
  );
}

export function PrioridadeBadge({ nivel, className }: { nivel: string; className?: string }) {
  const entry = PRIORIDADE_MAP[nivel] ?? fallback(nivel);
  return (
    <Badge variant={entry.variant} className={className}>
      {entry.label}
    </Badge>
  );
}
