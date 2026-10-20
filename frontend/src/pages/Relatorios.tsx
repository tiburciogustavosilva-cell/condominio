import { useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Building2, Wallet, BookText, Package, BarChart3 } from 'lucide-react';
import { useRelatorios } from '@/hooks/useRelatorios';
import { dataCurta, moeda } from '@/lib/format';
import { LABEL } from '@/types/condominio';
import { PageHeader } from '@/components/shared/PageHeader';
import { PeriodoFiltro, periodoQuery, type Periodo } from '@/components/shared/PeriodoFiltro';
import { StatCard } from '@/components/shared/StatCard';
import { ProgressStat } from '@/components/shared/ProgressStat';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const cor = (token: string) => `hsl(var(--${token}))`;
/** '2026-10' → 'out/26' */
const mesCurto = (mes: string) => format(new Date(`${mes}-01T12:00:00`), 'MMM/yy', { locale: ptBR });
const pct = (v: number, total: number) => (total > 0 ? Math.round((v / total) * 100) : 0);

type Serie = { chave: string; label: string; cor: string };

/** Colunas por mês, uma ou mais séries lado a lado. */
function GraficoMeses({ dados, series, valor = String }: { dados: object[]; series: Serie[]; valor?: (v: number) => string }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={cor('border')} />
          <XAxis dataKey="mes" tickFormatter={mesCurto} tickLine={false} axisLine={false} fontSize={12} stroke={cor('muted-foreground')} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={48} stroke={cor('muted-foreground')} tickFormatter={(v: number) => v.toLocaleString('pt-BR', { notation: 'compact' })} />
          <Tooltip
            cursor={{ fill: cor('muted') }}
            labelFormatter={(m: string) => mesCurto(m)}
            formatter={(v: number) => valor(v)}
            contentStyle={{ background: cor('card'), border: `1px solid ${cor('border')}`, borderRadius: 8, fontSize: 12 }}
          />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s) => (
            <Bar key={s.chave} dataKey={s.chave} name={s.label} fill={s.cor} radius={[4, 4, 0, 0]} maxBarSize={32} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

/** Lista "rótulo ........ valor" com barra proporcional ao maior. */
function Ranking({ itens, valor = String }: { itens: { label: string; total: number }[]; valor?: (v: number) => string }) {
  if (!itens.length) return <p className="text-sm text-muted-foreground">Nada no período.</p>;
  const max = Math.max(...itens.map((i) => i.total));
  return (
    <ul className="space-y-2">
      {itens.map((i) => (
        <li key={i.label} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>{i.label}</span>
            <span className="text-muted-foreground">{valor(i.total)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct(i.total, max)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Relatorios() {
  const [periodo, setPeriodo] = useState<Periodo>({ meses: '6', de: '', ate: '' });
  const { dados, erro } = useRelatorios(periodoQuery(periodo));
  const cabecalho = (
    <PageHeader title="Relatórios">
      <PeriodoFiltro value={periodo} onChange={setPeriodo} />
    </PageHeader>
  );

  if (erro) {
    return (
      <div className="space-y-6">
        {cabecalho}
        <EmptyState icon={BarChart3} title="Não deu pra gerar o relatório" description={erro} />
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="space-y-6">
        {cabecalho}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const { geral, ocorrencias, manutencoes, encomendas, assembleias } = dados;
  const totalPlanos = manutencoes ? manutencoes.planos.em_dia + manutencoes.planos.proxima + manutencoes.planos.vencida : 0;
  const moradores = geral.moradoresPorVinculo.reduce((s, v) => s + v.total, 0);

  return (
    <div className="space-y-6">
      {cabecalho}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ocupação"
          value={`${pct(geral.unidadesOcupadas, geral.unidades)}%`}
          hint={`${geral.unidadesOcupadas} de ${geral.unidades} unidades com morador`}
          icon={Building2}
        />
        {manutencoes && (
          <StatCard label="Custo de manutenção" value={moeda(manutencoes.custoTotal)} hint={`${dataCurta(dados.de)} a ${dataCurta(dados.ate)}`} icon={Wallet} tone="secondary" />
        )}
        {ocorrencias && (
          <StatCard
            label="Resolução de ocorrências"
            value={ocorrencias.diasMedioResolucao === null ? '—' : `${ocorrencias.diasMedioResolucao} dias`}
            hint={`Média · ${ocorrencias.abertasAgora} em aberto agora`}
            icon={BookText}
            tone="warning"
          />
        )}
        {encomendas && (
          <StatCard
            label="Retirada de encomendas"
            value={encomendas.horasMediaRetirada === null ? '—' : `${encomendas.horasMediaRetirada} h`}
            hint={`Média · ${encomendas.paradas} paradas há mais de 3 dias`}
            icon={Package}
            tone="info"
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {ocorrencias && (
          <Secao titulo={`Ocorrências · ${ocorrencias.total} no período`}>
            <GraficoMeses
              dados={ocorrencias.porMes}
              series={[
                { chave: 'abertas', label: 'Registradas', cor: cor('warning') },
                { chave: 'concluidas', label: 'Concluídas', cor: cor('success') }
              ]}
            />
            <Ranking itens={ocorrencias.porCategoria.map((c) => ({ label: LABEL.categoriaOcorrencia[c.categoria] ?? c.categoria, total: c.total }))} />
          </Secao>
        )}

        {manutencoes && (
          <Secao titulo="Manutenção · custo por mês">
            <GraficoMeses dados={manutencoes.custoPorMes} series={[{ chave: 'total', label: 'Custo', cor: cor('primary') }]} valor={moeda} />
            <Ranking
              itens={manutencoes.custoPorTipo.map((t) => ({ label: LABEL.tipoManutencao[t.tipo] ?? t.tipo, total: t.total }))}
              valor={moeda}
            />
          </Secao>
        )}

        {manutencoes && (
          <Secao titulo="Planos e ordens de serviço">
            <ProgressStat label="Planos em dia" value={manutencoes.planos.em_dia} total={totalPlanos} indicatorClassName="bg-success" />
            <ProgressStat label="Vencendo em breve" value={manutencoes.planos.proxima} total={totalPlanos} indicatorClassName="bg-warning" />
            <ProgressStat label="Vencidos" value={manutencoes.planos.vencida} total={totalPlanos} indicatorClassName="bg-destructive" />
            <Ranking itens={manutencoes.ordensPorStatus.map((o) => ({ label: `OS ${LABEL.statusPlano[o.status]?.toLowerCase() ?? o.status}`, total: o.total }))} />
          </Secao>
        )}

        {encomendas && (
          <Secao titulo={`Encomendas · ${encomendas.total} recebidas`}>
            <GraficoMeses dados={encomendas.porMes} series={[{ chave: 'total', label: 'Recebidas', cor: cor('info') }]} />
          </Secao>
        )}

        {assembleias && (
          <Secao titulo="Participação nas assembleias">
            {assembleias.length ? (
              assembleias.map((a) => (
                <ProgressStat key={a.id} label={a.titulo} value={a.presencas} total={geral.unidades} hint={format(new Date(a.encerradaEm), 'dd/MM/yyyy')} />
              ))
            ) : (
              <EmptyState icon={BarChart3} title="Nenhuma assembleia encerrada no período" className="py-6" />
            )}
          </Secao>
        )}

        <Secao titulo="Moradores">
          <ProgressStat label="Unidades ocupadas" value={geral.unidadesOcupadas} total={geral.unidades} />
          <Ranking itens={geral.moradoresPorVinculo.map((v) => ({ label: LABEL.vinculo[v.vinculo] ?? v.vinculo, total: v.total }))} />
          <p className="text-xs text-muted-foreground">
            {moradores} moradores · {geral.funcionarios} funcionários
          </p>
        </Secao>
      </div>
    </div>
  );
}
