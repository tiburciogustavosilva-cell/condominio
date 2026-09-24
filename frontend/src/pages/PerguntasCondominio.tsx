import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Check, Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/shared/Field';
import { cn } from '@/lib/utils';

type Etapa = 'blocos' | 'qtd_blocos' | 'comercio' | 'qtd_comercio' | 'areas' | 'areas_opcoes' | 'porteiro';

const ORDEM: Etapa[] = ['blocos', 'qtd_blocos', 'comercio', 'qtd_comercio', 'areas', 'areas_opcoes', 'porteiro'];

type OpcaoArea = 'salao' | 'churrasqueira';

type Respostas = {
  temBlocos: boolean | null;
  qtdBlocos: string;
  temComercio: boolean | null;
  qtdComercio: string;
  temAreasReserva: boolean | null;
  areasEscolhidas: Record<OpcaoArea, boolean>;
  /** Áreas extras digitadas pela pessoa (botão "Adicionar" — pode ter mais de uma). */
  areasPersonalizadas: string[];
  temPorteiro: boolean | null;
};

const VAZIO: Respostas = {
  temBlocos: null,
  qtdBlocos: '',
  temComercio: null,
  qtdComercio: '',
  temAreasReserva: null,
  areasEscolhidas: { salao: false, churrasqueira: false },
  areasPersonalizadas: [],
  temPorteiro: null
};

/** Próxima etapa visível, pulando perguntas de detalhe quando a resposta anterior foi "não". */
function proximaEtapa(atual: Etapa, respostas: Respostas): Etapa | null {
  const indice = ORDEM.indexOf(atual);
  for (let i = indice + 1; i < ORDEM.length; i++) {
    const etapa = ORDEM[i];
    if (etapa === 'qtd_blocos' && !respostas.temBlocos) continue;
    if (etapa === 'qtd_comercio' && !respostas.temComercio) continue;
    if (etapa === 'areas_opcoes' && !respostas.temAreasReserva) continue;
    return etapa;
  }
  return null;
}

export default function PerguntasCondominio() {
  const { usuario, isSindico, recarregarCondominio } = useAuth();
  const navigate = useNavigate();
  const modoTeste = !usuario;

  const [etapa, setEtapa] = useState<Etapa>('blocos');
  const [respostas, setRespostas] = useState<Respostas>(VAZIO);
  const [salvando, setSalvando] = useState(false);

  const etapasVisiveis = ORDEM.filter(
    (e) =>
      (e !== 'qtd_blocos' || respostas.temBlocos !== false) &&
      (e !== 'qtd_comercio' || respostas.temComercio !== false) &&
      (e !== 'areas_opcoes' || respostas.temAreasReserva !== false)
  );
  const indiceAtual = etapasVisiveis.indexOf(etapa);
  const totalEtapas = etapasVisiveis.length;

  async function finalizar(respostasFinais: Respostas) {
    if (modoTeste) {
      toast.success('Modo teste — respostas não foram salvas.');
      navigate('/cadastro');
      return;
    }
    if (!usuario?.condominioId || !isSindico) {
      toast.error('Só o síndico pode responder essas perguntas.');
      return;
    }
    setSalvando(true);
    try {
      const { error } = await supabase
        .from('condominios')
        .update({
          tem_blocos: !!respostasFinais.temBlocos,
          qtd_blocos: respostasFinais.temBlocos ? Number(respostasFinais.qtdBlocos) || 0 : null,
          tem_comercio: !!respostasFinais.temComercio,
          qtd_comercio: respostasFinais.temComercio ? Number(respostasFinais.qtdComercio) || 0 : null,
          tem_areas_reserva: !!respostasFinais.temAreasReserva,
          tem_porteiro: !!respostasFinais.temPorteiro,
          onboarding_concluido: true
        })
        .eq('id', usuario.condominioId);
      if (error) throw error;

      if (respostasFinais.temAreasReserva) {
        const novasAreas: string[] = [];
        if (respostasFinais.areasEscolhidas.salao) novasAreas.push('Salão de festas');
        if (respostasFinais.areasEscolhidas.churrasqueira) novasAreas.push('Churrasqueira');
        for (const nome of respostasFinais.areasPersonalizadas) {
          const limpo = nome.trim();
          if (limpo) novasAreas.push(limpo);
        }
        if (novasAreas.length > 0) {
          const { error: erroAreas } = await supabase
            .from('areas')
            .insert(novasAreas.map((nome) => ({ nome })));
          if (erroAreas) throw erroAreas;
        }
      }

      await recarregarCondominio();
      toast.success('Tudo certo! Seu condomínio está configurado.');
      navigate('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar as respostas');
    } finally {
      setSalvando(false);
    }
  }

  function responderSimNao(campo: 'temBlocos' | 'temComercio' | 'temAreasReserva' | 'temPorteiro', valor: boolean) {
    const novasRespostas = { ...respostas, [campo]: valor };
    setRespostas(novasRespostas);
    const proxima = proximaEtapa(etapa, novasRespostas);
    if (proxima) {
      setEtapa(proxima);
    } else {
      finalizar(novasRespostas);
    }
  }

  function confirmarQuantidade(campo: 'qtdBlocos' | 'qtdComercio') {
    const valor = respostas[campo];
    if (!valor || Number(valor) <= 0) {
      toast.error('Informe um número maior que zero');
      return;
    }
    const proxima = proximaEtapa(etapa, respostas);
    if (proxima) {
      setEtapa(proxima);
    } else {
      finalizar(respostas);
    }
  }

  function alternarAreaEscolhida(opcao: OpcaoArea) {
    setRespostas((r) => ({ ...r, areasEscolhidas: { ...r.areasEscolhidas, [opcao]: !r.areasEscolhidas[opcao] } }));
  }

  function adicionarAreaPersonalizada() {
    setRespostas((r) => ({ ...r, areasPersonalizadas: [...r.areasPersonalizadas, ''] }));
  }

  function atualizarAreaPersonalizada(indice: number, valor: string) {
    setRespostas((r) => ({
      ...r,
      areasPersonalizadas: r.areasPersonalizadas.map((v, i) => (i === indice ? valor : v))
    }));
  }

  function removerAreaPersonalizada(indice: number) {
    setRespostas((r) => ({ ...r, areasPersonalizadas: r.areasPersonalizadas.filter((_, i) => i !== indice) }));
  }

  function confirmarAreasOpcoes() {
    const { salao, churrasqueira } = respostas.areasEscolhidas;
    const temPersonalizada = respostas.areasPersonalizadas.some((v) => v.trim());
    if (!salao && !churrasqueira && !temPersonalizada) {
      toast.error('Selecione ou adicione pelo menos uma área');
      return;
    }
    const proxima = proximaEtapa(etapa, respostas);
    if (proxima) {
      setEtapa(proxima);
    } else {
      finalizar(respostas);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-primary p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg"
      >
        <div className="mb-6 flex items-center justify-center gap-2 text-primary-foreground">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/15 backdrop-blur">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="font-heading text-lg font-extrabold">Condomínio</span>
        </div>

        <Card className="overflow-hidden p-6 shadow-md sm:p-8">
          {modoTeste && (
            <div className="mb-5 rounded-md bg-warning/15 px-3 py-2 text-center text-xs font-medium text-warning-foreground">
              Modo teste: você não está logado, então as respostas não serão salvas.
            </div>
          )}

          {/* progresso */}
          <div className="mb-6 flex gap-1.5">
            {Array.from({ length: totalEtapas }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full bg-muted transition-colors',
                  i <= indiceAtual && 'bg-primary'
                )}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {etapa === 'blocos' && (
              <PerguntaSimNao
                key="blocos"
                titulo="Seu condomínio tem blocos?"
                subtitulo="Por exemplo: Bloco A, Bloco B..."
                onResponder={(v) => responderSimNao('temBlocos', v)}
              />
            )}

            {etapa === 'qtd_blocos' && (
              <PerguntaQuantidade
                key="qtd_blocos"
                titulo="Quantos blocos tem o condomínio?"
                valor={respostas.qtdBlocos}
                onChange={(v) => setRespostas((r) => ({ ...r, qtdBlocos: v }))}
                onConfirmar={() => confirmarQuantidade('qtdBlocos')}
              />
            )}

            {etapa === 'comercio' && (
              <PerguntaSimNao
                key="comercio"
                titulo="O primeiro andar tem comércio?"
                subtitulo="Lojas, salas comerciais ou similares no térreo."
                onResponder={(v) => responderSimNao('temComercio', v)}
              />
            )}

            {etapa === 'qtd_comercio' && (
              <PerguntaQuantidade
                key="qtd_comercio"
                titulo="Quantos comércios tem?"
                valor={respostas.qtdComercio}
                onChange={(v) => setRespostas((r) => ({ ...r, qtdComercio: v }))}
                onConfirmar={() => confirmarQuantidade('qtdComercio')}
              />
            )}

            {etapa === 'areas' && (
              <PerguntaSimNao
                key="areas"
                titulo="Seu condomínio tem área no qual precisa de reserva?"
                subtitulo="Por exemplo: salão de festas, churrasqueira..."
                onResponder={(v) => responderSimNao('temAreasReserva', v)}
              />
            )}

            {etapa === 'areas_opcoes' && (
              <PerguntaMultiEscolha
                key="areas_opcoes"
                titulo="Quais áreas o condomínio tem?"
                subtitulo="Pode marcar mais de uma."
                escolhidas={respostas.areasEscolhidas}
                onAlternar={alternarAreaEscolhida}
                personalizadas={respostas.areasPersonalizadas}
                onAdicionarPersonalizada={adicionarAreaPersonalizada}
                onAtualizarPersonalizada={atualizarAreaPersonalizada}
                onRemoverPersonalizada={removerAreaPersonalizada}
                onConfirmar={confirmarAreasOpcoes}
              />
            )}

            {etapa === 'porteiro' && (
              <PerguntaSimNao
                key="porteiro"
                titulo="O condomínio tem porteiro?"
                subtitulo="Se tiver, o módulo de Encomendas fica disponível pra registrar o que chega na portaria."
                onResponder={(v) => responderSimNao('temPorteiro', v)}
                carregando={salvando}
              />
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
}

function PerguntaSimNao({
  titulo,
  subtitulo,
  onResponder,
  carregando
}: {
  titulo: string;
  subtitulo?: string;
  onResponder: (valor: boolean) => void;
  carregando?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 text-center"
    >
      <div className="space-y-1.5">
        <h2 className="font-heading text-xl font-extrabold">{titulo}</h2>
        {subtitulo && <p className="text-sm text-muted-foreground">{subtitulo}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={carregando}
          onClick={() => onResponder(false)}
          className="flex-col gap-1 py-6"
        >
          <X className="h-5 w-5" />
          Não
        </Button>
        <Button
          type="button"
          variant="brand"
          size="lg"
          disabled={carregando}
          onClick={() => onResponder(true)}
          className="flex-col gap-1 py-6"
        >
          {carregando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
          Sim
        </Button>
      </div>
    </motion.div>
  );
}

function PerguntaQuantidade({
  titulo,
  valor,
  onChange,
  onConfirmar
}: {
  titulo: string;
  valor: string;
  onChange: (valor: string) => void;
  onConfirmar: () => void;
}) {
  return (
    <motion.form
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25 }}
      onSubmit={(e) => {
        e.preventDefault();
        onConfirmar();
      }}
      className="space-y-6 text-center"
    >
      <h2 className="font-heading text-xl font-extrabold">{titulo}</h2>
      <Field label="Quantidade" htmlFor="quantidade" className="text-left">
        <Input
          id="quantidade"
          type="number"
          min={1}
          autoFocus
          value={valor}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
      <Button type="submit" variant="brand" size="lg" className="w-full">
        Continuar
      </Button>
    </motion.form>
  );
}

const OPCOES_AREA: { opcao: OpcaoArea; label: string }[] = [
  { opcao: 'salao', label: 'Salão de festas' },
  { opcao: 'churrasqueira', label: 'Churrasqueira' }
];

function PerguntaMultiEscolha({
  titulo,
  subtitulo,
  escolhidas,
  onAlternar,
  personalizadas,
  onAdicionarPersonalizada,
  onAtualizarPersonalizada,
  onRemoverPersonalizada,
  onConfirmar
}: {
  titulo: string;
  subtitulo?: string;
  escolhidas: Record<OpcaoArea, boolean>;
  onAlternar: (opcao: OpcaoArea) => void;
  personalizadas: string[];
  onAdicionarPersonalizada: () => void;
  onAtualizarPersonalizada: (indice: number, valor: string) => void;
  onRemoverPersonalizada: (indice: number) => void;
  onConfirmar: () => void;
}) {
  return (
    <motion.form
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25 }}
      onSubmit={(e) => {
        e.preventDefault();
        onConfirmar();
      }}
      className="space-y-6"
    >
      <div className="space-y-1.5 text-center">
        <h2 className="font-heading text-xl font-extrabold">{titulo}</h2>
        {subtitulo && <p className="text-sm text-muted-foreground">{subtitulo}</p>}
      </div>

      <div className="space-y-2">
        {OPCOES_AREA.map(({ opcao, label }) => {
          const marcado = escolhidas[opcao];
          return (
            <button
              key={opcao}
              type="button"
              onClick={() => onAlternar(opcao)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-sm font-medium transition-colors',
                marcado
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <span
                className={cn(
                  'grid h-5 w-5 shrink-0 place-items-center rounded border',
                  marcado ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
                )}
              >
                {marcado && <Check className="h-3.5 w-3.5" />}
              </span>
              {label}
            </button>
          );
        })}

        {personalizadas.map((valor, indice) => (
          <div key={indice} className="flex items-center gap-2">
            <Input
              autoFocus
              placeholder="Digite o nome da área"
              value={valor}
              onChange={(e) => onAtualizarPersonalizada(indice, e.target.value)}
            />
            <button
              type="button"
              onClick={() => onRemoverPersonalizada(indice)}
              aria-label="Remover área"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={onAdicionarPersonalizada}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-input px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </button>
      </div>

      <Button type="submit" variant="brand" size="lg" className="w-full">
        Continuar
      </Button>
    </motion.form>
  );
}
