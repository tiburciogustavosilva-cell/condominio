import {
  LayoutDashboard,
  Wrench,
  CalendarRange,
  Package,
  Megaphone,
  BookText,
  HardHat,
  ClipboardList,
  Users,
  IdCard,
  Building2,
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
    (!l.porteiro || !!condominio?.temPorteiro) &&
    (!l.areasReserva || !!condominio?.temAreasReserva)
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
  },
  { to: "/chamados", label: "Chamados", icon: Wrench, emBreve: true },
  {
    to: "/reservas",
    label: "Reservas",
    icon: CalendarRange,
    areasReserva: true,
  },

  { to: "/avisos", label: "Avisos", icon: Megaphone, funcionario: true },
  { to: "/ocorrencias", label: "Livro de Ocorrência", icon: BookText },
  { to: "/prestadores", label: "Prestadores", icon: HardHat, sindico: true },
  {
    to: "/manutencao-predial",
    label: "Manutenção Predial",
    icon: ClipboardList,
    sindico: true,
    emBreve: true,
  },
  { to: "/moradores", label: "Moradores", icon: Users, sindico: true },
  { to: "/funcionarios", label: "Funcionários", icon: IdCard, sindico: true },
  { to: "/unidades", label: "Unidades", icon: Building2, sindico: true },
];

/** Barra inferior (mobile) — no máximo 4 itens; o 5º é o botão "Menu" que abre o drawer. */
export const bottomNavItems: NavItem[] = navItems
  .filter((l) => !l.emBreve)
  .slice(0, 4);
