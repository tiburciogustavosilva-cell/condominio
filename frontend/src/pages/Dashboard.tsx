import { Link } from 'react-router-dom';
import {
  Wrench,
  CalendarRange,
  Package,
  HardHat,
  Building2,
  Users,
  Pin,
  ArrowRight
} from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import { useAuth } from '@/hooks/useAuth';
import { dataHora } from '@/lib/format';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { ProgressStat } from '@/components/shared/ProgressStat';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { usuario } = useAuth();
  const { dados } = useDashboard();

  const cabecalho = (
    <PageHeader
      title={`Olá, ${usuario?.nome?.split(' ')[0] ?? ''} 👋`}
      description="Resumo do que precisa da sua atenção hoje."
    />
  );

  if (!dados) {
    return (
      <div className="space-y-6">
        {cabecalho}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const c = dados.chamados;
  const totalChamados = c.aberto + c.em_andamento + c.concluido;

  return (
    <div className="space-y-6">
      {cabecalho}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          to="/chamados"
          label="Chamados abertos"
          value={c.aberto}
          hint={`${c.em_andamento} em andamento`}
          icon={Wrench}
          tone="warning"
        />
        <StatCard
          to="/reservas"
          label="Reservas pendentes"
          value={dados.reservas.pendentes}
          hint={`${dados.reservas.proximas} aprovadas a caminho`}
          icon={CalendarRange}
          tone="secondary"
        />
        <StatCard
          to="/encomendas"
          label="Encomendas na portaria"
          value={dados.encomendas.aguardando}
          hint="aguardando retirada"
          icon={Package}
          tone="info"
        />
        {dados.manutencoes && (
          <StatCard
            to="/prestadores"
            label="Manutenções vencidas"
            value={dados.manutencoes.vencidas}
            hint={`${dados.manutencoes.proximas} próximas do prazo`}
            icon={HardHat}
            tone={dados.manutencoes.vencidas ? 'destructive' : 'success'}
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Chamados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProgressStat
              label="Resolvidos"
              value={c.concluido}
              total={totalChamados}
              indicatorClassName="bg-success"
              hint={`${c.aberto} abertos · ${c.em_andamento} em andamento`}
            />
            {dados.totais && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-md bg-muted p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Building2 className="h-4 w-4" /> Unidades
                  </div>
                  <p className="mt-1 font-heading text-xl font-extrabold">{dados.totais.unidades}</p>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-4 w-4" /> Moradores
                  </div>
                  <p className="mt-1 font-heading text-xl font-extrabold">{dados.totais.moradores}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Mural de avisos</CardTitle>
            <Link
              to="/avisos"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {dados.avisos.length === 0 ? (
              <EmptyState title="Nenhum aviso publicado" description="Quando o síndico publicar algo, aparece aqui." />
            ) : (
              <ul className="space-y-3">
                {dados.avisos.map((a: any) => (
                  <li key={a.id} className="rounded-md border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="flex items-center gap-1.5 font-semibold">
                        {a.fixado && <Pin className="h-3.5 w-3.5 text-primary" />}
                        {a.titulo}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {dataHora(a.criadoEm)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.mensagem}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
