import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Hourglass, Loader2, LogIn, ThumbsDown, ThumbsUp, type LucideIcon } from 'lucide-react';
import type { useAssembleia } from '@/hooks/useAssembleias';
import { useAuth } from '@/hooks/useAuth';
import type { Assembleia, Pauta } from '@/types/condominio';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Andamento } from './Placar';
import { ResultadoPauta } from './ResultadoPauta';

type Acoes = ReturnType<typeof useAssembleia>;
type Opcao = Pauta['opcoes'][number];

/**
 * Condômino (pensado para idosos): letra grande, uma pergunta por vez, nada para procurar.
 * Check-in pelo QR (automático) ou pelo número do telão → a votação aberta aparece sozinha → toca na opção → confirma.
 */
export function VotacaoCondomino({ assembleia: a, acoes }: { assembleia: Assembleia; acoes: Acoes }) {
  const { usuario } = useAuth();
  const aberta = a.status === 'aberta';
  const minha = a.minhaUnidade;
  const votadas = minha?.pautasVotadas ?? [];
  // Pauta que não permite o vínculo da pessoa pula pra frente sozinha — nunca trava esperando um voto que não vai rolar.
  const podeVotar = (p: Pauta) => !usuario?.vinculo || p.vinculosPermitidos.includes(usuario.vinculo);
  const daVez = aberta
    ? a.pautas.find((p) => p.status === 'votando' && !votadas.includes(p.id) && podeVotar(p))
    : undefined;
  // andamento das que já votei (ainda abertas) e, embaixo, o resultado final: a última encerrada primeiro
  const parciais = a.pautas.filter((p) => p.status === 'votando' && votadas.includes(p.id));
  const encerradas = a.pautas.filter((p) => p.status === 'encerrada').reverse();

  // vibra quando uma votação nova aparece (o celular pode estar no colo)
  const anterior = useRef<string | undefined>();
  useEffect(() => {
    if (daVez && anterior.current !== daVez.id) navigator.vibrate?.(300);
    anterior.current = daVez?.id;
  }, [daVez]);

  if (aberta && !minha) {
    return (
      <EmptyState
        icon={LogIn}
        title="Sua conta não está ligada a um apartamento"
        description="Fale com o síndico na entrada. Ele marca a sua presença."
      />
    );
  }
  if (aberta && !minha?.presente) return <CheckIn checkin={acoes.checkin} />;

  return (
    <div className="space-y-6">
      {aberta &&
        (daVez ? (
          <VotarAgora key={daVez.id} pauta={daVez} votar={acoes.votar} />
        ) : (
          <Aguarde jaVotou={votadas.length > 0} />
        ))}

      {parciais.map((p) => (
        <Card key={p.id}>
          <CardContent className="space-y-3 pt-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-success">Sua unidade já votou</p>
            <p className="text-lg font-semibold">{p.titulo}</p>
            <Andamento pauta={p} presentes={a.presentes} grande />
          </CardContent>
        </Card>
      ))}

      {encerradas.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">{aberta ? 'Votações encerradas' : 'Resultado de cada votação'}</h2>
          {encerradas.map((p) => (
            <ResultadoPauta key={p.id} pauta={p} grande />
          ))}
        </section>
      )}
    </div>
  );
}

/**
 * Veio pelo QR do telão (?qr=...): confirma a presença sozinho, sem digitar nada.
 * Senão (ou se o QR expirou): um campo só, números grandes; entra sozinho ao completar os 6 dígitos.
 */
function CheckIn({ checkin }: { checkin: Acoes['checkin'] }) {
  const [params, setParams] = useSearchParams();
  const qr = params.get('qr');
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(!!qr);
  const [erro, setErro] = useState('');
  const campo = useRef<HTMLInputElement>(null);
  const tentouQr = useRef(false);

  useEffect(() => {
    if (!qr || tentouQr.current) return;
    tentouQr.current = true;
    setParams({}, { replace: true }); // tira o token da URL (não fica no histórico nem é repassado)
    enviar({ qr });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qr]);

  async function enviar(dados: Parameters<Acoes['checkin']>[0]) {
    setEnviando(true);
    setErro('');
    try {
      await checkin(dados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Esse número não confere. Olhe o telão e digite de novo.');
      setCodigo('');
    } finally {
      setEnviando(false);
      setTimeout(() => campo.current?.focus()); // volta o teclado para tentar de novo
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="space-y-5 pt-8 text-center">
        <div className="space-y-2">
          <p className="text-2xl font-bold">Confirme que você está na reunião</p>
          <p className="text-lg text-muted-foreground">Digite o número que aparece no telão.</p>
        </div>
        <Input
          ref={campo}
          aria-label="Número do telão"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="• • • • • •"
          className="h-20 text-center font-mono text-5xl tracking-[0.25em]"
          value={codigo}
          disabled={enviando}
          autoFocus
          onChange={(e) => {
            const valor = e.target.value.replace(/\D/g, '').slice(0, 6);
            setCodigo(valor);
            if (valor.length === 6) enviar({ codigo: valor });
          }}
        />
        {enviando && (
          <p className="flex items-center justify-center gap-2 text-lg">
            <Loader2 className="h-5 w-5 animate-spin" /> Confirmando sua presença…
          </p>
        )}
        {erro && (
          <p role="alert" className="text-lg font-semibold text-destructive">
            {erro}
          </p>
        )}
        <p className="text-base text-muted-foreground">
          Não conseguiu? Fale com o síndico na entrada: ele marca a sua presença.
        </p>
      </CardContent>
    </Card>
  );
}

/** Ícone e cor só para Sim/Não, os casos mais comuns; o resto fica neutro. */
function visual(texto: string): { icon?: LucideIcon; cls: string } {
  const t = texto.trim().toLowerCase();
  if (t === 'sim')
    return {
      icon: ThumbsUp,
      cls: 'border-success text-success hover:bg-success/10'
    };
  if (t === 'não' || t === 'nao')
    return {
      icon: ThumbsDown,
      cls: 'border-destructive text-destructive hover:bg-destructive/10'
    };
  return { cls: 'border-input hover:bg-accent' };
}

/** Tela grande de uma pergunta; também usada no voto pela mesa (aparelho do síndico na mão do morador). */
export function VotarAgora({
  pauta,
  votar
}: {
  pauta: Pauta;
  votar: (pautaId: string, opcaoId: string) => Promise<unknown>;
}) {
  const [escolha, setEscolha] = useState<Opcao | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function confirmar() {
    if (!escolha) return;
    setEnviando(true);
    setErro('');
    try {
      await votar(pauta.id, escolha.id); // recarrega: esta pauta sai e aparece o "Voto registrado"
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível votar. Tente de novo.');
      setEnviando(false);
    }
  }

  return (
    <Card className="border-2 border-primary">
      <CardContent className="space-y-5 pt-6">
        <div className="space-y-2">
          <p className="text-base font-bold uppercase tracking-wide text-primary">Vote agora</p>
          <p className="text-2xl font-bold leading-tight">{pauta.titulo}</p>
          {pauta.descricao && <p className="text-lg text-muted-foreground">{pauta.descricao}</p>}
        </div>

        <div className="space-y-3">
          {pauta.opcoes.map((o) => {
            const { icon: Icon, cls } = visual(o.texto);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setEscolha(o)}
                className={cn(
                  'flex min-h-16 w-full items-center justify-center gap-3 rounded-xl border-2 bg-background px-4 py-3 text-2xl font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring',
                  cls
                )}
              >
                {Icon && <Icon className="h-7 w-7" aria-hidden />}
                {o.texto}
              </button>
            );
          })}
        </div>
        <p className="text-center text-base text-muted-foreground">
          Ninguém vê sua escolha enquanto a votação está aberta. Depois de encerrada, o resultado mostra o voto de
          cada unidade.
        </p>
      </CardContent>

      <Dialog open={!!escolha} onOpenChange={(v) => !enviando && !v && setEscolha(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Você escolheu</DialogTitle>
            <DialogDescription className="text-base">Depois de confirmar, não dá para mudar.</DialogDescription>
          </DialogHeader>
          <p className="py-2 text-center text-4xl font-bold">{escolha?.texto}</p>
          {erro && (
            <p role="alert" className="text-center text-lg font-semibold text-destructive">
              {erro}
            </p>
          )}
          <div className="flex flex-col gap-3">
            <Button variant="brand" className="h-14 text-lg" onClick={confirmar} disabled={enviando}>
              {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              Confirmar meu voto
            </Button>
            <Button variant="outline" className="h-14 text-lg" onClick={() => setEscolha(null)} disabled={enviando}>
              Voltar e escolher outra
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Aguarde({ jaVotou }: { jaVotou: boolean }) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-8 text-center">
        {jaVotou ? (
          <>
            <CheckCircle2 className="mx-auto h-16 w-16 text-success" aria-hidden />
            <p className="text-2xl font-bold">Seu voto foi registrado. Obrigado!</p>
          </>
        ) : (
          <>
            <Hourglass className="mx-auto h-14 w-14 text-muted-foreground" aria-hidden />
            <p className="text-2xl font-bold">Presença confirmada</p>
          </>
        )}
        <p className="text-lg text-muted-foreground">
          Pode deixar esta tela aberta. Quando o síndico abrir a próxima votação, ela aparece aqui sozinha.
        </p>
      </CardContent>
    </Card>
  );
}
