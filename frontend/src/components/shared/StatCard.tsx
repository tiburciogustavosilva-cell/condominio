import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

type Tone = 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive';

const toneMap: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/20 text-warning-foreground',
  info: 'bg-info/10 text-info',
  destructive: 'bg-destructive/10 text-destructive'
};

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ComponentType<{ className?: string }>;
  tone?: Tone;
  to?: string;
  index?: number;
};

export function StatCard({ label, value, hint, icon: Icon, tone = 'primary', to, index = 0 }: Props) {
  const body = (
    <Card
      className={cn(
        'h-full p-4 transition-all',
        to && 'hover:-translate-y-0.5 hover:shadow-md'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="font-heading text-2xl font-extrabold tracking-tight">{value}</p>
          {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-md', toneMap[tone])}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
    >
      {to ? (
        <Link to={to} className="block">
          {body}
        </Link>
      ) : (
        body
      )}
    </motion.div>
  );
}
