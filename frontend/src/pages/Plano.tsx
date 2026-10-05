import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useUnidades } from '@/hooks/useUnidades';
import { api } from '@/lib/api';
import { dataCurta } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type PlanoId = 'basic' | 'pro' | 'premium';
type PlanoCatalogo = { id: PlanoId; nome: string; precoUnidade: number; recursos: string[] };

// Textos de venda de cada plano (os recursos de verdade vêm do backend).
const DESTAQUES: Record<PlanoId, { selo?: string; itens: string[] }> = {
  basic: {
    itens: ['Assembleias e votações digitais', 'Votação em tempo real', 'Acompanhamento dos resultados', 'Histórico das votações'],
  },
  pro: {
    selo: 'Recomendado',
    itens: [
      'Tudo do plano Basic',
      'Avisos aos condôminos',
      'Registro de ocorrências',
      'Gestão de encomendas',
      'Cadastro de moradores e unidades',
      'Notificações',
    ],
  },
  premium: {
    itens: [
      'Tudo do plano Pro',
      'Gestão de manutenções',
      'Gestão de tarefas para colaboradores',
      'Registro fotográfico das tarefas realizadas',
      'Planta baixa interativa do condomínio',
      'Dashboard com indicadores e insights',
      'Visão geral da operação do condomínio',
      'Suporte prioritário',
    ],
  },
};

const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Cobrança mensal do condomínio: cada unidade paga o preço do plano escolhido. */
export default function Plano() {
  const { condominio, recarregarCondominio } = useAuth();
  const { unidades } = useUnidades();
  const [catalogo, setCatalogo] = useState<PlanoCatalogo[]>([]);
  const [trocando, setTrocando] = useState<PlanoId | null>(null);

  useEffect(() => {
    api.get<PlanoCatalogo[]>('/condominios/planos').then(setCatalogo).catch(() => setCatalogo([]));
  }, []);

  const atual = condominio?.plano;
  const acesso = condominio?.acesso;
  const qtdUnidades = unidades.length;

  async function escolher(plano: PlanoId) {
    setTrocando(plano);
    try {
      await api.patch('/condominios/plano', { plano });
      await recarregarCondominio();
      toast.success(`Plano ${catalogo.find((p) => p.id === plano)?.nome ?? ''} escolhido`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível trocar o plano');
    } finally {
      setTrocando(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu plano"
        description="Cobrança mensal por unidade. Durante o teste gratuito, todos os módulos estão liberados."
      />

      <Card>
        <CardContent className="space-y-1 pt-5">
          {acesso?.emTeste && (
            <p className="font-semibold">Teste gratuito até {dataCurta(acesso.trialAte)}. Todos os módulos liberados.</p>
          )}
          {!acesso?.emTeste && acesso?.pagoAte && (
            <p className="font-semibold">Assinatura em dia até {dataCurta(acesso.pagoAte)}.</p>
          )}
          {!acesso?.emTeste && !acesso?.pagoAte && (
            <p className="font-semibold text-destructive">
              O teste terminou e não há assinatura vigente. Escolha o plano e fale com o suporte para regularizar.
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {qtdUnidades} unidade(s) cadastrada(s) no condomínio.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {catalogo.map((p) => {
          const destaque = DESTAQUES[p.id];
          const ehAtual = atual === p.id;
          return (
            <Card key={p.id} className={cn('flex flex-col', ehAtual && 'border-primary ring-1 ring-primary')}>
              <CardContent className="flex flex-1 flex-col gap-4 pt-6">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-heading text-xl font-extrabold">{p.nome}</p>
                  {destaque.selo && <Badge variant="info">{destaque.selo}</Badge>}
                </div>
                <div>
                  <p className="text-2xl font-extrabold">
                    {reais(p.precoUnidade)}
                    <span className="text-sm font-normal text-muted-foreground"> / unidade / mês</span>
                  </p>
                  {qtdUnidades > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {qtdUnidades} unidades = <strong>{reais(p.precoUnidade * qtdUnidades)}/mês</strong>
                    </p>
                  )}
                </div>
                <ul className="flex-1 space-y-2 text-sm">
                  {destaque.itens.map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={ehAtual ? 'outline' : 'brand'}
                  disabled={ehAtual || trocando !== null}
                  onClick={() => escolher(p.id)}
                >
                  {trocando === p.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  {ehAtual ? 'Plano atual' : `Escolher o ${p.nome}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
