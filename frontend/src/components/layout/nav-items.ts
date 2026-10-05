import {
  LayoutDashboard,
  Wrench,
  CalendarRange,
  Package,
  Megaphone,
  BookText,
  ClipboardList,
  ClipboardCheck,
  Users,
  IdCard,
  Building2,
  Vote,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import type { Condominio } from "@/types/condominio";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  sindico?: boolean;
  /** Só aparece se o condomínio tiver porteiro (ver /perguntas-condominio). */
  porteiro?: boolean;
  /** Só aparece se o condomínio tiver área que precisa de reserva. */
  areasReserva?: boolean;
  /** Aparece desabilitado com o selo "Em breve", mesmo que a página exista. */
  emBreve?: boolean;
  /** Funcionário só enxerga itens marcados: true = qualquer cargo; 'portaria' = só porteiro. */
  funcionario?: true | "portaria";
  /** Só equipe interna (síndico/administradora e funcionários) — condômino não vê. */
  staff?: boolean;
  /** Título de seção no menu, separando o que é configurado uma vez do uso diário. */
  grupo?: string;
  /** Módulo do plano: some se o condomínio não o tiver (durante o teste, tem todos). */
  recurso?: string;
};

type Contexto = {
  isSindico: boolean;
  isFuncionario: boolean;
  isEquipe: boolean;
  condominio: Condominio | null;
};

export function itemVisivel(
  l: NavItem,
  { isSindico, isFuncionario, isEquipe, condominio }: Contexto
) {
  return (
    (!isFuncionario ||
      l.funcionario === true ||
      (l.funcionario === "portaria" && isEquipe)) &&
    (!l.sindico || isSindico) &&
    (!l.staff || isSindico || isFuncionario) &&
    (!l.porteiro || !!condominio?.temPorteiro) &&
    (!l.areasReserva || !!condominio?.temAreasReserva) &&
    (!l.recurso || !!condominio?.acesso?.recursos.includes(l.recurso))
  );
}

export const navItems: NavItem[] = [
  { to: "/", label: "Painel", icon: LayoutDashboard, end: true },
  {
    to: "/encomendas",
    label: "Encomendas",
    icon: Package,
    porteiro: true,
    funcionario: "portaria",
    recurso: "encomendas",
  },
  {
    to: "/tarefas",
    label: "Tarefas",
    icon: ClipboardCheck,
    staff: true,
    funcionario: true,
    recurso: "tarefas",
  },
  //{ to: "/chamados", label: "Chamados", icon: Wrench, emBreve: true },
  /*
  {
    to: "/reservas",
    label: "Reservas",
    icon: CalendarRange,
    areasReserva: true,
  },
  */
  { to: "/avisos", label: "Avisos", icon: Megaphone, funcionario: true, recurso: "avisos" },
  { to: "/ocorrencias", label: "Livro de Ocorrência", icon: BookText, recurso: "ocorrencias" },
  { to: "/votacoes", label: "Votações", icon: Vote, recurso: "assembleias" },
  {
    to: "/manutencao-predial",
    label: "Manutenção Predial",
    icon: ClipboardList,
    sindico: true,
    emBreve: false,
    recurso: "manutencoes",
  },
  { to: "/unidades", label: "Unidades", icon: Building2, sindico: true, grupo: "Cadastros" },
  { to: "/moradores", label: "Moradores", icon: Users, sindico: true, grupo: "Cadastros" },
  { to: "/funcionarios", label: "Funcionários", icon: IdCard, sindico: true, grupo: "Cadastros", recurso: "funcionarios" },
  { to: "/plano", label: "Meu plano", icon: CreditCard, sindico: true, grupo: "Conta" },
];

/** Título a mostrar antes do item i, se ele abre um grupo novo. */
export function tituloGrupo(links: NavItem[], i: number) {
  const g = links[i].grupo;
  return g && g !== links[i - 1]?.grupo ? g : null;
}

/** A tela está no menu deste usuário (e não é "Em breve")? Tutorial e Painel seguem isso. */
export function rotaVisivel(to: string, ctx: Contexto) {
  return navItems.some((n) => n.to === to && !n.emBreve && itemVisivel(n, ctx));
}

/** Barra inferior (mobile) — os 4 primeiros itens que o usuário enxerga; o 5º é o botão "Menu". */
export function bottomNavItems(ctx: Contexto) {
  return navItems.filter((l) => !l.emBreve && itemVisivel(l, ctx)).slice(0, 4);
}
