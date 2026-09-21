import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useChamados } from '@/hooks/useChamados';
import { PageHeader } from '@/components/shared/PageHeader';
import { Field } from '@/components/shared/Field';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const CATEGORIAS = [
  ['geral', 'Geral'],
  ['eletrica', 'Elétrica'],
  ['hidraulica', 'Hidráulica'],
  ['limpeza', 'Limpeza'],
  ['seguranca', 'Segurança'],
  ['elevador', 'Elevador'],
  ['area_comum', 'Área comum']
];

const PRIORIDADES = [
  ['baixa', 'Baixa'],
  ['media', 'Média'],
  ['alta', 'Alta']
];

const selectCls =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function NovoChamado() {
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    categoria: 'geral',
    prioridade: 'media'
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { criar } = useChamados();

  function set(campo: string, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await criar(form);
      toast.success('Chamado aberto');
      navigate('/chamados');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao abrir chamado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Novo chamado" backTo="/chamados" />
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Título" htmlFor="titulo">
              <Input id="titulo" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} required />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Categoria" htmlFor="categoria">
                <select
                  id="categoria"
                  className={selectCls}
                  value={form.categoria}
                  onChange={(e) => set('categoria', e.target.value)}
                >
                  {CATEGORIAS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Prioridade" htmlFor="prioridade">
                <select
                  id="prioridade"
                  className={selectCls}
                  value={form.prioridade}
                  onChange={(e) => set('prioridade', e.target.value)}
                >
                  {PRIORIDADES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Descrição" htmlFor="descricao">
              <Textarea
                id="descricao"
                rows={5}
                value={form.descricao}
                onChange={(e) => set('descricao', e.target.value)}
                required
              />
            </Field>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/chamados')}>
                Cancelar
              </Button>
              <Button type="submit" variant="brand" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Abrir chamado
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
