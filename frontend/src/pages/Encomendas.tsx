import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  Download,
  Eye,
  EyeOff,
  ImageIcon,
  KeyRound,
  Loader2,
  Lock,
  Package,
  Plus,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useEncomendas, type NovaEncomenda } from "@/hooks/useEncomendas";
import { useUnidades } from "@/hooks/useUnidades";
import { useAuth } from "@/hooks/useAuth";
import { dataHora } from "@/lib/format";
import { paraWebp } from "@/lib/imagem";
import { gerarRelatorioEncomendas } from "@/lib/exportarEncomendas";
import { nomeComFuncao, type Encomenda } from "@/types/condominio";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { FilterPills } from "@/components/shared/FilterPills";
import { EmptyState } from "@/components/shared/EmptyState";
import { Field } from "@/components/shared/Field";
import { AsyncConfirmDialog } from "@/components/shared/AsyncConfirmDialog";
import { BotaoDitado, juntarDitado } from "@/components/shared/BotaoDitado";
import { UnidadeSelect } from "@/components/shared/UnidadeSelect";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/shared/ListSkeleton";

const VAZIO: NovaEncomenda = {
  unidadeId: "",
  descricao: "",
  remetente: "",
  codigoRastreio: "",
  foto: "",
  volumeGrande: false,
  perecivel: false,
};

/** A partir de quantos dias aguardando a encomenda é destacada como parada. */
const DIAS_PARADA = 3;

const diasDesde = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

const FILTROS = [
  { value: "aguardando", label: "Aguardando" },
  { value: "entregue", label: "Retiradas" },
  { value: "", label: "Todas" },
];

export default function Encomendas() {
  const { isEquipe, isSindico } = useAuth();
  const {
    encomendas,
    carregando,
    recarregar,
    criar,
    retirar,
    desbloquear,
    fotoUrl,
    remover,
    autorizarTerceiro,
    removerAutorizado,
  } = useEncomendas();
  const { unidades } = useUnidades();
  const [form, setForm] = useState<NovaEncomenda>(VAZIO);
  const [convertendo, setConvertendo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [filtro, setFiltro] = useState("aguardando");
  const [busca, setBusca] = useState("");

  // ponytail: filtro/busca no cliente; paginar no backend quando a lista passar de alguns milhares
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return encomendas
      .filter((e) => !filtro || e.status === filtro)
      .filter(
        (e) =>
          !termo ||
          [e.descricao, e.unidadeLabel, e.codigoRastreio, e.remetente]
            .filter(Boolean)
            .some((campo) => campo!.toLowerCase().includes(termo)),
      )
      .sort(
        (a, b) =>
          Number(b.status === "aguardando" && b.perecivel) -
          Number(a.status === "aguardando" && a.perecivel),
      );
  }, [encomendas, filtro, busca]);

  function set<K extends keyof NovaEncomenda>(
    campo: K,
    valor: NovaEncomenda[K],
  ) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function escolherFoto(arquivo: File | undefined) {
    if (!arquivo) return;
    setConvertendo(true);
    try {
      set("foto", await paraWebp(arquivo));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível ler a foto",
      );
    } finally {
      setConvertendo(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.unidadeId) {
      toast.error("Selecione a unidade");
      return;
    }
    if (!form.foto) {
      toast.error("Tire ou anexe a foto da encomenda");
      return;
    }
    setLoading(true);
    try {
      await criar(form);
      toast.success(
        "Encomenda registrada — o morador já vê o código de retirada no app",
      );
      setForm(VAZIO);
      setModalAberto(false);
      recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Encomendas"
        description="Entregas recebidas na portaria."
        actions={
          <div className="flex flex-wrap gap-2">
            {isSindico && <RelatorioEncomendas encomendas={encomendas} />}
            {isEquipe && (
              <Button variant="brand" onClick={() => setModalAberto(true)}>
                <Plus className="h-4 w-4" /> Registrar encomenda
              </Button>
            )}
          </div>
        }
      />

      {isEquipe && (
        <Dialog
          open={modalAberto}
          onOpenChange={(aberto) => !loading && setModalAberto(aberto)}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar encomenda</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Unidade" htmlFor="uni">
                  <UnidadeSelect
                    id="uni"
                    unidades={unidades}
                    value={form.unidadeId}
                    onChange={(v) => set("unidadeId", v)}
                  />
                </Field>
                <Field label="Remetente / transportadora" htmlFor="rem">
                  <Input
                    id="rem"
                    value={form.remetente}
                    onChange={(e) => set("remetente", e.target.value)}
                  />
                </Field>
                <Field
                  label="Código de rastreio"
                  htmlFor="rastreio"
                  hint="Da etiqueta, se houver."
                >
                  <Input
                    id="rastreio"
                    autoComplete="off"
                    className="font-mono uppercase"
                    placeholder="AA123456789BR"
                    value={form.codigoRastreio}
                    onChange={(e) => set("codigoRastreio", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Descrição" htmlFor="desc">
                <div className="flex gap-2">
                  <Input
                    id="desc"
                    value={form.descricao}
                    onChange={(e) => set("descricao", e.target.value)}
                    required
                  />
                  <BotaoDitado
                    onTexto={(texto) =>
                      setForm((f) => ({
                        ...f,
                        descricao: juntarDitado(f.descricao, texto),
                      }))
                    }
                  />
                </div>
              </Field>
              <div className="flex flex-wrap gap-6 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={form.perecivel}
                    onChange={(e) => set("perecivel", e.target.checked)}
                  />
                  Perecível
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={form.volumeGrande}
                    onChange={(e) => set("volumeGrande", e.target.checked)}
                  />
                  Volume grande
                </label>
              </div>
              <Field label="Foto da encomenda" htmlFor="foto">
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" asChild>
                    <label htmlFor="foto" className="cursor-pointer">
                      {convertendo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      {form.foto ? "Trocar foto" : "Tirar / anexar foto"}
                    </label>
                  </Button>
                  <input
                    id="foto"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => escolherFoto(e.target.files?.[0])}
                  />
                  {form.foto && (
                    <img
                      src={form.foto}
                      alt="Prévia da encomenda"
                      className="h-16 w-16 rounded-md object-cover"
                    />
                  )}
                </div>
              </Field>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="brand"
                  disabled={loading || convertendo}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Registrar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterPills options={FILTROS} value={filtro} onChange={setFiltro} />
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar unidade, descrição, rastreio…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        {carregando ? (
          <ListSkeleton />
        ) : visiveis.length === 0 ? (
          <EmptyState
            icon={Package}
            title={
              encomendas.length === 0
                ? "Nenhuma encomenda registrada"
                : "Nenhuma encomenda neste filtro"
            }
          />
        ) : (
          visiveis.map((e) => (
            <Card key={e.id}>
              <CardContent className="space-y-4 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{e.descricao}</p>
                    {isEquipe && (
                      <p className="text-sm text-muted-foreground">
                        Unidade {e.unidadeLabel}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={e.status} />
                </div>

                <Marcacoes encomenda={e} />

                {!isEquipe && e.codigoRetirada && (
                  <CodigoRetirada codigo={e.codigoRetirada} />
                )}

                {!isEquipe && e.status === "aguardando" && (
                  <Autorizados
                    encomenda={e}
                    onAdicionar={(nome) =>
                      autorizarTerceiro(e.id, nome).then(recarregar)
                    }
                    onRemover={(autorizadoId) =>
                      removerAutorizado(e.id, autorizadoId).then(recarregar)
                    }
                  />
                )}

                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <Info rotulo="Remetente">{e.remetente || "—"}</Info>
                  <Info rotulo="Rastreio">
                    {e.codigoRastreio ? (
                      <span className="font-mono">{e.codigoRastreio}</span>
                    ) : (
                      "—"
                    )}
                  </Info>
                  <Info rotulo="Recebida em">{dataHora(e.criadoEm)}</Info>
                  <Info rotulo="Registrada por">
                    {e.registradoPor ? nomeComFuncao(e.registradoPor) : "—"}
                  </Info>
                  {e.status === "entregue" && (
                    <Info rotulo="Retirada por">
                      {e.recebidoPor}
                      <span className="text-muted-foreground">
                        {" "}
                        · {dataHora(e.entregueEm)}
                      </span>
                    </Info>
                  )}
                  {e.status === "entregue" && e.liberadoPor && (
                    <Info rotulo="Liberada por">
                      {nomeComFuncao(e.liberadoPor)}
                    </Info>
                  )}
                </dl>

                {(e.temFoto ||
                  (isEquipe && e.status === "aguardando") ||
                  isSindico) && (
                  <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
                    {e.temFoto && <VerFoto carregar={() => fotoUrl(e.id)} />}
                    {isSindico && e.bloqueada && e.status === "aguardando" && (
                      <AsyncConfirmDialog
                        trigger={
                          <Button size="sm" variant="outline">
                            <Lock className="h-4 w-4" /> Desbloquear
                          </Button>
                        }
                        title="Desbloquear retirada?"
                        description="Foram digitados 5 códigos errados. Confira com o morador antes de liberar novas tentativas."
                        confirmLabel="Desbloquear"
                        successMessage="Encomenda desbloqueada"
                        onConfirm={() => desbloquear(e.id).then(recarregar)}
                      />
                    )}
                    {isEquipe && e.status === "aguardando" && !e.bloqueada && (
                      <LiberarRetirada
                        encomenda={e}
                        onLiberar={(dados) =>
                          retirar(e.id, dados)
                            .then(recarregar)
                            .catch((err) => {
                              recarregar(); // o erro pode ter bloqueado a encomenda
                              throw err;
                            })
                        }
                      />
                    )}
                    {isSindico && (
                      <AsyncConfirmDialog
                        trigger={
                          <Button size="sm" variant="ghost">
                            Remover
                          </Button>
                        }
                        title="Remover registro?"
                        confirmLabel="Remover"
                        confirmVariant="destructive"
                        successMessage="Registro removido"
                        onConfirm={() => remover(e.id).then(recarregar)}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

/** Código do morador: fica escondido até ele tocar em "Liberar código" (evita alguém ver por cima do ombro). */
function CodigoRetirada({ codigo }: { codigo: string }) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
      <KeyRound className="h-4 w-4 text-primary" />
      Código de retirada:
      <span
        className="font-mono text-lg font-bold tracking-widest"
        aria-label={visivel ? codigo : "Código escondido"}
      >
        {visivel ? codigo : "•••••"}
      </span>
      <Button
        type="button"
        size="sm"
        variant={visivel ? "ghost" : "brand"}
        className="ml-auto"
        onClick={() => setVisivel((v) => !v)}
      >
        {visivel ? (
          <>
            <EyeOff className="h-4 w-4" /> Esconder
          </>
        ) : (
          <>
            <Eye className="h-4 w-4" /> Liberar código
          </>
        )}
      </Button>
      {visivel && (
        <span className="w-full text-xs text-muted-foreground">
          Informe esse código na portaria para retirar.
        </span>
      )}
    </div>
  );
}

/**
 * Morador autoriza terceiros (empregada, parente...) a retirar essa encomenda
 * junto com ele. É só referência: quem libera de verdade é o código.
 */
function Autorizados({
  encomenda,
  onAdicionar,
  onRemover,
}: {
  encomenda: Encomenda;
  onAdicionar: (nome: string) => Promise<unknown>;
  onRemover: (autorizadoId: string) => Promise<unknown>;
}) {
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [removendoId, setRemovendoId] = useState<string | null>(null);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      await onAdicionar(nome.trim());
      setNome("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao autorizar",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function remover(autorizadoId: string) {
    setRemovendoId(autorizadoId);
    try {
      await onRemover(autorizadoId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover");
    } finally {
      setRemovendoId(null);
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <UserPlus className="h-3.5 w-3.5" /> Outras pessoas que podem retirar
        (opcional)
      </p>
      {encomenda.autorizados.length > 0 && (
        <ul className="space-y-1">
          {encomenda.autorizados.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              {a.nome}
              <button
                type="button"
                onClick={() => remover(a.id)}
                disabled={removendoId === a.id}
                aria-label={`Remover ${a.nome}`}
                className="grid h-6 w-6 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-destructive disabled:opacity-50"
              >
                {removendoId === a.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={adicionar} className="flex gap-2">
        <Input
          placeholder="Nome (ex.: empregada, parente...)"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="h-8 text-sm"
        />
        <Button type="submit" size="sm" variant="outline" disabled={salvando}>
          {salvando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Adicionar
        </Button>
      </form>
    </div>
  );
}

/** Selos que ajudam a portaria a priorizar: perecível, volume grande, parada, bloqueada. */
function Marcacoes({ encomenda: e }: { encomenda: Encomenda }) {
  const aguardando = e.status === "aguardando";
  const dias = diasDesde(e.criadoEm);
  const selos = [
    aguardando && e.bloqueada && (
      <Badge key="bloq" variant="destructive">
        <Lock className="mr-1 h-3 w-3" /> Bloqueada — procure o síndico
      </Badge>
    ),
    aguardando && e.perecivel && (
      <Badge key="per" variant="warning">
        Perecível
      </Badge>
    ),
    e.volumeGrande && (
      <Badge key="vol" variant="info">
        Volume grande
      </Badge>
    ),
    aguardando && dias >= DIAS_PARADA && (
      <Badge key="par" variant="warning">
        Parada há {dias} dias
      </Badge>
    ),
  ].filter(Boolean);
  return selos.length ? (
    <div className="flex flex-wrap gap-2">{selos}</div>
  ) : null;
}

/** Síndico baixa um .xlsx das encomendas recebidas num período. */
function RelatorioEncomendas({ encomendas }: { encomendas: Encomenda[] }) {
  const hoje = new Date().toLocaleDateString("sv-SE");
  const inicioMes = hoje.slice(0, 8) + "01";
  const [de, setDe] = useState(inicioMes);
  const [ate, setAte] = useState(hoje);

  return (
    <AsyncConfirmDialog
      trigger={
        <Button variant="outline">
          <Download className="h-4 w-4" /> Relatório
        </Button>
      }
      title="Relatório de encomendas"
      description="Planilha .xlsx com as encomendas recebidas no período."
      confirmLabel="Baixar"
      onConfirm={async () => {
        if (!de || !ate || de > ate) throw new Error("Período inválido");
        const total = await gerarRelatorioEncomendas(encomendas, de, ate);
        toast.success(`Relatório gerado com ${total} encomenda(s)`);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="De" htmlFor="rel-de">
          <Input
            id="rel-de"
            type="date"
            value={de}
            max={ate}
            onChange={(e) => setDe(e.target.value)}
          />
        </Field>
        <Field label="Até" htmlFor="rel-ate">
          <Input
            id="rel-ate"
            type="date"
            value={ate}
            min={de}
            onChange={(e) => setAte(e.target.value)}
          />
        </Field>
      </div>
    </AsyncConfirmDialog>
  );
}

/** Par rótulo/valor da ficha da encomenda. */
function Info({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

/** Portaria pede o código de 5 dígitos e registra o nome de quem informou. */
function LiberarRetirada({
  encomenda,
  onLiberar,
}: {
  encomenda: Encomenda;
  onLiberar: (dados: {
    codigo: string;
    retiradoPor: string;
  }) => Promise<unknown>;
}) {
  const [codigo, setCodigo] = useState("");
  const [retiradoPor, setRetiradoPor] = useState("");

  return (
    <AsyncConfirmDialog
      trigger={<Button size="sm">Liberar retirada</Button>}
      title={`Liberar "${encomenda.descricao}"`}
      description={`Unidade ${encomenda.unidadeLabel}. Peça o código de 5 dígitos que o morador recebeu no app.`}
      confirmLabel="Liberar"
      successMessage="Retirada registrada"
      onConfirm={async () => {
        if (!/^\d{5}$/.test(codigo)) throw new Error("O código tem 5 dígitos");
        if (!retiradoPor.trim())
          throw new Error("Informe o nome de quem está retirando");
        await onLiberar({ codigo, retiradoPor });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Código" htmlFor={`cod-${encomenda.id}`}>
          <Input
            id={`cod-${encomenda.id}`}
            inputMode="numeric"
            autoComplete="off"
            maxLength={5}
            className="font-mono tracking-widest"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
          />
        </Field>
        <Field label="Nome de quem retira" htmlFor={`ret-${encomenda.id}`}>
          <Input
            id={`ret-${encomenda.id}`}
            value={retiradoPor}
            onChange={(e) => setRetiradoPor(e.target.value)}
          />
        </Field>
      </div>
      {encomenda.autorizados.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs text-muted-foreground">
            Nomes autorizados pelo morador (referência):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {encomenda.autorizados.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setRetiradoPor(a.nome)}
                className="rounded-full border border-input bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {a.nome}
              </button>
            ))}
          </div>
        </div>
      )}
    </AsyncConfirmDialog>
  );
}

/** A foto exige o token, então é baixada via fetch e exibida como blob URL. */
function VerFoto({ carregar }: { carregar: () => Promise<string> }) {
  const [aberto, setAberto] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    let atual: string | null = null;
    carregar()
      .then((u) => setUrl((atual = u)))
      .catch((err) =>
        toast.error(
          err instanceof Error ? err.message : "Erro ao carregar a foto",
        ),
      );
    return () => {
      if (atual) URL.revokeObjectURL(atual);
      setUrl(null);
    };
  }, [aberto]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ImageIcon className="h-4 w-4" /> Foto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Foto da encomenda</DialogTitle>
        </DialogHeader>
        {url ? (
          <img
            src={url}
            alt="Encomenda"
            className="aspect-square w-full rounded-md bg-muted object-contain"
          />
        ) : (
          <div className="grid aspect-square w-full place-items-center rounded-md bg-muted">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
