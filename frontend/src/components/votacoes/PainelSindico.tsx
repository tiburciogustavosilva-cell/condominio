import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Expand, FileSignature, Loader2, Pencil, Play, Plus, Square, Trash2, UserCheck, Vote, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import type { NovaPauta, useAssembleia } from '@/hooks/useAssembleias';
import { useAuth } from '@/hooks/useAuth';
import { useUnidades } from '@/hooks/useUnidades';
import { rotuloUnidade } from '@/lib/format';
import type { Assembleia, Pauta } from '@/types/condominio';
import { AsyncConfirmDialog } from '@/components/shared/AsyncConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CamposPauta, PAUTA_VAZIA } from './CamposPauta';
import { Andamento } from './Placar';
import { VotoPelaMesa } from './VotoPelaMesa';
import { VotarAgora } from './VotacaoCondomino';
import { ResultadoPauta } from './ResultadoPauta';

type Acoes = ReturnType<typeof useAssembleia>;

const selectCls =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export const STATUS_PAUTA = {
  rascunho: <Badge variant="muted">Aguardando</Badge>,
  votando: <Badge variant="success">Votação aberta</Badge>,
  encerrada: <Badge variant="secondary">Encerrada</Badge>
};

/** Síndico conduz a reunião: projeta o código, acompanha o quórum e abre/encerra cada pauta. */
export function PainelSindico({ assembleia: a, acoes }: { assembleia: Assembleia; acoes: Acoes }) {
  const aberta = a.status === 'aberta';
  const navigate = useNavigate();
  const semVotos = a.pautas.every((p) => p.votantes === 0);

  return (
    <div className="space-y-4">
      {aberta && <CodigoPresenca assembleia={a} />}
      {aberta && <PresencaManual assembleia={a} acoes={acoes} />}
      {aberta && <Procuracoes assembleia={a} acoes={acoes} />}

      {a.pautas.map((p, i) => (
        <CardPauta key={p.id} pauta={p} numero={i + 1} assembleia={a} acoes={acoes} />
      ))}

      {aberta && (
        <div className="flex flex-wrap justify-between gap-2">
          <PautaDialog
            trigger={
              <Button variant="outline">
                <Plus className="h-4 w-4" /> Adicionar pauta
              </Button>
            }
            titulo="Nova pauta"
            rotulo="Adicionar"
            sucesso="Pauta adicionada"
            salvar={acoes.adicionarPauta}
          />
          <div className="flex flex-wrap gap-2">
            {/* criada por engano: só enquanto ninguém votou (depois vira registro da reunião) */}
            {semVotos && (
              <AsyncConfirmDialog
                trigger={
                  <Button variant="ghost">
                    <Trash2 className="h-4 w-4" /> Excluir assembleia
                  </Button>
                }
                title="Excluir a assembleia?"
                description="Ela some para todos, com as pautas e as presenças. Só é possível porque ninguém votou ainda."
                confirmLabel="Excluir"
                confirmVariant="destructive"
                successMessage="Assembleia excluída"
                onConfirm={() => acoes.excluir().then(() => navigate('/votacoes', { replace: true }))}
              />
            )}
            <AsyncConfirmDialog
              trigger={<Button variant="outline">Encerrar assembleia</Button>}
              title="Encerrar a assembleia?"
              description="Todas as votações abertas são encerradas e ninguém mais faz check-in ou vota."
              confirmLabel="Encerrar"
              confirmVariant="destructive"
              successMessage="Assembleia encerrada"
              onConfirm={acoes.encerrar}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Para projetar: QR (abre a votação no celular, pede login se preciso, e já confirma a presença)
 * + número de 6 dígitos para quem prefere digitar. Os dois trocam a cada minuto.
 */
function CodigoPresenca({ assembleia: a }: { assembleia: Assembleia }) {
  const ref = useRef<HTMLDivElement>(null);
  const link = `${window.location.origin}/votacoes/${a.id}?qr=${a.qr ?? ''}`;
  const restante = a.codigoExpiraEm && a.agora ? new Date(a.codigoExpiraEm).getTime() - new Date(a.agora).getTime() : 0;
  // Quórum pelo peso do voto (cadastrado na unidade), não pela contagem simples de unidades.
  const quorum = a.pesoTotal ? Math.round((a.pesoPresente / a.pesoTotal) * 100) : 0;

  return (
    <Card>
      <CardContent
        ref={ref}
        className="flex flex-col items-center gap-3 bg-card pt-6 text-center [&:fullscreen]:justify-center [&:fullscreen]:gap-8"
      >
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10 [:fullscreen_&]:gap-20">
          <div className="space-y-2">
            <p className="text-xl font-semibold text-muted-foreground [:fullscreen_&]:text-4xl">
              Aponte a câmera do celular
            </p>
            {/* fundo branco sempre: leitor de QR falha com QR claro em fundo escuro */}
            <div className="mx-auto w-fit rounded-xl bg-white p-3">
              <QRCodeSVG
                value={link}
                size={200}
                marginSize={1}
                className="h-48 w-48 [:fullscreen_&]:h-[45vh] [:fullscreen_&]:w-[45vh]"
                aria-label="QR code para entrar na votação"
              />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xl font-semibold text-muted-foreground [:fullscreen_&]:text-4xl">
              ou digite este número
            </p>
            <p className="font-mono text-6xl font-bold tracking-[0.2em] tabular-nums sm:text-7xl [:fullscreen_&]:text-[10rem]">
              {a.codigo ? `${a.codigo.slice(0, 3)} ${a.codigo.slice(3)}` : '—'}
            </p>
          </div>
        </div>
        <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-[2000ms] ease-linear"
            style={{
              width: `${Math.max(0, Math.min(100, (restante / 60_000) * 100))}%`
            }}
          />
        </div>
        <p className="text-lg font-semibold">
          {a.presentes} de {a.totalUnidades} unidades presentes ({quorum}%)
        </p>
        <Button variant="outline" size="sm" onClick={() => ref.current?.requestFullscreen?.()}>
          <Expand className="h-4 w-4" /> Tela cheia para projetar
        </Button>
      </CardContent>
    </Card>
  );
}

/** Para quem está na sala mas não tem celular: o síndico marca a unidade. */
function PresencaManual({ assembleia: a, acoes }: { assembleia: Assembleia; acoes: Acoes }) {
  const marcar = acoes.marcarPresenca;
  const { unidades } = useUnidades();
  const [unidadeId, setUnidadeId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const presentes = new Set(a.presencas?.map((p) => p.unidade.id));
  const ausentes = unidades.filter((u) => !presentes.has(u.id));

  async function enviar() {
    setEnviando(true);
    try {
      await marcar(unidadeId);
      setUnidadeId('');
      toast.success('Presença marcada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao marcar');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <p className="text-sm font-semibold">Presentes</p>
        {a.presencas?.length ? (
          <div className="flex flex-wrap gap-2">
            {a.presencas.map((p) => (
              <Badge key={p.unidade.id} variant={p.manual ? 'outline' : 'secondary'} className="gap-1 pr-1">
                {rotuloUnidade(p.unidade)}
                {/* marcada por engano: o backend só deixa tirar se a unidade ainda não votou */}
                <AsyncConfirmDialog
                  trigger={
                    <button
                      type="button"
                      className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Remover presença de ${rotuloUnidade(p.unidade)}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  }
                  title={`Remover a presença de ${rotuloUnidade(p.unidade)}?`}
                  description="Use se a presença foi marcada por engano. Unidade que já votou não pode ser removida."
                  confirmLabel="Remover"
                  confirmVariant="destructive"
                  successMessage="Presença removida"
                  onConfirm={() => acoes.removerPresenca(p.unidade.id)}
                />
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Ninguém fez check-in ainda.</p>
        )}
        {ausentes.length > 0 && (
          <div className="flex gap-2">
            <select
              aria-label="Unidade sem celular"
              className={selectCls}
              value={unidadeId}
              onChange={(e) => setUnidadeId(e.target.value)}
            >
              <option value="">Marcar unidade sem celular…</option>
              {ausentes.map((u) => (
                <option key={u.id} value={u.id}>
                  {rotuloUnidade(u)}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={enviar} disabled={!unidadeId || enviando}>
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              Presente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Registro (ata) de procurações: qual unidade concedeu (outorgante, ausente) a
 * procuração pra qual unidade a representar (procuradora). Só documentação —
 * não marca presença nem muda quem pode votar.
 */
function Procuracoes({ assembleia: a, acoes }: { assembleia: Assembleia; acoes: Acoes }) {
  const { unidades } = useUnidades();
  const [outorganteId, setOutorganteId] = useState('');
  const [procuradoraId, setProcuradoraId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const jaOutorgaram = new Set(a.procuracoes?.map((p) => p.unidadeOutorgante.id));
  const disponiveis = unidades.filter((u) => !jaOutorgaram.has(u.id));
  const opcoesProcuradora = unidades.filter((u) => u.id !== outorganteId);

  async function enviar() {
    setEnviando(true);
    try {
      await acoes.adicionarProcuracao(outorganteId, procuradoraId);
      setOutorganteId('');
      setProcuradoraId('');
      toast.success('Procuração registrada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <FileSignature className="h-4 w-4" /> Procurações
        </p>
        {a.procuracoes?.length ? (
          <div className="flex flex-wrap gap-2">
            {a.procuracoes.map((p) => (
              <Badge key={p.id} variant="outline" className="gap-1 pr-1">
                {rotuloUnidade(p.unidadeOutorgante)} → {rotuloUnidade(p.unidadeProcuradora)}
                <AsyncConfirmDialog
                  trigger={
                    <button
                      type="button"
                      className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Remover procuração de ${rotuloUnidade(p.unidadeOutorgante)}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  }
                  title="Remover essa procuração?"
                  confirmLabel="Remover"
                  confirmVariant="destructive"
                  successMessage="Procuração removida"
                  onConfirm={() => acoes.removerProcuracao(p.id)}
                />
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma procuração registrada.</p>
        )}
        {disponiveis.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Unidade que concede a procuração"
              className={selectCls}
              value={outorganteId}
              onChange={(e) => {
                setOutorganteId(e.target.value);
                if (e.target.value === procuradoraId) setProcuradoraId('');
              }}
            >
              <option value="">Unidade que concede…</option>
              {disponiveis.map((u) => (
                <option key={u.id} value={u.id}>
                  {rotuloUnidade(u)}
                </option>
              ))}
            </select>
            <select
              aria-label="Unidade que recebe a procuração"
              className={selectCls}
              value={procuradoraId}
              onChange={(e) => setProcuradoraId(e.target.value)}
            >
              <option value="">Unidade que representa…</option>
              {opcoesProcuradora.map((u) => (
                <option key={u.id} value={u.id}>
                  {rotuloUnidade(u)}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={enviar} disabled={!outorganteId || !procuradoraId || enviando}>
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
              Registrar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type PropsPauta = {
  pauta: Pauta;
  numero: number;
  assembleia: Assembleia;
  acoes: Acoes;
};

function CardPauta({ pauta: p, numero, assembleia, acoes }: PropsPauta) {
  const aberta = assembleia.status === 'aberta';
  const mudarStatus = acoes.mudarStatusPauta;
  if (p.status === 'encerrada') return <ResultadoPauta pauta={p} numero={numero} />;
  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Pauta {numero}</p>
            <p className="font-semibold">{p.titulo}</p>
            {p.descricao && <p className="text-sm text-muted-foreground">{p.descricao}</p>}
          </div>
          {STATUS_PAUTA[p.status]}
        </div>

        {p.status === 'rascunho' ? (
          <p className="text-sm text-muted-foreground">Opções: {p.opcoes.map((o) => o.texto).join(' · ')}</p>
        ) : (
          <Andamento pauta={p} presentes={assembleia.presentes} />
        )}

        {aberta && p.status === 'rascunho' && (
          <div className="flex flex-wrap gap-2">
            <AsyncConfirmDialog
              trigger={
                <Button variant="brand" size="sm">
                  <Play className="h-4 w-4" /> Abrir votação
                </Button>
              }
              title={`Abrir a votação de "${p.titulo}"?`}
              description="Os presentes já podem votar pelo celular. Depois de aberta, a pauta não pode mais ser editada."
              confirmLabel="Abrir votação"
              successMessage="Votação aberta"
              onConfirm={() => mudarStatus(p.id, 'votando')}
            />
            <PautaDialog
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
              }
              titulo="Editar pauta"
              inicial={{ titulo: p.titulo, descricao: p.descricao, opcoes: p.opcoes.map((o) => o.texto) }}
              rotulo="Salvar"
              sucesso="Pauta atualizada"
              salvar={(dados) => acoes.editarPauta(p.id, dados)}
            />
            <AsyncConfirmDialog
              trigger={
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4" /> Excluir
                </Button>
              }
              title={`Excluir a pauta "${p.titulo}"?`}
              confirmLabel="Excluir"
              confirmVariant="destructive"
              successMessage="Pauta excluída"
              onConfirm={() => acoes.removerPauta(p.id)}
            />
          </div>
        )}
        {aberta && p.status === 'votando' && (
          <div className="flex flex-wrap gap-2">
            <VotarMinhaUnidade assembleia={assembleia} pauta={p} votar={acoes.votar} />
            <VotoPelaMesa assembleia={assembleia} pauta={p} votar={acoes.votar} />
            <AsyncConfirmDialog
              trigger={
                <Button variant="outline" size="sm">
                  <Square className="h-4 w-4" /> Encerrar votação
                </Button>
              }
              title={`Encerrar a votação de "${p.titulo}"?`}
              description={`${p.votantes} unidade(s) votaram. Depois de encerrar, ninguém mais vota nessa pauta.`}
              confirmLabel="Encerrar"
              successMessage="Votação encerrada"
              onConfirm={() => mudarStatus(p.id, 'encerrada')}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type PropsPautaDialog = {
  trigger: ReactNode;
  titulo: string;
  inicial?: NovaPauta;
  rotulo: string;
  sucesso: string;
  salvar: (pauta: NovaPauta) => Promise<unknown>;
};

/** Criar ou editar uma pauta (editar só antes de abrir a votação). */
function PautaDialog({ trigger, titulo, inicial = PAUTA_VAZIA, rotulo, sucesso, salvar }: PropsPautaDialog) {
  const [aberto, setAberto] = useState(false);
  const [pauta, setPauta] = useState<NovaPauta>(inicial);
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await salvar(pauta);
      toast.success(sucesso);
      setAberto(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <span
        onClick={() => {
          setPauta(inicial);
          setAberto(true);
        }}
      >
        {trigger}
      </span>
      <Dialog open={aberto} onOpenChange={(v) => !salvando && setAberto(v)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
          </DialogHeader>
          <form onSubmit={enviar} className="space-y-4">
            <CamposPauta id="pauta-dialog" pauta={pauta} onChange={setPauta} />
            <div className="flex justify-end">
              <Button type="submit" variant="brand" disabled={salvando}>
                {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
                {rotulo}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Síndico que também mora no prédio vota pela própria unidade (a presença dela entra junto). */
function VotarMinhaUnidade({
  assembleia,
  pauta,
  votar
}: {
  assembleia: Assembleia;
  pauta: Pauta;
  votar: Acoes['votar'];
}) {
  const { usuario } = useAuth();
  const [aberto, setAberto] = useState(false);
  if (!usuario?.unidadeId) return null;
  if (assembleia.minhaUnidade?.pautasVotadas.includes(pauta.id)) {
    return <Badge variant="success">Sua unidade votou</Badge>;
  }

  return (
    <>
      <Button variant="brand" size="sm" onClick={() => setAberto(true)}>
        <Vote className="h-4 w-4" /> Votar pela minha unidade
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Seu voto</DialogTitle>
          </DialogHeader>
          <VotarAgora
            pauta={pauta}
            votar={(pautaId, opcaoId) =>
              votar(pautaId, opcaoId).then(() => {
                setAberto(false);
                toast.success('Voto registrado');
              })
            }
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
