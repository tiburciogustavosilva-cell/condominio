import { useState } from 'react';
import {
  HardHat,
  CalendarClock,
  Loader2,
  Mail,
  Info,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { usePrestadores, useManutencoes, usePrestadoresConfig } from '@/hooks/usePrestadores';
import { dataCurta, frequenciaTexto, prazoTexto } from '@/lib/format';
import { LABEL } from '@/types/condominio';
import type { Manutencao, Prestador } from '@/types/condominio';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Field } from '@/components/shared/Field';
import { DatePicker } from '@/components/shared/DatePicker';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { AsyncConfirmDialog } from '@/components/shared/AsyncConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const selectCls =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const PRESTADOR_VAZIO = { nome: '', email: '', servico: '', empresa: '', telefone: '', observacao: '' };
const MANUT_VAZIA = {
  prestadorId: '',
  titulo: '',
  descricao: '',
  ultimaManutencao: '',
  frequenciaUnidade: 'mensal',
  frequenciaIntervalo: '1',
  diasAntecedencia: '7'
};

export default function Prestadores() {
  const { prestadores, recarregar: recarregarPrestadores, criar: criarPrestador, atualizar: atualizarPrestador, remover: removerPrestador } =
    usePrestadores();
  const {
    manutencoes,
    recarregar: recarregarManutencoes,
    criar: criarManutencao,
    atualizar: atualizarManutencao,
    concluir,
    notificar: notificarManutencao,
    remover: removerManutencao
  } = useManutencoes();
  const { emailSimulado } = usePrestadoresConfig();

  const [formP, setFormP] = useState<any>(PRESTADOR_VAZIO);
  const [editP, setEditP] = useState<string | null>(null);
  const [formM, setFormM] = useState<any>(MANUT_VAZIA);
  const [editM, setEditM] = useState<string | null>(null);
  const [savingP, setSavingP] = useState(false);
  const [savingM, setSavingM] = useState(false);

  /* -------------------- prestadores -------------------- */
  function setP(campo: string, valor: string) {
    setFormP((f: any) => ({ ...f, [campo]: valor }));
  }
  function editarPrestador(p: Prestador) {
    setEditP(p.id);
    setFormP({
      nome: p.nome,
      email: p.email,
      servico: p.servico || '',
      empresa: p.empresa || '',
      telefone: p.telefone || '',
      observacao: p.observacao || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function cancelarPrestador() {
    setEditP(null);
    setFormP(PRESTADOR_VAZIO);
  }
  async function salvarPrestador(e: React.FormEvent) {
    e.preventDefault();
    setSavingP(true);
    try {
      if (editP) {
        await atualizarPrestador(editP, formP);
        toast.success('Prestador atualizado');
      } else {
        await criarPrestador(formP);
        toast.success('Prestador cadastrado');
      }
      cancelarPrestador();
      recarregarPrestadores();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSavingP(false);
    }
  }

  /* -------------------- manutenções -------------------- */
  function setM(campo: string, valor: string) {
    setFormM((f: any) => ({ ...f, [campo]: valor }));
  }
  function editarManutencao(m: Manutencao) {
    setEditM(m.id);
    setFormM({
      prestadorId: String(m.prestadorId),
      titulo: m.titulo,
      descricao: m.descricao || '',
      ultimaManutencao: m.ultimaManutencao,
      frequenciaUnidade: m.frequenciaUnidade,
      frequenciaIntervalo: String(m.frequenciaIntervalo),
      diasAntecedencia: String(m.diasAntecedencia)
    });
    document.getElementById('form-manutencao')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function cancelarManutencao() {
    setEditM(null);
    setFormM(MANUT_VAZIA);
  }
  async function salvarManutencao(e: React.FormEvent) {
    e.preventDefault();
    setSavingM(true);
    const payload = {
      ...formM,
      frequenciaIntervalo: Number(formM.frequenciaIntervalo),
      diasAntecedencia: Number(formM.diasAntecedencia)
    };
    try {
      if (editM) {
        await atualizarManutencao(editM, payload);
        toast.success('Manutenção atualizada');
      } else {
        await criarManutencao(payload);
        toast.success('Manutenção agendada');
      }
      cancelarManutencao();
      recarregarManutencoes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSavingM(false);
    }
  }

  async function notificar(id: string) {
    try {
      const r: any = await notificarManutencao(id);
      toast.success(
        r?.simulado
          ? `E-mail simulado para ${r.para} (veja o log do backend)`
          : `E-mail enviado para ${r.para}`
      );
      recarregarManutencoes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar');
    }
  }

  async function alternarAtivo(m: Manutencao) {
    try {
      await atualizarManutencao(m.id, { ativo: !m.ativo });
      recarregarManutencoes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prestadores de serviços"
        description="Cadastre os prestadores e a agenda de manutenções recorrentes. O sistema envia um e-mail ao prestador quando a manutenção se aproxima do prazo."
      />

      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-3 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-muted-foreground">
          Cadastro de prestadores e agenda de manutenções já funcionam direto no banco. O envio
          automático de e-mail (quando a manutenção se aproxima do prazo) depende de uma Edge
          Function agendada que ainda não foi implantada —{' '}
          {emailSimulado && (
            <>
              veja <code>docs/SUPABASE_MIGRATION.md</code> (módulo 5) para os próximos passos.
            </>
          )}
        </p>
      </div>

      {/* ============ PRESTADORES ============ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardHat className="h-4 w-4" /> {editP ? 'Editar prestador' : 'Novo prestador'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={salvarPrestador} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome / contato" htmlFor="p-nome">
                <Input id="p-nome" value={formP.nome} onChange={(e) => setP('nome', e.target.value)} required />
              </Field>
              <Field label="E-mail (recebe os lembretes)" htmlFor="p-email">
                <Input
                  id="p-email"
                  type="email"
                  value={formP.email}
                  onChange={(e) => setP('email', e.target.value)}
                  required
                />
              </Field>
              <Field label="Serviço" htmlFor="p-servico">
                <Input
                  id="p-servico"
                  placeholder="Ex.: Extintores, Elevadores, Dedetização…"
                  value={formP.servico}
                  onChange={(e) => setP('servico', e.target.value)}
                />
              </Field>
              <Field label="Empresa" htmlFor="p-empresa">
                <Input id="p-empresa" value={formP.empresa} onChange={(e) => setP('empresa', e.target.value)} />
              </Field>
              <Field label="Telefone" htmlFor="p-tel">
                <Input id="p-tel" value={formP.telefone} onChange={(e) => setP('telefone', e.target.value)} />
              </Field>
              <Field label="Observação" htmlFor="p-obs">
                <Input id="p-obs" value={formP.observacao} onChange={(e) => setP('observacao', e.target.value)} />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              {editP && (
                <Button type="button" variant="outline" onClick={cancelarPrestador}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" variant="brand" disabled={savingP}>
                {savingP && <Loader2 className="h-4 w-4 animate-spin" />}
                {editP ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {prestadores.length === 0 ? (
        <EmptyState icon={HardHat} title="Nenhum prestador cadastrado" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {prestadores.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-1.5 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{p.nome}</p>
                  <Badge variant="muted">{p.manutencoes} manut.</Badge>
                </div>
                {(p.servico || p.empresa) && (
                  <p className="text-sm text-muted-foreground">
                    {[p.servico, p.empresa].filter(Boolean).join(' · ')}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {p.email}
                  {p.telefone ? ` · ${p.telefone}` : ''}
                </p>
                {p.observacao && <p className="text-xs text-muted-foreground">{p.observacao}</p>}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => editarPrestador(p)}>
                    Editar
                  </Button>
                  <AsyncConfirmDialog
                    trigger={
                      <Button size="sm" variant="ghost">
                        Remover
                      </Button>
                    }
                    title={`Remover ${p.nome}?`}
                    description="As manutenções vinculadas a este prestador também serão removidas."
                    confirmLabel="Remover"
                    confirmVariant="destructive"
                    successMessage="Prestador removido"
                    onConfirm={() => removerPrestador(p.id).then(() => { recarregarPrestadores(); recarregarManutencoes(); })}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ============ AGENDA DE MANUTENÇÕES ============ */}
      <Card id="form-manutencao">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4" /> {editM ? 'Editar manutenção' : 'Nova manutenção recorrente'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {prestadores.length === 0 ? (
            <p className="text-sm text-muted-foreground">Cadastre um prestador primeiro.</p>
          ) : (
            <form onSubmit={salvarManutencao} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Prestador responsável" htmlFor="m-prest">
                  <select
                    id="m-prest"
                    className={selectCls}
                    value={formM.prestadorId}
                    onChange={(e) => setM('prestadorId', e.target.value)}
                    required
                  >
                    <option value="">Selecione…</option>
                    {prestadores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} {p.servico ? `— ${p.servico}` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Título da manutenção" htmlFor="m-titulo">
                  <Input
                    id="m-titulo"
                    placeholder="Ex.: Recarga dos extintores"
                    value={formM.titulo}
                    onChange={(e) => setM('titulo', e.target.value)}
                    required
                  />
                </Field>
              </div>

              <Field label="Detalhes / instruções" htmlFor="m-desc">
                <Textarea
                  id="m-desc"
                  rows={2}
                  value={formM.descricao}
                  onChange={(e) => setM('descricao', e.target.value)}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Última manutenção feita" hint="ponto de partida do cálculo">
                  <DatePicker
                    value={formM.ultimaManutencao}
                    onChange={(v) => setM('ultimaManutencao', v)}
                  />
                </Field>
                <Field label="Periodicidade" htmlFor="m-uni">
                  <select
                    id="m-uni"
                    className={selectCls}
                    value={formM.frequenciaUnidade}
                    onChange={(e) => setM('frequenciaUnidade', e.target.value)}
                  >
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                  </select>
                </Field>
                <Field
                  label="A cada quantos"
                  htmlFor="m-int"
                  hint={frequenciaTexto(formM.frequenciaUnidade, Number(formM.frequenciaIntervalo))}
                >
                  <Input
                    id="m-int"
                    type="number"
                    min={1}
                    value={formM.frequenciaIntervalo}
                    onChange={(e) => setM('frequenciaIntervalo', e.target.value)}
                    required
                  />
                </Field>
                <Field label="Avisar com (dias de antecedência)" htmlFor="m-ant">
                  <Input
                    id="m-ant"
                    type="number"
                    min={0}
                    value={formM.diasAntecedencia}
                    onChange={(e) => setM('diasAntecedencia', e.target.value)}
                  />
                </Field>
              </div>

              <div className="flex justify-end gap-2">
                {editM && (
                  <Button type="button" variant="outline" onClick={cancelarManutencao}>
                    Cancelar
                  </Button>
                )}
                <Button type="submit" variant="brand" disabled={savingM || !formM.ultimaManutencao}>
                  {savingM && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editM ? 'Salvar' : 'Agendar'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Agenda</h3>
        {manutencoes.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Nenhuma manutenção agendada" />
        ) : (
          manutencoes.map((m) => (
            <Card key={m.id} className={m.ativo ? '' : 'opacity-60'}>
              <CardContent className="space-y-2 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{m.titulo}</p>
                  <div className="flex items-center gap-2">
                    {!m.ativo && <Badge variant="muted">Pausada</Badge>}
                    <StatusBadge status={m.status ?? 'em_dia'} />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {m.prestadorNome}
                  {m.prestadorEmail ? ` · ${m.prestadorEmail}` : ''}
                </p>
                {m.descricao && <p className="text-sm text-muted-foreground">{m.descricao}</p>}

                <p className="text-xs text-muted-foreground">
                  {frequenciaTexto(m.frequenciaUnidade, m.frequenciaIntervalo)} · avisa{' '}
                  {m.diasAntecedencia} dia(s) antes
                </p>
                <p className="text-sm">
                  Última: <strong>{dataCurta(m.ultimaManutencao)}</strong> · Próxima:{' '}
                  <strong>{dataCurta(m.proximaManutencao)}</strong>{' '}
                  <span className="text-muted-foreground">({prazoTexto(m.diasParaProxima)})</span>
                </p>

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
                    onConfirm={() => concluir(m.id).then(recarregarManutencoes)}
                  />
                  <Button size="sm" variant="outline" onClick={() => notificar(m.id)}>
                    <Mail className="h-4 w-4" /> Enviar e-mail agora
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => editarManutencao(m)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => alternarAtivo(m)}>
                    {m.ativo ? 'Pausar' : 'Reativar'}
                  </Button>
                  <AsyncConfirmDialog
                    trigger={
                      <Button size="sm" variant="ghost">
                        Remover
                      </Button>
                    }
                    title={`Remover "${m.titulo}"?`}
                    confirmLabel="Remover"
                    confirmVariant="destructive"
                    successMessage="Manutenção removida"
                    onConfirm={() => removerManutencao(m.id).then(recarregarManutencoes)}
                  />
                </div>

                {m.historico?.length > 0 && (
                  <details className="pt-1 text-xs text-muted-foreground">
                    <summary className="cursor-pointer select-none">
                      Histórico ({m.historico.length})
                    </summary>
                    <ul className="mt-1 space-y-1 border-l border-border pl-3">
                      {[...m.historico]
                        .reverse()
                        .slice(0, 8)
                        .map((h, i) => (
                          <li key={i}>
                            {h.tipo === 'realizada' ? '✅ Realizada' : '✉️ Lembrete'} —{' '}
                            {dataCurta(h.data)} · {h.detalhe}
                          </li>
                        ))}
                    </ul>
                  </details>
                )}
              </CardContent>
            </Card>
          ))
        )}
        <p className="text-xs text-muted-foreground">
          Legenda: <StatusBadge status="em_dia" /> ainda no prazo ·{' '}
          <StatusBadge status="proxima" /> dentro da antecedência ·{' '}
          <StatusBadge status="vencida" /> passou da data.{' '}
          <span className="align-middle">
            Frequências: {Object.values(LABEL.frequencia).join(', ')}.
          </span>
        </p>
      </div>
    </div>
  );
}
