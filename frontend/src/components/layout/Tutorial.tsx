import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookText,
  Building2,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  IdCard,
  LayoutDashboard,
  Megaphone,
  Menu,
  Package,
  Vote,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { rotaVisivel } from "./nav-items";

type Papel = "sindico" | "morador" | "funcionario";

type Passo = {
  icon?: LucideIcon;
  /** Tela que o passo abre por trás do cartão. O passo só aparece se essa tela estiver no menu do usuário. */
  to?: string;
  titulo: string;
  texto: string;
  /** Para quem é este texto; sem isso, vale para todos. */
  para?: Papel[];
};

const PASSOS: Passo[] = [
  {
    icon: LayoutDashboard,
    titulo: "Painel",
    to: "/",
    texto:
      "Sua página inicial: um resumo do que precisa da sua atenção hoje.",
  },
  {
    icon: Wrench,
    titulo: "Chamados",
    to: "/chamados",
    para: ["sindico"],
    texto:
      'Tudo o que os moradores pedem de manutenção cai aqui, num quadro. Arraste o card entre "Em aberto", "Pendente" e "Encerrado" para atualizar o status.',
  },
  {
    icon: Wrench,
    titulo: "Chamados",
    to: "/chamados",
    para: ["morador"],
    texto:
      "Algo quebrou ou precisa de reparo? Abra um chamado e acompanhe o andamento até ser resolvido.",
  },
  {
    icon: Building2,
    titulo: "Unidades e moradores",
    to: "/unidades",
    para: ["sindico"],
    texto:
      "Cadastre as unidades e vincule cada morador à sua unidade — um a um ou de uma vez, importando a planilha modelo (.xlsx). É o primeiro passo para todo mundo usar o sistema.",
  },
  {
    icon: IdCard,
    titulo: "Funcionários",
    to: "/funcionarios",
    para: ["sindico"],
    texto:
      "Cadastre porteiros, zeladores e a equipe de limpeza. O cargo define o que cada um acessa no sistema.",
  },
  {
    icon: ClipboardCheck,
    titulo: "Tarefas",
    to: "/tarefas",
    para: ["sindico"],
    texto:
      "Monte a rotina de cada cargo e acompanhe o que foi feito, com a foto de cada serviço.",
  },
  {
    icon: ClipboardCheck,
    titulo: "Tarefas",
    to: "/tarefas",
    para: ["funcionario"],
    texto:
      "Aqui está o que precisa ser feito hoje. Marque cada tarefa como feita e tire uma foto do serviço.",
  },
  {
    icon: CalendarRange,
    titulo: "Reservas",
    to: "/reservas",
    para: ["sindico"],
    texto:
      "Veja no calendário quem reservou cada área comum e aprove ou recuse os pedidos.",
  },
  {
    icon: CalendarRange,
    titulo: "Reservas",
    to: "/reservas",
    para: ["morador"],
    texto:
      "Reserve o salão de festas, a churrasqueira e as outras áreas comuns direto pelo calendário.",
  },
  {
    icon: Package,
    titulo: "Encomendas",
    to: "/encomendas",
    para: ["sindico", "funcionario"],
    texto:
      "A portaria registra as entregas que chegam e o morador é avisado. Depois, é só marcar como entregue.",
  },
  {
    icon: Package,
    titulo: "Encomendas",
    to: "/encomendas",
    para: ["morador"],
    texto:
      "Chegou pacote na portaria? Ele aparece aqui, e você fica sabendo sem precisar descer para perguntar.",
  },
  {
    icon: Megaphone,
    titulo: "Avisos",
    to: "/avisos",
    para: ["sindico"],
    texto:
      "Publique comunicados para o condomínio inteiro. Fixe os mais importantes para que fiquem sempre no topo.",
  },
  {
    icon: Megaphone,
    titulo: "Avisos",
    to: "/avisos",
    para: ["morador", "funcionario"],
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
    icon: Vote,
    titulo: "Votações",
    to: "/votacoes",
    para: ["sindico"],
    texto:
      "Crie a assembleia com as pautas, projete o código de presença na reunião e abra a votação de cada pauta. Você define quem vota em cada uma: proprietário, inquilino ou procurador.",
  },
  {
    icon: Vote,
    titulo: "Votações",
    to: "/votacoes",
    para: ["morador"],
    texto:
      "Na assembleia, entre por aqui, digite o código mostrado na tela e vote em cada pauta pelo celular.",
  },
  {
    icon: ClipboardList,
    titulo: "Manutenção predial",
    to: "/manutencao-predial",
    para: ["sindico"],
    texto:
      "Cadastre os equipamentos e os prestadores, monte o plano de manutenção e registre as ordens de serviço. Os prestadores recebem por e-mail o lembrete de cada manutenção, e o relatório sai em planilha.",
  },
  {
    icon: Menu,
    titulo: "Menu lateral",
    texto:
      'Tudo fica no menu à esquerda (no celular, em "Menu"). Lá embaixo estão seu perfil, o modo escuro e o botão de sair.',
  },
];

/** Tutorial guiado (primeiro acesso ou botão "Ver tutorial"): cada passo abre a tela que explica,
 * num cartão flutuante que deixa a tela visível. Passos diferentes para síndico, morador e funcionário. */
export function Tutorial({ onClose }: { onClose: () => void }) {
  const { usuario, isSindico, isFuncionario, isEquipe, condominio } = useAuth();
  const papel: Papel = isSindico ? "sindico" : isFuncionario ? "funcionario" : "morador";
  const ctx = { isSindico, isFuncionario, isEquipe, condominio };
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
        (!p.para || p.para.includes(papel)) &&
        // segue o menu: se a tela saiu do menu (ou é "Em breve"), o passo some junto
        (!p.to || rotaVisivel(p.to, ctx))
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
