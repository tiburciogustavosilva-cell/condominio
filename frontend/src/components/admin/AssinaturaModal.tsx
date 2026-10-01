import { useEffect, useState } from 'react';
import { addMonths, format } from 'date-fns';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { dataCurta, moeda } from '@/lib/format';
import { Field } from '@/components/shared/Field';
import { FormModal } from '@/components/shared/FormModal';
import { DatePicker } from '@/components/shared/DatePicker';
import { AsyncConfirmDialog } from '@/components/shared/AsyncConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export type Pagamento = { id: string; valor: number; pagoEm: string; validoAte: string };

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const umMesDepois = (dia: string) => iso(addMonths(new Date(dia + 'T00:00:00'), 1));

type Props = {
  condominio: { id: string; nome: string } | null;
  onFechar: () => void;
  /** Pagamento registrado/excluído — a lista do admin recarrega a assinatura vigente. */
  onMudou: () => void;
};

/** Mensalidade do condomínio: registra pagamento (valor, pago em, válido até) e mostra o histórico. */
export function AssinaturaModal({ condominio, onFechar, onMudou }: Props) {
  const [pagamentos, setPagamentos] = useState<Pagamento[] | null>(null);
  const [valor, setValor] = useState('');
  const [pagoEm, setPagoEm] = useState(iso(new Date()));
  const [validoAte, setValidoAte] = useState(umMesDepois(iso(new Date())));
  const [salvando, setSalvando] = useState(false);

  async function carregar(id: string) {
    const lista = await api.get<Pagamento[]>(`/admin/condominios/${id}/pagamentos`);
    setPagamentos(lista);
    return lista;
  }

  useEffect(() => {
    if (!condominio) return;
    setPagamentos(null);
    const hoje = iso(new Date());
    setPagoEm(hoje);
    setValidoAte(umMesDepois(hoje));
    carregar(condominio.id)
      .then((lista) => setValor(lista[0] ? String(lista[0].valor) : '')) // repete o último valor
      .catch((e) => toast.error(e.message));
  }, [condominio]);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!condominio) return;
    setSalvando(true);
    try {
      await api.post(`/admin/condominios/${condominio.id}/pagamentos`, { valor: Number(valor), pagoEm, validoAte });
      toast.success('Pagamento registrado');
      await carregar(condominio.id);
      onMudou();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar pagamento');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(p: Pagamento) {
    await api.delete(`/admin/pagamentos/${p.id}`);
    await carregar(condominio!.id);
    onMudou();
  }

  return (
    <FormModal
      aberto={!!condominio}
      titulo={`Assinatura · ${condominio?.nome ?? ''}`}
      onFechar={onFechar}
      salvando={salvando}
    >
      <form onSubmit={handleSalvar} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Valor (R$)" htmlFor="valor" className="sm:col-span-2">
            <Input
              id="valor"
              type="number"
              min="0.01"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
            />
          </Field>
          <Field label="Pago em" htmlFor="pagoEm">
            <DatePicker
              id="pagoEm"
              value={pagoEm}
              onChange={(v) => {
                setPagoEm(v);
                setValidoAte(umMesDepois(v));
              }}
            />
          </Field>
          <Field label="Válido até" htmlFor="validoAte">
            <DatePicker id="validoAte" value={validoAte} onChange={setValidoAte} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="brand" disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            Registrar pagamento
          </Button>
        </div>
      </form>

      <div className="space-y-2 border-t pt-4">
        <p className="text-sm font-semibold">Histórico</p>
        {!pagamentos ? (
          <Skeleton className="h-12" />
        ) : pagamentos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
        ) : (
          pagamentos.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{moeda(p.valor)}</p>
                <p className="text-xs text-muted-foreground">
                  Pago em {dataCurta(p.pagoEm)} · válido até {dataCurta(p.validoAte)}
                </p>
              </div>
              <AsyncConfirmDialog
                trigger={
                  <Button size="icon" variant="ghost" aria-label="Excluir pagamento">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
                title="Excluir pagamento?"
                description={`${moeda(p.valor)} pago em ${dataCurta(p.pagoEm)}. Use só para corrigir um lançamento errado.`}
                confirmLabel="Excluir"
                confirmVariant="destructive"
                successMessage="Pagamento excluído"
                onConfirm={() => excluir(p)}
              />
            </div>
          ))
        )}
      </div>
    </FormModal>
  );
}
