import { useEffect, useRef, useState, type DragEvent, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Armchair,
  Award,
  Baby,
  Building2,
  Car,
  Check,
  Lock,
  MapPin,
  Minus,
  Move,
  Eraser,
  Paintbrush,
  Package,
  Pencil,
  Plus,
  Route,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trees,
  Trophy,
  Users,
  Waves,
  type LucideIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { rotuloUnidade } from '@/lib/format';
import { useMapa, novoId } from '@/hooks/useMapa';
import type { MapaItem, Unidade } from '@/types/condominio';
import { FilterPills } from '@/components/shared/FilterPills';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const GERAL = 'geral';
const MAX = 199; // última coluna/linha aceita pela API

/** Peças de área comum: nome, ícone, cor e tamanho inicial (largura × altura em casas). */
const AREAS: Record<string, { nome: string; icon: LucideIcon; cls: string; w: number; h: number }> = {
  rua: { nome: 'Rua', icon: Route, cls: 'border-zinc-500/40 bg-zinc-500/25 text-zinc-700 dark:text-zinc-200', w: 6, h: 1 },
  area_verde: { nome: 'Área verde', icon: Trees, cls: 'border-emerald-500/40 bg-emerald-500/20 text-emerald-800 dark:text-emerald-200', w: 2, h: 2 },
  playground: { nome: 'Playground', icon: Baby, cls: 'border-lime-500/50 bg-lime-400/25 text-lime-800 dark:text-lime-200', w: 2, h: 2 },
  piscina: { nome: 'Piscina', icon: Waves, cls: 'border-sky-500/50 bg-sky-400/25 text-sky-800 dark:text-sky-200', w: 3, h: 2 },
  convivencia: { nome: 'Convivência', icon: Armchair, cls: 'border-amber-500/50 bg-amber-400/25 text-amber-800 dark:text-amber-200', w: 2, h: 2 },
  quadra: { nome: 'Quadra esportiva', icon: Trophy, cls: 'border-orange-500/50 bg-orange-400/25 text-orange-800 dark:text-orange-200', w: 3, h: 2 },
  estacionamento: { nome: 'Estacionamento', icon: Car, cls: 'border-slate-500/40 bg-slate-400/25 text-slate-700 dark:text-slate-200', w: 3, h: 2 },
  portaria: { nome: 'Portaria', icon: ShieldCheck, cls: 'border-indigo-500/50 bg-indigo-400/25 text-indigo-800 dark:text-indigo-200', w: 1, h: 1 },
  outro: { nome: 'Outro', icon: MapPin, cls: 'border-border bg-muted text-muted-foreground', w: 1, h: 1 }
};
const LAZER = ['piscina', 'playground', 'quadra', 'convivencia', 'area_verde'];

// Mesmas cores na peça e na legenda.
const COR = {
  ocupada: 'border-success/50 bg-success/15',
  vazia: 'border-dashed border-muted-foreground/40 bg-card',
  encomenda: 'bg-info text-info-foreground',
  ocorrencia: 'bg-destructive text-destructive-foreground'
};
const selo = 'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold';

/** Casa fica no terreno (mapa geral); apartamento/loja/garagem fica nos andares do bloco. */
const camadaDe = (u: Unidade) => (u.tipo === 'casa' ? GERAL : `bloco:${u.bloco || '-'}`);
const blocoDaCamada = (c: string) => c.slice('bloco:'.length);
const nomeBloco = (b: string) => (b === '-' ? 'Prédio' : `Bloco ${b}`);
const nomeCamada = (c: string) => (c === GERAL ? 'Mapa geral' : nomeBloco(blocoDaCamada(c)));
const numeroDe = (u: Unidade) => parseInt(u.numero.replace(/\D/g, ''), 10);

/** O que está sendo arrastado ou foi tocado pra posicionar. */
type Peca =
  | { tipo: 'item'; id: string }
  | { tipo: 'unidade'; unidadeId: string }
  | { tipo: 'bloco'; bloco: string }
  | { tipo: 'area'; area: string };

const CONQUISTAS = [
  { id: 'primeira', nome: 'Primeira unidade no mapa' },
  { id: 'rua', nome: 'Ruas traçadas' },
  { id: 'lazer', nome: 'Área de lazer' },
  { id: 'portaria', nome: 'Portaria marcada' },
  { id: 'completo', nome: 'Mapa completo' }
];

/** Mapa do condomínio pro síndico: terreno com casas, prédios e áreas comuns, e os andares de cada bloco. */
export function MapaCondominio({ unidades, onEditar }: { unidades: Unidade[]; onEditar: (u: Unidade) => void }) {
  const { itens: todosItens, carregando, falhou, recarregar, aplicar } = useMapa();
  const [camadaEscolhida, setCamada] = useState(GERAL);
  const [editando, setEditando] = useState(false);
  const [selecao, setSelecao] = useState<Peca | null>(null);
  const [aberta, setAberta] = useState<Unidade | null>(null);
  // mapa geral: mover peças, pincel de rua ou borracha
  const [ferramenta, setFerramenta] = useState<'mover' | 'rua' | 'borracha'>('mover');
  // prédio não cresce sozinho: andar/coluna vazios só aparecem quando o síndico pede.
  // quantos andares/colunas o síndico pediu (absoluto): ocupar o andar novo não cria outro
  const [pedido, setPedido] = useState({ andares: 0, colunas: 0 });
  const traco = useRef<Set<string> | null>(null);
  const [tracoVisivel, setTracoVisivel] = useState<Set<string>>(new Set());

  const porId = new Map(unidades.map((u) => [u.id, u]));
  const camadasBloco = [...new Set(unidades.filter((u) => u.tipo !== 'casa').map(camadaDe))].sort();
  const camadas = [GERAL, ...camadasBloco];
  // a camada aberta pode sumir (ex.: a última unidade do bloco mudou de bloco): volta pro geral
  const camada = camadas.includes(camadaEscolhida) ? camadaEscolhida : GERAL;
  const temCasas = unidades.some((u) => u.tipo === 'casa');

  // peça de unidade só vale na camada atual da unidade; se ela mudou de bloco/tipo, a peça antiga
  // fica ignorada e a unidade volta pra "fora do mapa" (ao reposicionar, a peça antiga é reaproveitada)
  const pecaValida = (i: MapaItem) => {
    if (i.tipo !== 'unidade') return true;
    const u = porId.get(i.unidadeId!);
    return !!u && camadaDe(u) === i.camada;
  };
  const itens = todosItens.filter(pecaValida);
  const daCamada = itens.filter((i) => i.camada === camada);
  const posicionada = new Set(itens.map((i) => i.unidadeId).filter(Boolean));
  const unidadesFora = unidades.filter((u) => camadaDe(u) === camada && !posicionada.has(u.id));
  const blocosFora =
    camada === GERAL ? camadasBloco.map(blocoDaCamada).filter((b) => !itens.some((i) => i.tipo === 'bloco' && i.bloco === b)) : [];

  // ---- gamificação: progresso e conquistas ----
  const totalPecas = unidades.length + camadasBloco.length;
  const prediosNoMapa = camadasBloco.filter((c) => itens.some((i) => i.tipo === 'bloco' && i.bloco === blocoDaCamada(c))).length;
  const pecasNoMapa = unidades.filter((u) => posicionada.has(u.id)).length + prediosNoMapa;
  const pct = totalPecas ? Math.round((pecasNoMapa / totalPecas) * 100) : 0;
  const tem = (tipos: string[]) => itens.some((i) => tipos.includes(i.tipo));
  const feitas = new Set(
    [
      posicionada.size > 0 && 'primeira',
      tem(['rua']) && 'rua',
      tem(LAZER) && 'lazer',
      tem(['portaria']) && 'portaria',
      totalPecas > 0 && pct === 100 && 'completo'
    ].filter(Boolean) as string[]
  );
  const anteriores = useRef<Set<string> | null>(null);
  const chaveFeitas = [...feitas].sort().join();
  useEffect(() => {
    if (carregando) return;
    if (anteriores.current) {
      for (const c of CONQUISTAS) {
        if (feitas.has(c.id) && !anteriores.current.has(c.id)) toast.success(`🏆 Conquista desbloqueada: ${c.nome}`);
      }
    }
    anteriores.current = feitas;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveFeitas, carregando]);

  // ---- grade ----
  const geral = camada === GERAL;
  const celulasDe = (i: MapaItem) =>
    Array.from({ length: i.largura * i.altura }, (_, n) => `${i.x + (n % i.largura)},${i.y + Math.floor(n / i.largura)}`);
  const cobertas = new Set(daCamada.flatMap(celulasDe));
  const ruas = new Set(daCamada.filter((i) => i.tipo === 'rua').flatMap(celulasDe));
  // lote = quadrado vazio encostado numa rua (é onde as casas entram)
  const lotes = geral
    ? [...new Set([...ruas].flatMap((c) => {
        const [x, y] = c.split(',').map(Number);
        return [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]
          .filter(([a, b]) => a >= 0 && b >= 0 && a <= MAX && b <= MAX && !cobertas.has(`${a},${b}`))
          .map(([a, b]) => `${a},${b}`);
      }))]
        .map((c) => c.split(',').map(Number) as [number, number])
        .sort((a, b) => a[1] - b[1] || a[0] - b[0])
    : [];
  const ehLote = new Set(lotes.map(([x, y]) => `${x},${y}`));

  const fimX = Math.max(0, ...daCamada.map((i) => i.x + i.largura), ...lotes.map(([x]) => x + 1));
  const fimY = Math.max(0, ...daCamada.map((i) => i.y + i.altura), ...lotes.map(([, y]) => y + 1));
  // aptos por andar pela numeração do bloco ("104" = 4 por andar); sem padrão, 4
  const finais = unidades.filter((u) => camadaDe(u) === camada).map(numeroDe).filter((n) => n >= 100).map((n) => n % 100);
  const aptosPorAndar = finais.length ? Math.max(...finais) : 4;
  // geral: editando sempre sobra espaço pra crescer e desenhar ruas.
  // bloco: y conta do térreo pra cima (0 = 1º andar); andar/coluna a mais só pelos botões "+ Andar" / "+ Apto por andar"
  const colunas = geral
    ? editando ? Math.max(16, fimX + 2) : Math.max(1, fimX)
    : editando
      ? Math.max(fimX, aptosPorAndar, pedido.colunas)
      : Math.max(1, fimX);
  const linhas = geral ? (editando ? Math.max(10, fimY + 2) : Math.max(1, fimY)) : Math.max(fimY, 1, editando ? pedido.andares : 0);
  /** Linha CSS da peça: no geral de cima pra baixo; no bloco de baixo pra cima (1º andar encostado no térreo). */
  const linhaCss = (y: number, h: number) => (geral ? `${y + 1} / span ${h}` : `${linhas - (y + h - 1)} / span ${h}`);

  const cruza = (a: { x: number; y: number; w: number; h: number }, i: MapaItem) =>
    a.x < i.x + i.largura && i.x < a.x + a.w && a.y < i.y + i.altura && i.y < a.y + a.h;
  const ocupantes = (x: number, y: number, w: number, h: number, ignorar?: string, base = daCamada) =>
    base.filter((i) => i.id !== ignorar && cruza({ x, y, w, h }, i));
  const cabe = (x: number, y: number, w: number, h: number, ignorar?: string, base = daCamada) =>
    x >= 0 && y >= 0 && x + w - 1 <= MAX && y + h - 1 <= MAX && ocupantes(x, y, w, h, ignorar, base).length === 0;

  /** Primeiro lugar livre (lendo linha a linha) pra uma peça w×h. */
  function lugarLivre(w: number, h: number, base = daCamada, largura = Math.max(colunas, w)) {
    for (let y = 0; y <= MAX; y++) for (let x = 0; x + w <= largura; x++) if (cabe(x, y, w, h, undefined, base)) return { x, y };
    return null;
  }

  function novaPeca(p: Peca, x: number, y: number): MapaItem | null {
    if (p.tipo === 'unidade') {
      // reaproveita a peça antiga da unidade (se ela mudou de bloco/tipo): cada unidade tem uma peça só
      const antiga = todosItens.find((i) => i.unidadeId === p.unidadeId);
      return { id: antiga?.id ?? novoId(), camada, tipo: 'unidade', unidadeId: p.unidadeId, bloco: null, rotulo: '', x, y, largura: 1, altura: 1 };
    }
    if (p.tipo === 'bloco') return { id: novoId(), camada: GERAL, tipo: 'bloco', unidadeId: null, bloco: p.bloco, rotulo: '', x, y, largura: 2, altura: 3 };
    if (p.tipo === 'area') {
      const a = AREAS[p.area];
      return { id: novoId(), camada: GERAL, tipo: p.area, unidadeId: null, bloco: null, rotulo: '', x, y, largura: a.w, altura: a.h };
    }
    return null;
  }

  /** Coloca a peça com o canto em (x,y). Em cima de outra do mesmo tamanho, as duas trocam de lugar. */
  function posicionar(p: Peca, x: number, y: number) {
    setSelecao(null);
    const existente = p.tipo === 'item' ? daCamada.find((i) => i.id === p.id) : undefined;
    const peca = existente ?? novaPeca(p, x, y);
    if (!peca) return;
    const movida = { ...peca, x, y };
    const noCaminho = ocupantes(x, y, peca.largura, peca.altura, peca.id);
    if (noCaminho.length === 0) {
      if (cabe(x, y, peca.largura, peca.altura, peca.id)) aplicar([movida]);
      return;
    }
    const outra = noCaminho[0];
    const trocaPerfeita =
      noCaminho.length === 1 && existente && outra.x === x && outra.y === y && outra.largura === peca.largura && outra.altura === peca.altura;
    if (trocaPerfeita) return aplicar([movida, { ...outra, x: existente.x, y: existente.y }]);
    if (noCaminho.length === 1 && !existente && outra.tipo === 'unidade' && peca.tipo === 'unidade') {
      // unidade de fora em cima de uma posicionada: troca (a de lá volta pra fora)
      return aplicar([{ ...movida, largura: outra.largura, altura: outra.altura }], [outra.id]);
    }
    toast.error('Não cabe aí: tem outra peça no caminho.');
  }

  function tirarDoMapa(id: string) {
    setSelecao(null);
    aplicar([], [id]);
  }

  function redimensionar(i: MapaItem, dw: number, dh: number) {
    const w = Math.min(20, Math.max(1, i.largura + dw));
    const h = Math.min(20, Math.max(1, i.altura + dh));
    if (w === i.largura && h === i.altura) return;
    if (!cabe(i.x, i.y, w, h, i.id)) return toast.error('Não dá pra aumentar: encostou em outra peça.');
    aplicar([{ ...i, largura: w, altura: h }]);
  }

  function adicionarArea(area: string) {
    const a = AREAS[area];
    const lugar = lugarLivre(a.w, a.h);
    if (!lugar) return toast.error('Mapa cheio.');
    const peca = novaPeca({ tipo: 'area', area }, lugar.x, lugar.y)!;
    aplicar([peca]);
    setSelecao({ tipo: 'item', id: peca.id });
  }

  /**
   * Monta sozinho o que está fora do mapa nesta camada.
   *  - bloco: "101" vira 1º andar, coluna 1 (andar mais alto em cima).
   *  - geral: casas enfileiradas por quadra (6 por linha) com uma rua embaixo de cada quadra; depois os prédios.
   * ponytail: heurística de numeração; o que não seguir o padrão vai pra próxima casa livre.
   */
  function montarAutomatico() {
    const novos: MapaItem[] = [];
    const base = () => [...daCamada, ...novos];
    const por = (p: Peca, x: number, y: number) => {
      const n = novaPeca(p, x, y);
      if (n) novos.push(n);
    };

    if (!geral) {
      const resto: Unidade[] = [];
      for (const u of unidadesFora) {
        const n = numeroDe(u);
        const x = Math.max(0, (n % 100) - 1);
        const y = Math.floor(n / 100) - 1; // "101" = 1º andar = linha 0, encostada no térreo
        if (n >= 100 && cabe(x, y, 1, 1, undefined, base())) por({ tipo: 'unidade', unidadeId: u.id }, x, y);
        else resto.push(u);
      }
      for (const u of resto) {
        const l = lugarLivre(1, 1, base(), Math.max(colunas, 4));
        if (l) por({ tipo: 'unidade', unidadeId: u.id }, l.x, l.y);
      }
    } else {
      // primeiro os lotes das ruas desenhadas (por quadra e número); o que sobrar vai pro layout automático
      const livres = [...lotes];
      const sobram: Unidade[] = [];
      [...unidadesFora]
        .sort((a, b) => (a.bloco || '').localeCompare(b.bloco || '') || numeroDe(a) - numeroDe(b) || a.numero.localeCompare(b.numero))
        .forEach((u) => {
          const l = livres.shift();
          if (l) por({ tipo: 'unidade', unidadeId: u.id }, l[0], l[1]);
          else sobram.push(u);
        });
      let y = Math.max(0, ...base().map((i) => i.y + i.altura), ...lotes.map(([, ly]) => ly + 1)) + (base().length ? 1 : 0);
      const quadras = [...new Set(sobram.map((u) => u.bloco || '-'))].sort();
      quadras.forEach((q, n) => {
        const casas = sobram.filter((u) => (u.bloco || '-') === q).sort((a, b) => numeroDe(a) - numeroDe(b) || a.numero.localeCompare(b.numero));
        casas.forEach((u, i) => por({ tipo: 'unidade', unidadeId: u.id }, i % 6, y + Math.floor(i / 6)));
        y += Math.ceil(casas.length / 6);
        const rua = novaPeca({ tipo: 'area', area: 'rua' }, 0, y)!;
        novos.push({ ...rua, rotulo: `Rua ${n + 1}` });
        y += 1;
      });
      blocosFora.forEach((b, i) => por({ tipo: 'bloco', bloco: b }, i * 3, y));
    }
    if (novos.length) aplicar(novos);
  }

  // ---- pincel de rua / borracha (pointer events: funciona com mouse e com o dedo) ----
  const pintando = editando && geral && ferramenta !== 'mover';
  function celulasNoPonto(e: PointerEvent): string[] {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const rua = el?.closest('[data-rua]')?.getAttribute('data-rua');
    if (rua) {
      const item = daCamada.find((i) => i.id === rua);
      return item ? celulasDe(item) : [];
    }
    const c = el?.closest('[data-cel]')?.getAttribute('data-cel');
    return c ? [c] : [];
  }
  function pincelar(e: PointerEvent) {
    if (!traco.current) return;
    let mudou = false;
    for (const c of celulasNoPonto(e)) {
      const vale = ferramenta === 'rua' ? !cobertas.has(c) : ruas.has(c);
      if (vale && !traco.current.has(c)) {
        traco.current.add(c);
        mudou = true;
      }
    }
    if (mudou) setTracoVisivel(new Set(traco.current));
  }
  function terminarTraco() {
    const cels = traco.current;
    traco.current = null;
    setTracoVisivel(new Set());
    if (!cels?.size) return;
    if (ferramenta === 'rua') {
      aplicar(
        [...cels].map((c) => {
          const [x, y] = c.split(',').map(Number);
          return { ...novaPeca({ tipo: 'area', area: 'rua' }, x, y)!, largura: 1, altura: 1 };
        })
      );
    } else {
      aplicar([], daCamada.filter((i) => i.tipo === 'rua' && celulasDe(i).some((c) => cels.has(c))).map((i) => i.id));
    }
  }
  const eventosPincel = pintando
    ? {
        onPointerDown: (e: PointerEvent) => {
          (e.target as Element).releasePointerCapture?.(e.pointerId); // no toque, deixa o dedo "passar" pelas casas
          traco.current = new Set();
          pincelar(e);
        },
        onPointerMove: pincelar,
        onPointerUp: terminarTraco,
        onPointerLeave: terminarTraco
      }
    : {};

  // ---- arrastar / tocar ----
  const arrastar = (p: Peca) => (e: DragEvent) => e.dataTransfer.setData('text/plain', JSON.stringify(p));
  const lerPeca = (e: DragEvent): Peca | null => {
    try {
      return JSON.parse(e.dataTransfer.getData('text/plain'));
    } catch {
      return null;
    }
  };
  const soltarEm = (x: number, y: number) => (e: DragEvent) => {
    e.preventDefault();
    const p = lerPeca(e);
    if (p) posicionar(p, x, y);
  };
  const permitir = (e: DragEvent) => editando && e.preventDefault();

  function clicarPeca(i: MapaItem) {
    if (!editando) {
      if (i.tipo === 'unidade') setAberta(porId.get(i.unidadeId!) ?? null);
      if (i.tipo === 'bloco' && camadas.includes(`bloco:${i.bloco}`)) setCamada(`bloco:${i.bloco}`);
      return;
    }
    if (selecao && !(selecao.tipo === 'item' && selecao.id === i.id)) return posicionar(selecao, i.x, i.y);
    setSelecao(selecao?.tipo === 'item' && selecao.id === i.id ? null : { tipo: 'item', id: i.id });
  }

  const selecionado = selecao?.tipo === 'item' ? daCamada.find((i) => i.id === selecao.id) : undefined;
  const estaSelecionada = (p: Peca) => JSON.stringify(p) === JSON.stringify(selecao);
  const algoFora = unidadesFora.length > 0 || blocosFora.length > 0;

  // por linha da grade do bloco: qual andar é (pelo número dos aptos) e quantos estão ocupados
  const linhaDe = (y: number) => daCamada.filter((i) => i.tipo === 'unidade' && i.y === y).map((i) => porId.get(i.unidadeId!)!);
  const yDaLinhaNaTela = (r: number) => linhas - 1 - r;
  const andaresPorLinha = Array.from({ length: linhas }, (_, r) => {
    const y = yDaLinhaNaTela(r);
    const andares = linhaDe(y).map(numeroDe).filter((n) => n >= 100).map((n) => Math.floor(n / 100));
    const contagem = new Map<number, number>();
    andares.forEach((a) => contagem.set(a, (contagem.get(a) ?? 0) + 1));
    const mais = [...contagem].sort((a, b) => b[1] - a[1])[0];
    return `${mais ? mais[0] : y + 1}º`;
  });
  const ocupacaoPorLinha = Array.from({ length: linhas }, (_, r) => {
    const us = linhaDe(yDaLinhaNaTela(r));
    return us.length ? `${us.filter((u) => u.moradores?.length).length}/${us.length}` : '';
  });

  const grade = (
          <div
            {...eventosPincel}
            className={cn('grid w-max select-none gap-1.5', pintando && 'cursor-crosshair')}
            style={{
              gridTemplateColumns: `repeat(${colunas}, ${geral ? '4rem' : '5.5rem'})`,
              gridAutoRows: geral ? '4rem' : '4.5rem',
              touchAction: pintando ? 'none' : undefined
            }}
          >
            {Array.from({ length: linhas * colunas }, (_, n) => {
              const x = n % colunas;
              const linhaTela = Math.floor(n / colunas);
              const y = geral ? linhaTela : linhas - 1 - linhaTela;
              const cel = `${x},${y}`;
              const lote = ehLote.has(cel);
              const pintada = ferramenta === 'rua' && tracoVisivel.has(cel);
              if (!editando && !lote) return null;
              return (
                <div
                  key={`c${cel}`}
                  data-cel={cel}
                  style={{ gridColumn: x + 1, gridRow: linhaTela + 1 }}
                  onDragOver={permitir}
                  onDrop={soltarEm(x, y)}
                  onClick={() => !pintando && selecao && posicionar(selecao, x, y)}
                  className={cn(
                    'rounded-md border border-dashed',
                    pintada
                      ? '-m-[3px] rounded-none border-0 bg-zinc-500/55'
                      : lote
                        ? 'border-amber-600/40 bg-amber-200/30 dark:bg-amber-900/20'
                        : 'border-border/70 bg-background/40',
                    !pintando && selecao && 'cursor-pointer hover:border-primary hover:bg-primary/5'
                  )}
                >
                  {lote && !pintada && <span className="block p-1 text-[9px] uppercase tracking-wide text-amber-700/70 dark:text-amber-300/60">lote vago</span>}
                </div>
              );
            })}
            {daCamada.map((i) => (
              <PecaNoMapa
                key={i.id}
                item={i}
                linha={linhaCss(i.y, i.altura)}
                unidade={i.unidadeId ? porId.get(i.unidadeId) : undefined}
                unidadesDoBloco={i.tipo === 'bloco' ? unidades.filter((u) => camadaDe(u) === `bloco:${i.bloco}`) : []}
                itensDoBloco={i.tipo === 'bloco' ? itens.filter((x) => x.camada === `bloco:${i.bloco}` && x.tipo === 'unidade') : []}
                editando={editando}
                arrastavel={editando && !pintando}
                apagando={ferramenta === 'borracha' && celulasDe(i).some((c) => tracoVisivel.has(c))}
                selecionada={selecao?.tipo === 'item' && selecao.id === i.id}
                onClick={() => !pintando && clicarPeca(i)}
                onDragStart={arrastar({ tipo: 'item', id: i.id })}
                onDragOver={permitir}
                onDrop={soltarEm(i.x, i.y)}
              />
            ))}
          </div>
  );

  if (carregando) return <Skeleton className="h-80" />;
  // sem o mapa carregado, montar por cima criaria peças repetidas: só deixa tentar de novo
  if (falhou) {
    return (
      <div className="rounded-lg border border-dashed border-destructive/40 px-6 py-10 text-center">
        <p className="font-heading font-bold">Não foi possível carregar o mapa</p>
        <p className="mt-1 text-sm text-muted-foreground">Verifique a conexão e tente de novo.</p>
        <Button variant="outline" className="mt-4" onClick={recarregar}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {camadas.length > 1 ? (
          <FilterPills
            options={camadas.map((c) => ({ value: c, label: nomeCamada(c) }))}
            value={camada}
            onChange={(c) => {
              setCamada(c);
              setSelecao(null);
              setPedido({ andares: 0, colunas: 0 });
            }}
          />
        ) : (
          <span />
        )}
        <div className="flex flex-wrap gap-2">
          {editando && !geral && (
            <>
              <Button size="sm" variant="outline" onClick={() => setPedido((p) => ({ ...p, andares: linhas + 1 }))}>
                <Plus className="h-4 w-4" /> Andar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPedido((p) => ({ ...p, colunas: colunas + 1 }))}>
                <Plus className="h-4 w-4" /> Apto por andar
              </Button>
            </>
          )}
          {editando && algoFora && (
            <Button size="sm" variant="outline" onClick={montarAutomatico}>
              <Sparkles className="h-4 w-4" /> {geral && lotes.length && unidadesFora.length ? 'Preencher lotes' : 'Montar automático'}
            </Button>
          )}
          <Button
            size="sm"
            variant={editando ? 'brand' : 'outline'}
            onClick={() => {
              setEditando(!editando);
              setSelecao(null);
              setPedido({ andares: 0, colunas: 0 });
            }}
          >
            {editando ? <Check className="h-4 w-4" /> : <Move className="h-4 w-4" />}
            {editando ? 'Concluir' : 'Organizar mapa'}
          </Button>
        </div>
      </div>

      {/* progresso + conquistas: o "jogo" é deixar o condomínio inteiro no mapa */}
      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {pct === 100 ? 'Condomínio completo no mapa! 🎉' : `${pecasNoMapa} de ${totalPecas} ${camadasBloco.length ? 'unidades e prédios' : 'unidades'} no mapa`}
            </span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <Progress value={pct} indicatorClassName={pct === 100 ? 'bg-success' : undefined} />
          <div className="flex flex-wrap gap-1.5">
            {CONQUISTAS.map((c) => {
              const ok = feitas.has(c.id);
              return (
                <span
                  key={c.id}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                    ok ? 'border-amber-500/50 bg-amber-400/20 text-amber-800 dark:text-amber-200' : 'border-border text-muted-foreground opacity-70'
                  )}
                >
                  {ok ? <Award className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {c.nome}
                </span>
              );
            })}
          </div>
          {editando && (
            <p className="text-xs text-muted-foreground">
              Arraste as peças pra grade, ou toque numa peça e depois no lugar. Toque numa peça já posicionada pra mudar o tamanho, o nome ou tirar do mapa.
            </p>
          )}
        </CardContent>
      </Card>

      {editando && geral && (
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['mover', Move, 'Mover peças'],
              ['rua', Paintbrush, 'Desenhar rua'],
              ['borracha', Eraser, 'Apagar rua']
            ] as const
          ).map(([f, Icone, nome]) => (
            <Button
              key={f}
              size="sm"
              variant={ferramenta === f ? 'default' : 'outline'}
              onClick={() => {
                setFerramenta(f);
                setSelecao(null);
              }}
            >
              <Icone className="h-4 w-4" /> {nome}
            </Button>
          ))}
          {ferramenta === 'rua' && (
            <span className="text-xs text-muted-foreground">
              Clique e arraste na grade pra desenhar. Os quadrados encostados na rua viram lotes.
            </span>
          )}
          {ferramenta === 'borracha' && <span className="text-xs text-muted-foreground">Passe por cima das ruas pra apagar.</span>}
        </div>
      )}

      {editando && geral && ferramenta === 'mover' && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(AREAS).map(([tipo, a]) => (
            <button
              key={tipo}
              type="button"
              draggable
              onDragStart={arrastar({ tipo: 'area', area: tipo })}
              onClick={() => adicionarArea(tipo)}
              className={cn('inline-flex cursor-grab items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-transform hover:-translate-y-0.5', a.cls)}
            >
              <Plus className="h-3 w-3" />
              <a.icon className="h-3.5 w-3.5" /> {a.nome}
            </button>
          ))}
        </div>
      )}

      {selecionado && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2 text-sm">
          <span className="px-1 font-medium">{tituloPeca(selecionado, porId)}</span>
          {AREAS[selecionado.tipo] && (
            <Input
              className="h-8 w-48"
              placeholder="Nome (ex.: Rua das Flores)"
              defaultValue={selecionado.rotulo}
              key={selecionado.id}
              onBlur={(e) => e.target.value !== selecionado.rotulo && aplicar([{ ...selecionado, rotulo: e.target.value }])}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          )}
          <span className="ml-1 text-xs text-muted-foreground">Largura</span>
          <Button size="icon" variant="outline" className="h-8 w-8" aria-label="Diminuir largura" onClick={() => redimensionar(selecionado, -1, 0)}>
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-4 text-center tabular-nums">{selecionado.largura}</span>
          <Button size="icon" variant="outline" className="h-8 w-8" aria-label="Aumentar largura" onClick={() => redimensionar(selecionado, 1, 0)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <span className="ml-1 text-xs text-muted-foreground">Altura</span>
          <Button size="icon" variant="outline" className="h-8 w-8" aria-label="Diminuir altura" onClick={() => redimensionar(selecionado, 0, -1)}>
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-4 text-center tabular-nums">{selecionado.altura}</span>
          <Button size="icon" variant="outline" className="h-8 w-8" aria-label="Aumentar altura" onClick={() => redimensionar(selecionado, 0, 1)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => tirarDoMapa(selecionado.id)}>
            <Trash2 className="h-4 w-4" /> {AREAS[selecionado.tipo] ? 'Apagar' : 'Tirar do mapa'}
          </Button>
        </div>
      )}

      {daCamada.length === 0 && !editando ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 px-6 py-12 text-center">
          <p className="font-heading font-bold">{geral ? 'Monte o mapa do seu condomínio' : `Monte os andares do ${nomeCamada(camada)}`}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {geral
              ? `Coloque ${temCasas ? 'as casas, ' : ''}${camadasBloco.length ? 'os prédios, ' : ''}ruas, piscina, parque e o que mais tiver. Depois é só olhar o mapa pra saber como está cada unidade.`
              : 'Posicione os apartamentos como eles são no prédio e acompanhe tudo de relance.'}
          </p>
          <Button variant="brand" className="mt-4" onClick={() => setEditando(true)}>
            <Move className="h-4 w-4" /> Começar
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          {geral ? (
            <div className="inline-block rounded-xl bg-emerald-500/5 p-2">{grade}</div>
          ) : (
            <Fachada
              nome={nomeCamada(camada)}
              linhas={linhas}
              andares={andaresPorLinha}
              ocupacao={ocupacaoPorLinha}
              ocupadas={unidades.filter((u) => camadaDe(u) === camada && u.moradores?.length).length}
              total={unidades.filter((u) => camadaDe(u) === camada).length}
            >
              {grade}
            </Fachada>
          )}
        </div>
      )}

      {editando && (
        <div
          onDragOver={permitir}
          onDrop={(e) => {
            e.preventDefault();
            const p = lerPeca(e);
            if (p?.tipo === 'item') tirarDoMapa(p.id);
          }}
          className="space-y-2 rounded-lg border border-dashed border-border p-3"
        >
          <p className="text-sm font-medium">
            Fora do mapa <span className="text-muted-foreground">({unidadesFora.length + blocosFora.length})</span>
          </p>
          {!algoFora ? (
            <p className="text-xs text-muted-foreground">Tudo desta camada já está no mapa. Arraste uma peça pra cá pra tirar.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {blocosFora.map((b) => {
                const p: Peca = { tipo: 'bloco', bloco: b };
                return (
                  <button
                    key={b}
                    type="button"
                    draggable
                    onDragStart={arrastar(p)}
                    onClick={() => setSelecao(estaSelecionada(p) ? null : p)}
                    className={cn(
                      'inline-flex h-12 cursor-grab items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground',
                      estaSelecionada(p) && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                    )}
                  >
                    <Building2 className="h-4 w-4" /> {nomeBloco(b)}
                  </button>
                );
              })}
              {unidadesFora.map((u) => {
                const p: Peca = { tipo: 'unidade', unidadeId: u.id };
                return (
                  <button
                    key={u.id}
                    type="button"
                    draggable
                    onDragStart={arrastar(p)}
                    onClick={() => setSelecao(estaSelecionada(p) ? null : p)}
                    className={cn(
                      'h-12 min-w-20 cursor-grab rounded-lg border px-2 text-left text-sm font-extrabold',
                      u.moradores?.length ? COR.ocupada : COR.vazia,
                      estaSelecionada(p) && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                    )}
                  >
                    {u.numero}
                    {u.tipo === 'casa' && u.bloco && u.bloco !== '-' && (
                      <span className="block text-[10px] font-medium text-muted-foreground">Quadra {u.bloco}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!editando && daCamada.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className={cn('h-3.5 w-3.5 rounded border', COR.ocupada)} /> Ocupada
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn('h-3.5 w-3.5 rounded border', COR.vazia)} /> Sem morador
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn(selo, COR.encomenda)}>
              <Package className="h-3 w-3" />
            </span>
            Encomenda na portaria
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn(selo, COR.ocorrencia)}>
              <AlertTriangle className="h-3 w-3" />
            </span>
            Ocorrência em aberto
          </span>
          {geral && camadasBloco.length > 0 && (
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Toque num prédio pra ver os andares
            </span>
          )}
        </div>
      )}

      <Dialog open={!!aberta} onOpenChange={(o) => !o && setAberta(null)}>
        <DialogContent className="sm:max-w-md">
          {aberta && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {aberta.tipo === 'casa' ? 'Casa' : 'Unidade'} {aberta.tipo === 'casa' ? aberta.numero : rotuloUnidade(aberta)}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p className="capitalize text-muted-foreground">
                  {aberta.tipo}
                  {aberta.tipo === 'casa' && aberta.bloco && aberta.bloco !== '-' && ` · Quadra ${aberta.bloco}`}
                  {' · '}Fração ideal: {Number(aberta.fracaoIdeal) ? `${Number(aberta.fracaoIdeal).toLocaleString('pt-BR')}%` : 'não informada'}
                  {' · '}Pontos: {Number(aberta.pontos) ? Number(aberta.pontos).toLocaleString('pt-BR') : 'não informado'}
                </p>
                <div>
                  <p className="font-medium">Moradores</p>
                  <p className="text-muted-foreground">{aberta.moradores?.length ? aberta.moradores.join(', ') : 'Ninguém cadastrado ainda.'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/encomendas" className="rounded-md bg-muted p-3 hover:bg-muted/70">
                    <p className="text-xs text-muted-foreground">Encomendas na portaria</p>
                    <p className="font-heading text-xl font-extrabold">{aberta.encomendasAguardando ?? 0}</p>
                  </Link>
                  <Link to="/ocorrencias" className="rounded-md bg-muted p-3 hover:bg-muted/70">
                    <p className="text-xs text-muted-foreground">Ocorrências em aberto</p>
                    <p className="font-heading text-xl font-extrabold">{aberta.ocorrenciasAbertas ?? 0}</p>
                  </Link>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" asChild>
                    <Link to="/moradores">Ver moradores</Link>
                  </Button>
                  <Button
                    variant="brand"
                    onClick={() => {
                      onEditar(aberta);
                      setAberta(null);
                    }}
                  >
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function tituloPeca(i: MapaItem, porId: Map<string, Unidade>) {
  if (i.tipo === 'unidade') return `Unidade ${porId.get(i.unidadeId!)?.numero ?? ''}`;
  if (i.tipo === 'bloco') return nomeBloco(i.bloco!);
  return i.rotulo || AREAS[i.tipo]?.nome || 'Área';
}

/** Uma peça na grade: unidade (com moradores e pendências), prédio (com o resumo do bloco) ou área comum. */
function PecaNoMapa({
  item,
  linha,
  unidade,
  unidadesDoBloco,
  itensDoBloco,
  editando,
  arrastavel,
  apagando,
  selecionada,
  onClick,
  onDragStart,
  onDragOver,
  onDrop
}: {
  item: MapaItem;
  linha: string;
  arrastavel: boolean;
  apagando: boolean;
  unidade?: Unidade;
  unidadesDoBloco: Unidade[];
  itensDoBloco: MapaItem[];
  editando: boolean;
  selecionada: boolean;
  onClick: () => void;
  onDragStart: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}) {
  const area = AREAS[item.tipo];
  const base = cn(
    'z-10 flex min-w-0 flex-col justify-between overflow-hidden rounded-lg border p-1.5 text-left transition-all',
    editando ? 'cursor-grab active:cursor-grabbing' : 'hover:-translate-y-0.5 hover:shadow-md',
    selecionada && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
    apagando && 'opacity-30'
  );
  const props = {
    type: 'button' as const,
    draggable: arrastavel,
    onDragStart,
    onDragOver,
    onDrop,
    onClick,
    style: { gridColumn: `${item.x + 1} / span ${item.largura}`, gridRow: linha }
  };

  if (item.tipo === 'rua' && item.largura === 1 && item.altura === 1) {
    // trecho de rua desenhado no pincel: sem borda nem ícone e "vazando" no espaçamento, pra emendar com os vizinhos
    return (
      <button
        {...props}
        data-rua={item.id}
        title={item.rotulo || 'Rua'}
        className={cn('z-10 -m-[3px] bg-zinc-500/55 transition-opacity', selecionada && 'ring-2 ring-primary', apagando && 'opacity-30')}
      />
    );
  }

  if (area) {
    const deitada = item.altura === 1;
    const nome = item.rotulo || area.nome;
    // peça de uma casa só: só o ícone (o nome não cabe), com o nome no title
    const miuda = item.largura === 1 && item.altura === 1;
    return (
      <button
        {...props}
        data-rua={item.tipo === 'rua' ? item.id : undefined}
        title={nome}
        className={cn(base, area.cls, deitada ? 'flex-row items-center justify-center gap-1.5' : 'items-center justify-center gap-1')}
      >
        <area.icon className={miuda ? 'h-6 w-6' : deitada ? 'h-4 w-4 shrink-0' : 'h-6 w-6'} />
        {!miuda && <span className="truncate text-[11px] font-semibold">{nome}</span>}
      </button>
    );
  }

  if (item.tipo === 'bloco') {
    const encomendas = unidadesDoBloco.reduce((s, u) => s + (u.encomendasAguardando ?? 0), 0);
    const ocorrencias = unidadesDoBloco.reduce((s, u) => s + (u.ocorrenciasAbertas ?? 0), 0);
    const ocupadas = unidadesDoBloco.filter((u) => u.moradores?.length).length;
    return (
      <button {...props} className={cn(base, 'border-primary bg-primary p-2 text-primary-foreground')}>
        <span className="flex items-center gap-1.5 font-heading text-sm font-extrabold">
          <Building2 className="h-4 w-4 shrink-0" /> <span className="truncate">{nomeBloco(item.bloco!)}</span>
        </span>
        <MiniPredio itens={itensDoBloco} unidades={unidadesDoBloco} />
        <span className="flex flex-wrap items-center gap-1 text-[10px] opacity-90">
          <span>
            {ocupadas}/{unidadesDoBloco.length} ocupadas
          </span>
          {encomendas > 0 && (
            <span className={cn(selo, 'bg-white/20')}>
              <Package className="h-3 w-3" />
              {encomendas}
            </span>
          )}
          {ocorrencias > 0 && (
            <span className={cn(selo, 'bg-destructive text-destructive-foreground')}>
              <AlertTriangle className="h-3 w-3" />
              {ocorrencias}
            </span>
          )}
        </span>
      </button>
    );
  }

  if (!unidade) return null;
  const ocupada = !!unidade.moradores?.length;
  const encomendas = unidade.encomendasAguardando ?? 0;
  const ocorrencias = unidade.ocorrenciasAbertas ?? 0;
  return (
    <button
      {...props}
      title={`${unidade.numero} · ${unidade.moradores?.join(', ') || 'sem morador'}`}
      className={cn(base, 'relative overflow-visible', ocupada ? COR.ocupada : COR.vazia)}
    >
      {/* número sempre visível em cima; pendências ficam no canto, como notificação, sem ocupar espaço */}
      <span className="truncate font-heading text-base font-extrabold leading-none">{unidade.numero}</span>
      {ocupada ? (
        <span className="flex items-center gap-0.5 text-[10px] font-medium text-success">
          <Users className="h-3 w-3" />
          {unidade.moradores!.length}
        </span>
      ) : (
        <span className="text-[10px] text-muted-foreground">vazia</span>
      )}
      {(encomendas > 0 || ocorrencias > 0) && (
        <span className="absolute -right-1.5 -top-3 flex gap-0.5">
          {encomendas > 0 && (
            <span className={cn(selo, COR.encomenda, 'px-1 shadow-sm')}>
              <Package className="h-2.5 w-2.5" />
              {encomendas}
            </span>
          )}
          {ocorrencias > 0 && (
            <span className={cn(selo, COR.ocorrencia, 'px-1 shadow-sm')}>
              <AlertTriangle className="h-2.5 w-2.5" />
              {ocorrencias}
            </span>
          )}
        </span>
      )}
    </button>
  );
}

/** Prédio por dentro: telhado com o nome, número do andar à esquerda, ocupação à direita e o térreo embaixo. */
function Fachada({
  nome,
  linhas,
  andares,
  ocupacao,
  ocupadas,
  total,
  children
}: {
  nome: string;
  linhas: number;
  andares: string[];
  ocupacao: string[];
  ocupadas: number;
  total: number;
  children: React.ReactNode;
}) {
  const coluna = (textos: string[], cls: string) => (
    <div className="grid gap-1.5" style={{ gridTemplateRows: `repeat(${linhas}, 4.5rem)` }}>
      {textos.map((t, i) => (
        <span key={i} className={cn('flex items-center text-xs font-semibold tabular-nums', cls)}>
          {t}
        </span>
      ))}
    </div>
  );
  const nAndares = andares.filter(Boolean).length;
  return (
    <div className="inline-block min-w-[16rem] overflow-hidden rounded-t-2xl border-2 border-primary/40 bg-card shadow-sm">
      <div className="flex items-center gap-2 bg-primary px-4 py-2.5 text-primary-foreground">
        <Building2 className="h-5 w-5" />
        <span className="font-heading font-extrabold">{nome}</span>
        <span className="ml-auto text-xs opacity-90">
          {nAndares ? `${nAndares} ${nAndares === 1 ? 'andar' : 'andares'} · ` : ''}
          {ocupadas}/{total} ocupadas
        </span>
      </div>
      <div className="flex gap-2 p-3">
        {coluna(andares, 'w-8 justify-end text-muted-foreground')}
        {children}
        {coluna(ocupacao, 'w-8 text-muted-foreground')}
      </div>
      <div className="mx-3 flex h-8 items-center justify-center gap-1.5 rounded-t-md border border-b-0 bg-muted text-[11px] font-medium text-muted-foreground">
        <span className="h-4 w-3 rounded-t-sm border border-muted-foreground/40 bg-background" /> Térreo · entrada
      </div>
    </div>
  );
}

/** Miniatura do bloco no mapa geral: cada apartamento é uma janelinha colorida. */
function MiniPredio({ itens, unidades }: { itens: MapaItem[]; unidades: Unidade[] }) {
  if (!itens.length) {
    return (
      <span className="my-1 flex flex-1 items-center justify-center rounded bg-white/10 text-center text-[10px] opacity-80">
        {unidades.length ? 'toque pra montar os andares' : 'bloco sem unidades — pode tirar do mapa'}
      </span>
    );
  }
  const porId = new Map(unidades.map((u) => [u.id, u]));
  const cols = Math.max(...itens.map((i) => i.x)) + 1;
  const rows = Math.max(...itens.map((i) => i.y)) + 1;
  return (
    <span
      className="my-1 grid min-h-0 flex-1 gap-[2px] rounded bg-black/15 p-[3px]"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
    >
      {itens.map((i) => {
        const u = porId.get(i.unidadeId!);
        if (!u) return null;
        const cor = u.ocorrenciasAbertas ? 'bg-red-400' : u.moradores?.length ? 'bg-emerald-300' : 'bg-white/25';
        return <span key={i.id} className={cn('rounded-[2px]', cor)} style={{ gridColumn: i.x + 1, gridRow: rows - i.y }} />; // y 0 = 1º andar, embaixo
      })}
    </span>
  );
}
