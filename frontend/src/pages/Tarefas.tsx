import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { Tarefa } from '@/types/condominio';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { FilterPills } from '@/components/shared/FilterPills';
import { TarefasDoDia } from '@/components/tarefas/TarefasDoDia';
import { CadastroTarefas } from '@/components/tarefas/CadastroTarefas';
import { HistoricoTarefas } from '@/components/tarefas/HistoricoTarefas';
import { TarefasPerdidas } from '@/components/tarefas/TarefasPerdidas';
import { FormTarefa } from '@/components/tarefas/FormTarefa';

const ABAS = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'cadastro', label: 'Tarefas' },
  { value: 'historico', label: 'Histórico' },
  { value: 'perdidas', label: 'Não feitas' }
];

/** Funcionário: só as tarefas de hoje do cargo dele. Síndico: acompanha, cadastra e vê o histórico. */
export default function Tarefas() {
  const { isSindico } = useAuth();
  const [aba, setAba] = useState('hoje');
  const [form, setForm] = useState<{ aberto: boolean; tarefa: Tarefa | null }>({ aberto: false, tarefa: null });
  // muda a cada save → remonta a aba aberta, que recarrega os dados
  const [versao, setVersao] = useState(0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarefas"
        description={
          isSindico
            ? 'Rotina dos funcionários por cargo, com foto de cada serviço feito.'
            : 'O que precisa ser feito hoje. Marque como feita e tire foto do serviço.'
        }
        actions={
          isSindico && (
            <Button variant="brand" onClick={() => setForm({ aberto: true, tarefa: null })}>
              <Plus className="h-4 w-4" /> Nova tarefa
            </Button>
          )
        }
      />
      {isSindico && (
        <FormTarefa
          aberto={form.aberto}
          tarefa={form.tarefa}
          onFechar={() => setForm((f) => ({ ...f, aberto: false }))}
          onSalvo={() => setVersao((v) => v + 1)}
        />
      )}
      {isSindico && <FilterPills options={ABAS} value={aba} onChange={setAba} />}
      {!isSindico || aba === 'hoje' ? (
        <TarefasDoDia key={versao} />
      ) : aba === 'cadastro' ? (
        <CadastroTarefas key={versao} onEditar={(tarefa) => setForm({ aberto: true, tarefa })} />
      ) : aba === 'historico' ? (
        <HistoricoTarefas key={versao} />
      ) : (
        <TarefasPerdidas key={versao} />
      )}
    </div>
  );
}
