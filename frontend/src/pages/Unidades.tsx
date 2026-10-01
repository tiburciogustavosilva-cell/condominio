import { useRef, useState } from 'react';
import { Building2, Download, Loader2, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useUnidades } from '@/hooks/useUnidades';
import { useAuth } from '@/hooks/useAuth';
import { baixarModeloUnidades, lerModeloUnidades } from '@/lib/importarUnidades';
import type { Unidade } from '@/types/condominio';
import { FormModal } from '@/components/shared/FormModal';
import { PageHeader } from '@/components/shared/PageHeader';
import { FilterPills } from '@/components/shared/FilterPills';
import { MapaCondominio } from '@/components/unidades/MapaCondominio';
import { EmptyState } from '@/components/shared/EmptyState';
import { Field } from '@/components/shared/Field';
import { AsyncConfirmDialog } from '@/components/shared/AsyncConfirmDialog';
import { ResultadoImportacao } from '@/components/shared/ResultadoImportacao';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ListSkeleton } from '@/components/shared/ListSkeleton';
import { BuscaInput, bate } from '@/components/shared/BuscaInput';
import { rotuloUnidade } from '@/lib/format';

const VAZIO = { numero: '', bloco: '', tipo: 'apartamento', fracaoIdeal: '', pesoVoto: '1' };
const selectCls =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function Unidades() {
  const { unidades, carregando, recarregar, criar, atualizar, remover } = useUnidades();
  const { condominio } = useAuth();
  const [form, setForm] = useState<any>(VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<{ sucesso: number; erros: { erro: string }[] } | null>(null);
  const [busca, setBusca] = useState('');
  const [vista, setVista] = useState('mapa');
  const arquivoRef = useRef<HTMLInputElement>(null);

  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo || !condominio) return;
    setImportando(true);
    setResultado(null);
    try {
      const { unidades: linhas, erros } = await lerModeloUnidades(arquivo, condominio);
      let sucesso = 0;
      for (const linha of linhas) {
        try {
          await criar(linha);
          sucesso++;
        } catch (err) {
          erros.push({
            erro: `${linha.bloco ? linha.bloco + ' ' : ''}${linha.numero}: ${err instanceof Error ? err.message : 'erro ao cadastrar'}`
          });
        }
      }
      setResultado({ sucesso, erros });
      recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível ler a planilha');
    } finally {
      setImportando(false);
    }
  }

  function set(campo: string, valor: string) {
    setForm((f: any) => ({ ...f, [campo]: valor }));
  }

  function editar(u: Unidade) {
    setEditandoId(u.id);
    setForm({ numero: u.numero, bloco: u.bloco, tipo: u.tipo, fracaoIdeal: u.fracaoIdeal ?? '', pesoVoto: u.pesoVoto ?? 1 });
    setAberto(true);
  }

  function cancelarEdicao() {
    setAberto(false);
    setEditandoId(null);
    setForm(VAZIO);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (editandoId) {
        await atualizar(editandoId, form);
        toast.success('Unidade atualizada');
      } else {
        await criar(form);
        toast.success('Unidade cadastrada');
      }
      cancelarEdicao();
      recarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unidades"
        description="Apartamentos, lojas e demais unidades do condomínio."
        actions={
          condominio && (
            <>
              <Button variant="outline" size="sm" onClick={() => baixarModeloUnidades(condominio)}>
                <Download className="h-4 w-4" /> Baixar modelo
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={importando}
                onClick={() => arquivoRef.current?.click()}
              >
                {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Importar planilha
              </Button>
              <input
                ref={arquivoRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleArquivo}
              />
              <Button variant="brand" size="sm" onClick={() => setAberto(true)}>
                <Plus className="h-4 w-4" /> Nova unidade
              </Button>
            </>
          )
        }
      >
        {unidades.length > 0 && (
          <FilterPills
            options={[
              { value: 'mapa', label: 'Mapa' },
              { value: 'lista', label: 'Lista' }
            ]}
            value={vista}
            onChange={setVista}
          />
        )}
        {unidades.length > 0 && vista === 'lista' && (
          <BuscaInput value={busca} onChange={setBusca} placeholder="Buscar bloco, número ou morador…" />
        )}
      </PageHeader>

      {resultado && (
        <ResultadoImportacao sucesso={resultado.sucesso} erros={resultado.erros} onFechar={() => setResultado(null)} />
      )}

      <FormModal
        aberto={aberto}
        titulo={editandoId ? 'Editar unidade' : 'Nova unidade'}
        onFechar={cancelarEdicao}
        salvando={loading}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Número / identificação" htmlFor="numero">
              <Input id="numero" value={form.numero} onChange={(e) => set('numero', e.target.value)} required />
            </Field>
            <Field label="Bloco" htmlFor="bloco">
              <Input id="bloco" value={form.bloco} onChange={(e) => set('bloco', e.target.value)} />
            </Field>
            <Field label="Tipo" htmlFor="tipo">
              <select
                id="tipo"
                className={selectCls}
                value={form.tipo}
                onChange={(e) => set('tipo', e.target.value)}
              >
                <option value="apartamento">Apartamento</option>
                <option value="casa">Casa</option>
                <option value="comercial">Comercial</option>
                <option value="garagem">Garagem</option>
              </select>
            </Field>
            <Field label="Fração ideal (%)" htmlFor="fracao">
              <Input
                id="fracao"
                type="number"
                step="0.01"
                min="0"
                value={form.fracaoIdeal}
                onChange={(e) => set('fracaoIdeal', e.target.value)}
              />
            </Field>
            <Field
              label="Peso do voto"
              htmlFor="pesoVoto"
              hint="Padrão 1 = um voto normal. Pode usar outro número inteiro (2, 3…) ou fração (ex.: 1.5) se essa unidade tiver peso diferente na assembleia."
            >
              <Input
                id="pesoVoto"
                type="number"
                step="0.01"
                min="0.01"
                value={form.pesoVoto}
                onChange={(e) => set('pesoVoto', e.target.value)}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={cancelarEdicao}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {editandoId ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </FormModal>

      {carregando ? (
        <ListSkeleton />
      ) : unidades.length === 0 ? (
        <EmptyState icon={Building2} title="Nenhuma unidade cadastrada" />
      ) : vista === 'mapa' ? (
        <MapaCondominio unidades={unidades} onEditar={editar} />
      ) : (
        <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {unidades
            .filter((u) => bate(busca, u.bloco, u.numero, rotuloUnidade(u), ...(u.moradores ?? [])))
            .map((u) => (
            <Card key={u.id}>
              <CardContent className="space-y-2 pt-5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{rotuloUnidade(u)}</p>
                  <Badge variant="outline" className="capitalize">
                    {u.tipo}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Fração ideal: {u.fracaoIdeal ? `${u.fracaoIdeal}%` : '—'}
                </p>
                {u.pesoVoto !== 1 && (
                  <p className="text-xs text-muted-foreground">Peso do voto: {u.pesoVoto}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Moradores: {u.moradores?.length ? u.moradores.join(', ') : '—'}
                </p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => editar(u)}>
                    Editar
                  </Button>
                  <AsyncConfirmDialog
                    trigger={
                      <Button size="sm" variant="ghost">
                        Remover
                      </Button>
                    }
                    title={`Remover unidade ${rotuloUnidade(u)}?`}
                    confirmLabel="Remover"
                    confirmVariant="destructive"
                    successMessage="Unidade removida"
                    onConfirm={() => remover(u.id).then(recarregar)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        </div>
      )}
    </div>
  );
}
