import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench,
  CalendarRange,
  Package,
  HardHat,
  Building2,
  Users,
  IdCard,
  Pin,
  ArrowRight,
  BookText,
  ClipboardCheck,
  Vote,
  Home,
  ClipboardList,
  Wallet
} from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import { useAuth } from '@/hooks/useAuth';
import { dataCurta, dataHora, prazoTexto } from '@/lib/format';
import { rotaVisivel } from '@/components/layout/nav-items';
import { LABEL } from '@/types/condominio';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { ProgressStat } from '@/components/shared/ProgressStat';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/** "1 encomenda parada" / "2 encomendas paradas" */
const pl = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Card com título e link "Ver todos" no canto. */
function Painel({ titulo, to, children, className }: { titulo: string; to: string; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{titulo}</CardTitle>
        <Link to={to} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          Ver todos <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Numero({ icon: Icon, label, valor, to }: { icon: typeof Home; label: string; valor: ReactNode; to?: string }) {
  const corpo = (
    <div className="h-full rounded-md bg-muted p-3 transition-colors hover:bg-muted/70">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className="mt-1 font-heading text-xl font-extrabold">{valor}</p>
    </div>
  );
  return to ? <Link to={to}>{corpo}</Link> : corpo;
}

export default function Dashboard() {
  const auth = useAuth();
  const { dados } = useDashboard();
  const ve = (to: string) => rotaVisivel(to, auth);
  const cabecalho = <PageHeader title="Painel" />;

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
  const comChamados = ve('/chamados');
  const s = dados.sindico;

  const mural = (
    <Painel titulo="Mural de avisos" to="/avisos" className="lg:col-span-2">
      {dados.avisos.length === 0 ? (
        <EmptyState title="Nenhum aviso publicado" description="Quando o síndico publicar algo, aparece aqui." />
      ) : (
        <ul className="space-y-3">
          {dados.avisos.map((a) => (
            <li key={a.id} className="rounded-md border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="flex items-center gap-1.5 font-semibold">
                  {a.fixado && <Pin className="h-3.5 w-3.5 text-primary" />}
                  {a.titulo}
                </p>
                <span className="shrink-0 text-xs text-muted-foreground">{dataHora(a.criadoEm)}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.mensagem}</p>
            </li>
          ))}
        </ul>
      )}
    </Painel>
  );

  return (
    <div className="space-y-6">
      {cabecalho}

      {s?.assembleiaAberta && (
        <Link
          to={`/votacoes/${s.assembleiaAberta.id}`}
          className="flex items-center gap-4 rounded-xl bg-primary p-4 text-primary-foreground shadow-md transition-opacity hover:opacity-95"
        >
          <Vote className="h-8 w-8 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-bold leading-tight">Assembleia acontecendo agora</p>
            <p className="truncate text-sm opacity-90">{s.assembleiaAberta.titulo}</p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {comChamados && (
          <StatCard to="/chamados" label="Chamados abertos" value={c.aberto} hint={`${c.em_andamento} em andamento`} icon={Wrench} tone="warning" />
        )}
        {ve('/reservas') && (
          <StatCard
            to="/reservas"
            label="Reservas pendentes"
            value={dados.reservas.pendentes}
            hint={`${dados.reservas.proximas} aprovadas a caminho`}
            icon={CalendarRange}
            tone="secondary"
          />
        )}
        {ve('/encomendas') && (
          <StatCard
            to="/encomendas"
            label="Encomendas na portaria"
            value={dados.encomendas.aguardando}
            hint={s?.encomendasParadas ? `${pl(s.encomendasParadas, 'parada', 'paradas')} há 3+ dias` : 'aguardando retirada'}
            icon={Package}
            tone={s?.encomendasParadas ? 'warning' : 'info'}
          />
        )}
        {s && (
          <>
            <StatCard
              to="/ocorrencias"
              label="Ocorrências em aberto"
              value={s.ocorrencias.aberto + s.ocorrencias.em_andamento}
              hint={`${pl(s.ocorrencias.aberto, 'nova', 'novas')} · ${pl(s.ocorrencias.em_andamento, 'pendente', 'pendentes')}`}
              icon={BookText}
              tone={s.ocorrencias.aberto ? 'warning' : 'secondary'}
            />
            <StatCard
              to="/tarefas"
              label="Tarefas de hoje"
              value={`${s.tarefasHoje.feitas}/${s.tarefasHoje.total}`}
              hint={
                s.tarefasHoje.atrasadas
                  ? pl(s.tarefasHoje.atrasadas, 'atrasada', 'atrasadas')
                  : s.tarefasHoje.total === 0
                    ? 'nenhuma tarefa hoje'
                    : `${s.tarefasHoje.total - s.tarefasHoje.feitas} a fazer`
              }
              icon={ClipboardCheck}
              tone={s.tarefasHoje.atrasadas ? 'destructive' : s.tarefasHoje.feitas === s.tarefasHoje.total ? 'success' : 'info'}
            />
          </>
        )}
        {dados.manutencoes && (
          <StatCard
            to="/manutencao-predial?aba=plano"
            label="Manutenções vencidas"
            value={dados.manutencoes.vencidas}
            hint={`${pl(dados.manutencoes.proximas, 'próxima', 'próximas')} do prazo`}
            icon={HardHat}
            tone={dados.manutencoes.vencidas ? 'destructive' : 'success'}
          />
        )}
      </div>

      {s && dados.totais && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Painel titulo="Próximas manutenções" to="/manutencao-predial?aba=plano">
            {s.proximasManutencoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum plano de manutenção ativo.</p>
            ) : (
              <ul className="divide-y divide-border">
                {s.proximasManutencoes.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.titulo}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {dataCurta(m.proxima)} · {prazoTexto(m.dias)}
                        {m.prestadorNome && ` · ${m.prestadorNome}`}
                      </p>
                    </div>
                    <StatusBadge status={m.status} className="shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </Painel>

          <Painel titulo="Ocorrências em aberto" to="/ocorrencias">
            {s.ocorrencias.recentes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma ocorrência em aberto. 🎉</p>
            ) : (
              <ul className="divide-y divide-border">
                {s.ocorrencias.recentes.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{o.titulo}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {LABEL.categoriaOcorrencia[o.categoria] ?? o.categoria} · {dataCurta(o.criadoEm)}
                      </p>
                    </div>
                    <StatusBadge status={o.status} className="shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </Painel>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Condomínio</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Numero icon={Building2} label="Unidades" valor={dados.totais.unidades} to="/unidades" />
              <Numero icon={Users} label="Moradores" valor={dados.totais.moradores} to="/moradores" />
              <Numero icon={IdCard} label="Funcionários" valor={dados.totais.funcionarios} to="/funcionarios" />
              <Numero icon={Home} label="Unidades sem morador" valor={dados.totais.unidadesVazias} to="/unidades" />
              <Numero icon={ClipboardList} label="OS em aberto" valor={s.ordensAbertas} to="/manutencao-predial?aba=ordens" />
              <Numero icon={Wallet} label="Gasto com OS no mês" valor={moeda(s.custoMes)} to="/manutencao-predial?aba=ordens" />
            </CardContent>
          </Card>
        </div>
      )}

      {s ? (
        <div className="grid gap-6 lg:grid-cols-2">{mural}</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {comChamados && (
            <Card>
              <CardHeader>
                <CardTitle>Chamados</CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressStat
                  label="Resolvidos"
                  value={c.concluido}
                  total={totalChamados}
                  indicatorClassName="bg-success"
                  hint={`${c.aberto} abertos · ${c.em_andamento} em andamento`}
                />
              </CardContent>
            </Card>
          )}
          <div className={comChamados ? 'lg:col-span-2' : 'lg:col-span-3'}>{mural}</div>
        </div>
      )}
    </div>
  );
}
