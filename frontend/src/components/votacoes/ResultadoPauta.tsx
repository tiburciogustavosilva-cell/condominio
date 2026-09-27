import { CheckCircle2, CircleSlash, Scale, Trophy, XCircle, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { Assembleia, Pauta } from '@/types/condominio';
import { dataHora } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Placar } from './Placar';

const normalizar = (t: string) =>
  t
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

type Veredito = {
  titulo: string;
  icon: LucideIcon;
  /** fundo/borda do topo, texto do veredito, barra da vencedora */
  faixa: string;
  texto: string;
  barra: string;
  vencedora: Pauta['opcoes'][number] | null;
};

/**
 * Quem venceu: a opção mais votada, sem contar "Abstenção" (quem se abstém não decide).
 * Sim/Não viram "Aprovada"/"Rejeitada"; opções livres viram "Venceu: X".
 */
export function apurar(pauta: Pauta): Veredito {
  const decisivas = pauta.opcoes.filter((o) => !normalizar(o.texto).startsWith('absten'));
  const maior = Math.max(0, ...decisivas.map((o) => o.votos ?? 0));
  const lideres = decisivas.filter((o) => (o.votos ?? 0) === maior);

  if (maior === 0) {
    return {
      titulo: 'Sem votos',
      icon: CircleSlash,
      faixa: 'bg-muted',
      texto: 'text-muted-foreground',
      barra: 'bg-muted-foreground',
      vencedora: null
    };
  }
  if (lideres.length > 1) {
    return {
      titulo: 'Empate',
      icon: Scale,
      faixa: 'bg-warning/15',
      texto: 'text-warning-foreground',
      barra: 'bg-warning',
      vencedora: null
    };
  }
  const vencedora = lideres[0];
  const t = normalizar(vencedora.texto);
  if (t === 'sim') {
    return {
      titulo: 'Aprovada',
      icon: CheckCircle2,
      faixa: 'bg-success/15',
      texto: 'text-success',
      barra: 'bg-success',
      vencedora
    };
  }
  if (t === 'nao') {
    return {
      titulo: 'Rejeitada',
      icon: XCircle,
      faixa: 'bg-destructive/10',
      texto: 'text-destructive',
      barra: 'bg-destructive',
      vencedora
    };
  }
  return {
    titulo: `Venceu: ${vencedora.texto}`,
    icon: Trophy,
    faixa: 'bg-primary/10',
    texto: 'text-primary',
    barra: 'bg-primary',
    vencedora
  };
}

/** Cartão de pauta encerrada: veredito grande no topo + placar final. `grande` = tela do condômino. */
export function ResultadoPauta({ pauta, numero, grande }: { pauta: Pauta; numero?: number; grande?: boolean }) {
  const v = apurar(pauta);
  const total = pauta.opcoes.reduce((soma, o) => soma + (o.votos ?? 0), 0);
  const Icon = v.icon;

  return (
    <Card className="overflow-hidden">
      <div className={cn('flex items-center gap-4 px-5 py-4', v.faixa)}>
        <Icon className={cn('shrink-0', v.texto, grande ? 'h-12 w-12' : 'h-10 w-10')} aria-hidden />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {numero ? `Pauta ${numero} · ` : ''}Resultado final
          </p>
          <p className={cn('font-extrabold leading-tight', v.texto, grande ? 'text-3xl' : 'text-2xl')}>{v.titulo}</p>
        </div>
      </div>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-1">
          <p className={cn('font-semibold', grande ? 'text-xl' : 'text-lg')}>{pauta.titulo}</p>
          {v.vencedora && (
            <p className={cn('text-muted-foreground', grande ? 'text-lg' : 'text-sm')}>
              "{v.vencedora.texto}" teve {v.vencedora.votos} de {total} voto(s) (
              {Math.round(((v.vencedora.votos ?? 0) / total) * 100)}%)
            </p>
          )}
        </div>
        <Placar pauta={pauta} corLider={v.barra} liderId={v.vencedora?.id ?? null} />
      </CardContent>
    </Card>
  );
}

/** Agradecimento: pessoal para quem esteve presente; para o síndico, bom de projetar no fim da reunião. */
function agradecimento(a: Assembleia, nome: string | undefined, isSindico: boolean) {
  if (isSindico) {
    return `Obrigado às ${a.presentes} unidades que participaram! Cada presença e cada voto ajudam a cuidar do nosso condomínio.`;
  }
  if (a.minhaUnidade?.presente) {
    return `Obrigado por participar${nome ? `, ${nome}` : ''}! Sua presença e seu voto ajudam a cuidar do nosso condomínio.`;
  }
  return 'Obrigado a todos que participaram! Confira abaixo o que foi decidido.';
}

/** Topo da assembleia encerrada: agradecimento, quando terminou, quórum e o placar de aprovadas/rejeitadas. */
export function ResumoAssembleia({ assembleia: a }: { assembleia: Assembleia }) {
  const { usuario, isSindico } = useAuth();
  const vereditos = a.pautas.map(apurar);
  const conta = (titulo: string) => vereditos.filter((v) => v.titulo === titulo).length;
  const quorum = a.totalUnidades ? Math.round((a.presentes / a.totalUnidades) * 100) : 0;
  const numeros = [
    { rotulo: 'unidades presentes', valor: `${a.presentes}/${a.totalUnidades}`, extra: `${quorum}%` },
    { rotulo: 'aprovada(s)', valor: conta('Aprovada'), cls: 'text-emerald-700' },
    { rotulo: 'rejeitada(s)', valor: conta('Rejeitada'), cls: 'text-red-700' }
  ];

  // Cartão sempre claro, na cor exata do fundo do mascote (#faf8f6): a imagem se funde no cartão, sem moldura.
  // Por isso as cores aqui são fixas (não seguem o tema escuro); o azul é o polo do mascote.
  return (
    <div className="overflow-hidden rounded-xl border border-[#ebe6df] bg-[#faf8f6] text-center text-slate-900 shadow-sm">
      <img
        src="/brand/agradecimento.webp"
        alt=""
        width={640}
        height={640}
        className="mx-auto mb-4 mt-2 h-56 w-56 object-contain sm:h-64 sm:w-64"
      />
      <div className="space-y-2 px-5">
        <p className="text-3xl font-extrabold text-[hsl(218_56%_42%)] sm:text-4xl">Muito obrigado!</p>
        <p className="mx-auto max-w-lg text-lg leading-relaxed text-slate-700">
          {agradecimento(a, usuario?.nome?.split(' ')[0], isSindico)}
        </p>
        <p className="text-sm text-slate-500">
          Assembleia encerrada{a.encerradaEm && ` em ${dataHora(a.encerradaEm)}`}
        </p>
      </div>
      <div className="mx-auto grid max-w-lg grid-cols-3 gap-2 p-5">
        {numeros.map((n) => (
          <div key={n.rotulo} className="rounded-lg border border-[#ebe6df] bg-white px-2 py-3">
            <p className={cn('text-2xl font-extrabold tabular-nums text-slate-900', n.cls)}>{n.valor}</p>
            <p className="text-xs text-slate-500">
              {n.rotulo}
              {n.extra && ` (${n.extra})`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
