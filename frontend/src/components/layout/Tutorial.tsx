import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookText,
  CalendarRange,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  Menu,
  Package,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

type Passo = {
  icon?: LucideIcon;
  /** Tela que o passo abre por trás do cartão. */
  to?: string;
  titulo: string;
  texto: string;
  /** Mesmas flags do nav-items: o passo só aparece se o módulo existir pro usuário. */
  sindico?: boolean;
  morador?: boolean;
  porteiro?: boolean;
  areasReserva?: boolean;
};

const PASSOS: Passo[] = [
  {
    icon: LayoutDashboard,
    titulo: "Painel",
    to: "/",
    texto:
      "Sua página inicial: um resumo dos chamados, reservas, encomendas e avisos que precisam da sua atenção.",
  },
  {
    icon: Wrench,
    titulo: "Chamados",
    to: "/chamados",
    sindico: true,
    texto:
      'Tudo o que os moradores pedem de manutenção cai aqui, num quadro. Arraste o card entre "Em aberto", "Pendente" e "Encerrado" para atualizar o status.',
  },
  {
    icon: Wrench,
    titulo: "Chamados",
    to: "/chamados",
    morador: true,
    texto:
      "Algo quebrou ou precisa de reparo? Abra um chamado e acompanhe o andamento até ser resolvido.",
  },
  {
    icon: Users,
    titulo: "Unidades e moradores",
    to: "/unidades",
    sindico: true,
    texto:
      "Cadastre as unidades do condomínio e vincule cada morador à sua unidade. É o primeiro passo para todo mundo usar o sistema.",
  },
  {
    icon: CalendarRange,
    titulo: "Reservas",
    to: "/reservas",
    areasReserva: true,
    sindico: true,
    texto:
      "Veja no calendário quem reservou cada área comum e aprove ou recuse os pedidos.",
  },
  {
    icon: CalendarRange,
    titulo: "Reservas",
    to: "/reservas",
    areasReserva: true,
    morador: true,
    texto:
      "Reserve o salão de festas, a churrasqueira e as outras áreas comuns direto pelo calendário.",
  },
  {
    icon: Package,
    titulo: "Encomendas",
    to: "/encomendas",
    porteiro: true,
    sindico: true,
    texto:
      "A portaria registra as entregas que chegam e o morador é avisado. Depois, é só marcar como entregue.",
  },
  {
    icon: Package,
    titulo: "Encomendas",
    to: "/encomendas",
    porteiro: true,
    morador: true,
    texto:
      "Chegou pacote na portaria? Ele aparece aqui, e você fica sabendo sem precisar descer para perguntar.",
  },
  {
    icon: Megaphone,
    titulo: "Avisos",
    to: "/avisos",
    sindico: true,
    texto:
      "Publique comunicados para o condomínio inteiro. Fixe os mais importantes para que fiquem sempre no topo.",
  },
  {
    icon: Megaphone,
    titulo: "Avisos",
    to: "/avisos",
    morador: true,
    texto:
      "Os comunicados do síndico ficam aqui. Os fixados são os mais importantes.",
  },
  {
    icon: BookText,
    titulo: "Livro de Ocorrência",
    to: "/ocorrencias",
    texto:
      "Registro de reclamações e ocorridos: barulho, segurança, convivência, danos. Fica tudo documentado.",
  },
  {
    icon: ClipboardList,
    titulo: "Manutenção predial e prestadores",
    to: "/manutencao-predial",
    sindico: true,
    texto:
      "Cadastre os equipamentos e os prestadores, monte o plano de manutenção e baixe o relatório em planilha quando precisar.",
  },
  {
    icon: Menu,
    titulo: "Menu lateral",
    texto:
      'Tudo fica no menu à esquerda (no celular, em "Menu"). Lá embaixo estão seu perfil, o modo escuro e o botão de sair.',
  },
];

/** Tutorial guiado (primeiro acesso ou botão "Ver tutorial"): cada passo abre a tela que explica,
 * num cartão flutuante que deixa a tela visível. Passos diferentes para síndico e morador. */
export function Tutorial({ onClose }: { onClose: () => void }) {
  const { usuario, isSindico, condominio } = useAuth();
  const [passo, setPasso] = useState(0);
  const navigate = useNavigate();

  const passos: Passo[] = [
    {
      to: "/",
      titulo: `Olá, ${
        usuario?.nome?.split(" ")[0] ?? ""
      }! Bem-vindo à Áquila Condomínios`,
      texto: isSindico
        ? "Eu sou a águia da Áquila e vou te mostrar em um minuto como gerenciar o seu condomínio por aqui."
        : "Eu sou a águia da Áquila e vou te mostrar em um minuto como resolver as coisas do seu condomínio por aqui.",
    },
    ...PASSOS.filter(
      (p) =>
        (!p.sindico || isSindico) &&
        (!p.morador || !isSindico) &&
        (!p.porteiro || condominio?.temPorteiro) &&
        (!p.areasReserva || condominio?.temAreasReserva)
    ),
  ];
  const atual = passos[passo];
  const ultimo = passo === passos.length - 1;
  const Icone = atual.icon;

  useEffect(() => {
    if (atual.to) navigate(atual.to);
  }, [atual.to, navigate]);

  return (
    <section
      role="dialog"
      aria-labelledby="tutorial-titulo"
      className="fixed inset-x-4 bottom-20 z-50 overflow-hidden rounded-xl border bg-card shadow-lg animate-in fade-in slide-in-from-bottom-4 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[30rem]"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar tutorial"
        className="absolute right-3 top-3 rounded-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex">
        {/* águia inteira numa coluna; o fundo é a cor da própria imagem, pra não ter emenda */}
        <div className="flex w-32 shrink-0 items-end bg-[#EEF0F5] sm:w-44">
          <img src="/brand/tutorial.jpeg" alt="" className="w-full" />
        </div>

        <div className="min-w-0 flex-1 space-y-2 p-5 pr-9">
          <div className="flex items-center gap-2">
            {Icone && (
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Icone className="h-4 w-4" />
              </span>
            )}
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {passo + 1} de {passos.length}
            </p>
          </div>
          <h2
            id="tutorial-titulo"
            className="font-heading text-lg font-bold leading-snug tracking-tight"
          >
            {atual.titulo}
          </h2>
          <p className="text-sm text-muted-foreground">{atual.texto}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t px-5 py-3">
        <div className="flex gap-1.5" aria-hidden>
          {passos.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full bg-border transition-all",
                i === passo ? "w-5 bg-primary" : "w-1.5"
              )}
            />
          ))}
        </div>
        <div className="flex gap-2">
          {passo === 0 ? (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Pular
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPasso(passo - 1)}
            >
              Voltar
            </Button>
          )}
          <Button
            variant="brand"
            size="sm"
            onClick={ultimo ? onClose : () => setPasso(passo + 1)}
          >
            {ultimo ? "Começar" : "Próximo"}
          </Button>
        </div>
      </div>
    </section>
  );
}
