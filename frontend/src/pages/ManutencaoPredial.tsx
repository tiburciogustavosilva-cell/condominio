import { useState } from 'react';
import {
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Download,
  Gauge,
  Loader2,
  Mail,
  Wallet
} from 'lucide-react';
import { toast } from 'sonner';
import { useAtivos } from '@/hooks/useAtivos';
import { useManutencoes, usePrestadores } from '@/hooks/usePrestadores';
import { useOrdensServico } from '@/hooks/useOrdensServico';
import { dataCurta, frequenciaTexto, prazoTexto } from '@/lib/format';
import { gerarRelatorioXlsx } from '@/lib/exportarRelatorio';
import { LABEL } from '@/types/condominio';
import type { Ativo, Manutencao, OrdemServico } from '@/types/condominio';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Field } from '@/components/shared/Field';
import { DatePicker } from '@/components/shared/DatePicker';
import { StatusBadge, PrioridadeBadge } from '@/components/shared/StatusBadge';
import { AsyncConfirmDialog } from '@/components/shared/AsyncConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const selectCls =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function moeda(v: number | null | undefined) {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const ATIVO_VAZIO = {
  codigo: '',
  nome: '',
  categoria: 'outros',
  localizacao: '',
  fabricanteModelo: '',
  numeroSerie: '',
  dataInstalacao: '',
  vidaUtilAnos: '',
  responsavel: '',
  observacoes: ''
};

const PLANO_VAZIO = {
  prestadorId: '',
  ativoId: '',
  titulo: '',
  descricao: '',
  ultimaManutencao: '',
  frequenciaUnidade: 'mensal',
  frequenciaIntervalo: '1',
  diasAntecedencia: '7',
  tipo: 'preventiva',
  prioridade: 'media',
  statusManual: 'programada',
  custoPrevisto: '',
  numeroOs: ''
};

const OS_VAZIA = {
  numeroOs: '',
  dataAbertura: new Date().toISOString().slice(0, 10),
  dataExecucao: '',
  ativoId: '',
  tipo: 'corretiva',
  descricao: '',
  diagnostico: '',
  acaoExecutada: '',
  responsavel: '',
  prioridade: 'media',
  status: 'programada',
  custoMaterial: '',
  custoMaoDeObra: '',
  observacoes: ''
};

export default function ManutencaoPredial() {
  const { ativos, recarregar: recarregarAtivos, criar: criarAtivo, atualizar: atualizarAtivo, remover: removerAtivo } = useAtivos();
  const {
    manutencoes,
    recarregar: recarregarPlanos,
    criar: criarPlano,
    atualizar: atualizarPlano,
    concluir: concluirPlano,
    notificar: notificarPlano,
    remover: removerPlano
  } = useManutencoes();
  const { prestadores } = usePrestadores();
  const {
    ordens,
    recarregar: recarregarOrdens,
    criar: criarOrdem,
    atualizar: atualizarOrdem,
    remover: removerOrdem
  } = useOrdensServico();

  const [gerando, setGerando] = useState(false);

  async function baixarRelatorio() {
    setGerando(true);
    try {
      await gerarRelatorioXlsx({ ativos, manutencoes, ordens });
      toast.success('Relatório gerado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar relatório');
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manutenção Predial"
        description="Cadastro de equipamentos/áreas, plano de manutenção e registro de serviços — mesmo modelo da planilha de controle predial."
        actions={
          <Button variant="brand" onClick={baixarRelatorio} disabled={gerando}>
            {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Baixar relatório (.xlsx)
          </Button>
        }
      />

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="ativos">Cadastro</TabsTrigger>
          <TabsTrigger value="plano">Plano de Manutenção</TabsTrigger>
          <TabsTrigger value="ordens">Registro de Serviços</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <PainelDashboard ativos={ativos} manutencoes={manutencoes} ordens={ordens} />
        </TabsContent>

        <TabsContent value="ativos">
          <AbaAtivos
            ativos={ativos}
            criar={criarAtivo}
            atualizar={atualizarAtivo}
            remover={removerAtivo}
            recarregar={recarregarAtivos}
          />
        </TabsContent>

        <TabsContent value="plano">
          <AbaPlano
            manutencoes={manutencoes}
            ativos={ativos}
            prestadores={prestadores}
            criar={criarPlano}
            atualizar={atualizarPlano}
            concluir={concluirPlano}
            notificar={notificarPlano}
            remover={removerPlano}
            recarregar={recarregarPlanos}
          />
        </TabsContent>

        <TabsContent value="ordens">
          <AbaOrdens
            ordens={ordens}
            ativos={ativos}
            criar={criarOrdem}
            atualizar={atualizarOrdem}
            remover={removerOrdem}
            recarregar={recarregarOrdens}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ==================================================================== */
/*  Dashboard                                                            */
/* ==================================================================== */
function PainelDashboard({
  ativos,
  manutencoes,
  ordens
}: {
  ativos: Ativo[];
  manutencoes: Manutencao[];
  ordens: OrdemServico[];
}) {
  const vencidas = manutencoes.filter((m) => m.status === 'vencida').length;
  const vencem30 = manutencoes.filter((m) => (m.diasParaProxima ?? 999) >= 0 && (m.diasParaProxima ?? 999) <= 30).length;
  const custoPrevisto = manutencoes.reduce((s, m) => s + (m.custoPrevisto ?? 0), 0);
  const custoRealizado = ordens.reduce((s, o) => s + o.custoTotal, 0);
  const porTipo = (tipo: string) => manutencoes.filter((m) => m.tipo === tipo).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard index={0} label="Equipamentos / áreas cadastrados" value={ativos.length} icon={Boxes} tone="secondary" />
        <StatCard index={1} label="Manutenções planejadas" value={manutencoes.length} icon={CalendarClock} tone="info" />
        <StatCard index={2} label="Ordens de serviço" value={ordens.length} icon={ClipboardList} tone="secondary" />
        <StatCard
          index={3}
          label="Vencidas"
          value={vencidas}
          icon={Gauge}
          tone={vencidas ? 'destructive' : 'success'}
        />
        <StatCard index={4} label="Vencem em até 30 dias" value={vencem30} icon={Gauge} tone="warning" />
        <StatCard index={5} label="Custo previsto" value={moeda(custoPrevisto)} icon={Wallet} tone="secondary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manutenções por tipo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          <div className="rounded-md bg-muted p-3 text-center">
            <p className="text-xs text-muted-foreground">Preventiva</p>
            <p className="font-heading text-2xl font-extrabold">{porTipo('preventiva')}</p>
          </div>
          <div className="rounded-md bg-muted p-3 text-center">
            <p className="text-xs text-muted-foreground">Corretiva</p>
            <p className="font-heading text-2xl font-extrabold">{porTipo('corretiva')}</p>
          </div>
          <div className="rounded-md bg-muted p-3 text-center">
            <p className="text-xs text-muted-foreground">Preditiva</p>
            <p className="font-heading text-2xl font-extrabold">{porTipo('preditiva')}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">Previsto (plano de manutenção)</p>
            <p className="font-heading text-xl font-extrabold">{moeda(custoPrevisto)}</p>
          </div>
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">Realizado (ordens de serviço)</p>
            <p className="font-heading text-xl font-extrabold">{moeda(custoRealizado)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ==================================================================== */
/*  Cadastro de ativos                                                   */
/* ==================================================================== */
function AbaAtivos({
  ativos,
  criar,
  atualizar,
  remover,
  recarregar
}: {
  ativos: Ativo[];
  criar: (d: any) => Promise<void>;
  atualizar: (id: string, d: any) => Promise<void>;
  remover: (id: string) => Promise<void>;
  recarregar: () => void;
}) {
  const [form, setForm] = useState<any>(ATIVO_VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set(campo: string, valor: string) {
    setForm((f: any) => ({ ...f, [campo]: valor }));
  }

  function editar(a: Ativo) {
    setEditandoId(a.id);
    setForm({
      codigo: a.codigo,
      nome: a.nome,
      categoria: a.categoria,
      localizacao: a.localizacao,
      fabricanteModelo: a.fabricanteModelo,
      numeroSerie: a.numeroSerie,
      dataInstalacao: a.dataInstalacao ?? '',
      vidaUtilAnos: a.vidaUtilAnos?.toString() ?? '',
      responsavel: a.responsavel,
      observacoes: a.observacoes
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelar() {
    setEditandoId(null);
    setForm(ATIVO_VAZIO);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editandoId) {
        await atualizar(editandoId, form);
        toast.success('Ativo atualizado');
      } else {
        await criar(form);
        toast.success('Ativo cadastrado');
      }
      cancelar();
      recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editandoId ? 'Editar equipamento / área' : 'Novo equipamento / área'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Código" htmlFor="a-codigo">
                <Input id="a-codigo" value={form.codigo} onChange={(e) => set('codigo', e.target.value)} required />
              </Field>
              <Field label="Equipamento / Área" htmlFor="a-nome">
                <Input id="a-nome" value={form.nome} onChange={(e) => set('nome', e.target.value)} required />
              </Field>
              <Field label="Categoria" htmlFor="a-cat">
                <select id="a-cat" className={selectCls} value={form.categoria} onChange={(e) => set('categoria', e.target.value)}>
                  {Object.entries(LABEL.categoria).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="Localização" htmlFor="a-local">
                <Input id="a-local" value={form.localizacao} onChange={(e) => set('localizacao', e.target.value)} />
              </Field>
              <Field label="Fabricante / Modelo" htmlFor="a-fab">
                <Input id="a-fab" value={form.fabricanteModelo} onChange={(e) => set('fabricanteModelo', e.target.value)} />
              </Field>
              <Field label="Nº Série / Patrimônio" htmlFor="a-serie">
                <Input id="a-serie" value={form.numeroSerie} onChange={(e) => set('numeroSerie', e.target.value)} />
              </Field>
              <Field label="Data de instalação">
                <DatePicker value={form.dataInstalacao} onChange={(v) => set('dataInstalacao', v)} />
              </Field>
              <Field label="Vida útil (anos)" htmlFor="a-vida">
                <Input id="a-vida" type="number" min={0} value={form.vidaUtilAnos} onChange={(e) => set('vidaUtilAnos', e.target.value)} />
              </Field>
              <Field label="Responsável" htmlFor="a-resp">
                <Input id="a-resp" value={form.responsavel} onChange={(e) => set('responsavel', e.target.value)} />
              </Field>
            </div>
            <Field label="Observações" htmlFor="a-obs">
              <Textarea id="a-obs" rows={2} value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} />
            </Field>
            <div className="flex justify-end gap-2">
              {editandoId && (
                <Button type="button" variant="outline" onClick={cancelar}>Cancelar</Button>
              )}
              <Button type="submit" variant="brand" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editandoId ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {ativos.length === 0 ? (
        <EmptyState icon={Boxes} title="Nenhum equipamento/área cadastrado" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {ativos.map((a) => (
            <Card key={a.id}>
              <CardContent className="space-y-1.5 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{a.nome}</p>
                  <Badge variant="outline">{a.codigo}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {LABEL.categoria[a.categoria] ?? a.categoria}
                  {a.localizacao ? ` · ${a.localizacao}` : ''}
                </p>
                {(a.fabricanteModelo || a.numeroSerie) && (
                  <p className="text-xs text-muted-foreground">
                    {[a.fabricanteModelo, a.numeroSerie].filter(Boolean).join(' · ')}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {a.dataInstalacao ? `Instalado em ${dataCurta(a.dataInstalacao)}` : 'Sem data de instalação'}
                  {a.vidaUtilAnos ? ` · vida útil ${a.vidaUtilAnos} anos` : ''}
                </p>
                {a.responsavel && <p className="text-xs text-muted-foreground">Responsável: {a.responsavel}</p>}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => editar(a)}>Editar</Button>
                  <AsyncConfirmDialog
                    trigger={<Button size="sm" variant="ghost">Remover</Button>}
                    title={`Remover ${a.nome}?`}
                    confirmLabel="Remover"
                    confirmVariant="destructive"
                    successMessage="Ativo removido"
                    onConfirm={() => remover(a.id).then(recarregar)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================================================================== */
/*  Plano de manutenção                                                  */
/* ==================================================================== */
function AbaPlano({
  manutencoes,
  ativos,
  prestadores,
  criar,
  atualizar,
  concluir,
  notificar,
  remover,
  recarregar
}: {
  manutencoes: Manutencao[];
  ativos: Ativo[];
  prestadores: { id: string; nome: string }[];
  criar: (d: any) => Promise<void>;
  atualizar: (id: string, d: any) => Promise<void>;
  concluir: (id: string, data?: string) => Promise<void>;
  notificar: (id: string) => Promise<any>;
  remover: (id: string) => Promise<void>;
  recarregar: () => void;
}) {
  const [form, setForm] = useState<any>(PLANO_VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set(campo: string, valor: string) {
    setForm((f: any) => ({ ...f, [campo]: valor }));
  }

  function editar(m: Manutencao) {
    setEditandoId(m.id);
    setForm({
      prestadorId: m.prestadorId,
      ativoId: m.ativoId ?? '',
      titulo: m.titulo,
      descricao: m.descricao,
      ultimaManutencao: m.ultimaManutencao,
      frequenciaUnidade: m.frequenciaUnidade,
      frequenciaIntervalo: String(m.frequenciaIntervalo),
      diasAntecedencia: String(m.diasAntecedencia),
      tipo: m.tipo,
      prioridade: m.prioridade,
      statusManual: m.statusManual,
      custoPrevisto: m.custoPrevisto?.toString() ?? '',
      numeroOs: m.numeroOs ?? ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelar() {
    setEditandoId(null);
    setForm(PLANO_VAZIO);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, frequenciaIntervalo: Number(form.frequenciaIntervalo), diasAntecedencia: Number(form.diasAntecedencia) };
    try {
      if (editandoId) {
        await atualizar(editandoId, payload);
        toast.success('Plano atualizado');
      } else {
        await criar(payload);
        toast.success('Plano de manutenção criado');
      }
      cancelar();
      recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {prestadores.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Cadastre um prestador primeiro" description="A aba Prestadores tem o cadastro de quem executa os serviços." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editandoId ? 'Editar plano' : 'Novo plano de manutenção'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Atividade / Serviço" htmlFor="p-titulo">
                  <Input id="p-titulo" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} required />
                </Field>
                <Field label="Equipamento / Área" htmlFor="p-ativo">
                  <select id="p-ativo" className={selectCls} value={form.ativoId} onChange={(e) => set('ativoId', e.target.value)}>
                    <option value="">Sem vínculo</option>
                    {ativos.map((a) => (
                      <option key={a.id} value={a.id}>{a.codigo} — {a.nome}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Tipo" htmlFor="p-tipo">
                  <select id="p-tipo" className={selectCls} value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
                    {Object.entries(LABEL.tipoManutencao).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Prioridade" htmlFor="p-prio">
                  <select id="p-prio" className={selectCls} value={form.prioridade} onChange={(e) => set('prioridade', e.target.value)}>
                    {Object.entries(LABEL.prioridadeManutencao).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Status" htmlFor="p-status">
                  <select id="p-status" className={selectCls} value={form.statusManual} onChange={(e) => set('statusManual', e.target.value)}>
                    {Object.entries(LABEL.statusPlano).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Responsável / Empresa" htmlFor="p-prest">
                  <select id="p-prest" className={selectCls} value={form.prestadorId} onChange={(e) => set('prestadorId', e.target.value)} required>
                    <option value="">Selecione…</option>
                    {prestadores.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Última manutenção">
                  <DatePicker value={form.ultimaManutencao} onChange={(v) => set('ultimaManutencao', v)} />
                </Field>
                <Field label="Periodicidade" htmlFor="p-freq">
                  <select id="p-freq" className={selectCls} value={form.frequenciaUnidade} onChange={(e) => set('frequenciaUnidade', e.target.value)}>
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                  </select>
                </Field>
                <Field label="A cada quantos" htmlFor="p-int" hint={frequenciaTexto(form.frequenciaUnidade, Number(form.frequenciaIntervalo))}>
                  <Input id="p-int" type="number" min={1} value={form.frequenciaIntervalo} onChange={(e) => set('frequenciaIntervalo', e.target.value)} required />
                </Field>
                <Field label="Avisar (dias de antecedência)" htmlFor="p-ant">
                  <Input id="p-ant" type="number" min={0} value={form.diasAntecedencia} onChange={(e) => set('diasAntecedencia', e.target.value)} />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Custo previsto (R$)" htmlFor="p-custo">
                  <Input id="p-custo" type="number" step="0.01" min="0" value={form.custoPrevisto} onChange={(e) => set('custoPrevisto', e.target.value)} />
                </Field>
                <Field label="Nº OS / Contrato" htmlFor="p-os">
                  <Input id="p-os" value={form.numeroOs} onChange={(e) => set('numeroOs', e.target.value)} />
                </Field>
              </div>

              <Field label="Observações" htmlFor="p-desc">
                <Textarea id="p-desc" rows={2} value={form.descricao} onChange={(e) => set('descricao', e.target.value)} />
              </Field>

              <div className="flex justify-end gap-2">
                {editandoId && <Button type="button" variant="outline" onClick={cancelar}>Cancelar</Button>}
                <Button type="submit" variant="brand" disabled={saving || !form.ultimaManutencao}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editandoId ? 'Salvar' : 'Criar plano'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {manutencoes.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Nenhum plano de manutenção cadastrado" />
      ) : (
        <div className="space-y-3">
          {manutencoes.map((m) => (
            <Card key={m.id}>
              <CardContent className="space-y-2 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{m.titulo}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{LABEL.tipoManutencao[m.tipo]}</Badge>
                    <PrioridadeBadge nivel={m.prioridade} />
                    <StatusBadge status={m.statusManual} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {m.ativoNome ? `${m.ativoNome} · ` : ''}
                  {m.prestadorNome} · {frequenciaTexto(m.frequenciaUnidade, m.frequenciaIntervalo)}
                </p>
                <p className="text-sm">
                  Última: <strong>{dataCurta(m.ultimaManutencao)}</strong> · Próxima:{' '}
                  <strong>{dataCurta(m.proximaManutencao)}</strong>{' '}
                  <span className="text-muted-foreground">({prazoTexto(m.diasParaProxima)})</span>
                  {' · '}
                  <StatusBadge status={m.status ?? 'em_dia'} />
                </p>
                {(m.custoPrevisto || m.numeroOs) && (
                  <p className="text-xs text-muted-foreground">
                    {m.custoPrevisto ? `Custo previsto: ${moeda(m.custoPrevisto)}` : ''}
                    {m.custoPrevisto && m.numeroOs ? ' · ' : ''}
                    {m.numeroOs ? `OS/Contrato: ${m.numeroOs}` : ''}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <AsyncConfirmDialog
                    trigger={
                      <Button size="sm">
                        <CheckCircle2 className="h-4 w-4" /> Registrar como feita
                      </Button>
                    }
                    title="Registrar manutenção como feita hoje?"
                    description="A data da última manutenção passa a ser hoje e o ciclo de lembretes reinicia."
                    confirmLabel="Registrar"
                    successMessage="Manutenção registrada"
                    onConfirm={() => concluir(m.id).then(recarregar)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      notificar(m.id)
                        .then((r: any) =>
                          toast.success(
                            r?.simulado ? `E-mail simulado para ${r.para}` : `E-mail enviado para ${r.para}`
                          )
                        )
                        .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Erro ao enviar'))
                    }
                  >
                    <Mail className="h-4 w-4" /> Enviar e-mail agora
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => editar(m)}>Editar</Button>
                  <AsyncConfirmDialog
                    trigger={<Button size="sm" variant="ghost">Remover</Button>}
                    title={`Remover "${m.titulo}"?`}
                    confirmLabel="Remover"
                    confirmVariant="destructive"
                    successMessage="Plano removido"
                    onConfirm={() => remover(m.id).then(recarregar)}
                  />
                </div>
                {m.historico?.length > 0 && (
                  <details className="pt-1 text-xs text-muted-foreground">
                    <summary className="cursor-pointer select-none">Histórico ({m.historico.length})</summary>
                    <ul className="mt-1 space-y-1 border-l border-border pl-3">
                      {[...m.historico]
                        .reverse()
                        .slice(0, 8)
                        .map((h, i) => (
                          <li key={i}>
                            {h.tipo === 'realizada' ? '✅ Realizada' : '✉️ Lembrete'} — {dataCurta(h.data)} · {h.detalhe}
                          </li>
                        ))}
                    </ul>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================================================================== */
/*  Registro de serviços (ordens de serviço)                             */
/* ==================================================================== */
function AbaOrdens({
  ordens,
  ativos,
  criar,
  atualizar,
  remover,
  recarregar
}: {
  ordens: OrdemServico[];
  ativos: Ativo[];
  criar: (d: any) => Promise<void>;
  atualizar: (id: string, d: any) => Promise<void>;
  remover: (id: string) => Promise<void>;
  recarregar: () => void;
}) {
  const [form, setForm] = useState<any>(OS_VAZIA);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set(campo: string, valor: string) {
    setForm((f: any) => ({ ...f, [campo]: valor }));
  }

  function editar(o: OrdemServico) {
    setEditandoId(o.id);
    setForm({
      numeroOs: o.numeroOs ?? '',
      dataAbertura: o.dataAbertura,
      dataExecucao: o.dataExecucao ?? '',
      ativoId: o.ativoId ?? '',
      tipo: o.tipo,
      descricao: o.descricao,
      diagnostico: o.diagnostico,
      acaoExecutada: o.acaoExecutada,
      responsavel: o.responsavel,
      prioridade: o.prioridade,
      status: o.status,
      custoMaterial: o.custoMaterial ? String(o.custoMaterial) : '',
      custoMaoDeObra: o.custoMaoDeObra ? String(o.custoMaoDeObra) : '',
      observacoes: o.observacoes
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelar() {
    setEditandoId(null);
    setForm(OS_VAZIA);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editandoId) {
        await atualizar(editandoId, form);
        toast.success('Ordem de serviço atualizada');
      } else {
        await criar(form);
        toast.success('Ordem de serviço registrada');
      }
      cancelar();
      recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editandoId ? 'Editar ordem de serviço' : 'Nova ordem de serviço'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Nº OS" htmlFor="o-numero">
                <Input id="o-numero" value={form.numeroOs} onChange={(e) => set('numeroOs', e.target.value)} />
              </Field>
              <Field label="Data de abertura">
                <DatePicker value={form.dataAbertura} onChange={(v) => set('dataAbertura', v)} />
              </Field>
              <Field label="Data de execução">
                <DatePicker value={form.dataExecucao} onChange={(v) => set('dataExecucao', v)} />
              </Field>
              <Field label="Equipamento / Área" htmlFor="o-ativo">
                <select id="o-ativo" className={selectCls} value={form.ativoId} onChange={(e) => set('ativoId', e.target.value)}>
                  <option value="">Sem vínculo</option>
                  {ativos.map((a) => (
                    <option key={a.id} value={a.id}>{a.codigo} — {a.nome}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Descrição da ocorrência / serviço" htmlFor="o-desc">
              <Textarea id="o-desc" rows={2} value={form.descricao} onChange={(e) => set('descricao', e.target.value)} required />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Diagnóstico / Causa" htmlFor="o-diag">
                <Textarea id="o-diag" rows={2} value={form.diagnostico} onChange={(e) => set('diagnostico', e.target.value)} />
              </Field>
              <Field label="Ação executada" htmlFor="o-acao">
                <Textarea id="o-acao" rows={2} value={form.acaoExecutada} onChange={(e) => set('acaoExecutada', e.target.value)} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Tipo" htmlFor="o-tipo">
                <select id="o-tipo" className={selectCls} value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
                  {Object.entries(LABEL.tipoManutencao).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="Prioridade" htmlFor="o-prio">
                <select id="o-prio" className={selectCls} value={form.prioridade} onChange={(e) => set('prioridade', e.target.value)}>
                  {Object.entries(LABEL.prioridadeManutencao).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status" htmlFor="o-status">
                <select id="o-status" className={selectCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {Object.entries(LABEL.statusPlano).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="Responsável / Empresa" htmlFor="o-resp">
                <Input id="o-resp" value={form.responsavel} onChange={(e) => set('responsavel', e.target.value)} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Custo material (R$)" htmlFor="o-mat">
                <Input id="o-mat" type="number" step="0.01" min="0" value={form.custoMaterial} onChange={(e) => set('custoMaterial', e.target.value)} />
              </Field>
              <Field label="Custo mão de obra (R$)" htmlFor="o-mao">
                <Input id="o-mao" type="number" step="0.01" min="0" value={form.custoMaoDeObra} onChange={(e) => set('custoMaoDeObra', e.target.value)} />
              </Field>
              <Field label="Custo total (R$)">
                <Input value={moeda(Number(form.custoMaterial || 0) + Number(form.custoMaoDeObra || 0))} disabled />
              </Field>
            </div>

            <Field label="Observações" htmlFor="o-obs">
              <Textarea id="o-obs" rows={2} value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} />
            </Field>

            <div className="flex justify-end gap-2">
              {editandoId && <Button type="button" variant="outline" onClick={cancelar}>Cancelar</Button>}
              <Button type="submit" variant="brand" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editandoId ? 'Salvar' : 'Registrar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {ordens.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nenhuma ordem de serviço registrada" />
      ) : (
        <div className="space-y-3">
          {ordens.map((o) => (
            <Card key={o.id}>
              <CardContent className="space-y-2 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {o.numeroOs ? `OS ${o.numeroOs} · ` : ''}
                    {o.descricao}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{LABEL.tipoManutencao[o.tipo]}</Badge>
                    <PrioridadeBadge nivel={o.prioridade} />
                    <StatusBadge status={o.status} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {o.ativoNome ? `${o.ativoNome} · ` : ''}
                  Aberta {dataCurta(o.dataAbertura)}
                  {o.dataExecucao ? ` · executada ${dataCurta(o.dataExecucao)}` : ''}
                  {o.responsavel ? ` · ${o.responsavel}` : ''}
                </p>
                {o.diagnostico && <p className="text-xs text-muted-foreground">Diagnóstico: {o.diagnostico}</p>}
                {o.acaoExecutada && <p className="text-xs text-muted-foreground">Ação: {o.acaoExecutada}</p>}
                <p className="text-sm font-medium">
                  Material {moeda(o.custoMaterial)} + mão de obra {moeda(o.custoMaoDeObra)} = total {moeda(o.custoTotal)}
                </p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => editar(o)}>Editar</Button>
                  <AsyncConfirmDialog
                    trigger={<Button size="sm" variant="ghost">Remover</Button>}
                    title="Remover esta ordem de serviço?"
                    confirmLabel="Remover"
                    confirmVariant="destructive"
                    successMessage="Ordem removida"
                    onConfirm={() => remover(o.id).then(recarregar)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
