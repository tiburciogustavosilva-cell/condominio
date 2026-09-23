import {
  LayoutDashboard,
  Wrench,
  CalendarRange,
  Package,
  Megaphone,
  HardHat,
  ClipboardList,
  Users,
  Building2,
  type LucideIcon
} from 'lucide-react';

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  sindico?: boolean;
  /** Só aparece se o condomínio tiver porteiro (ver /perguntas-condominio). */
  porteiro?: boolean;
};

export const navItems: NavItem[] = [
  { to: '/', label: 'Painel', icon: LayoutDashboard, end: true },
  { to: '/chamados', label: 'Chamados', icon: Wrench },
  { to: '/reservas', label: 'Reservas', icon: CalendarRange },
  { to: '/encomendas', label: 'Encomendas', icon: Package, porteiro: true },
  { to: '/avisos', label: 'Avisos', icon: Megaphone },
  { to: '/prestadores', label: 'Prestadores', icon: HardHat, sindico: true },
  { to: '/manutencao-predial', label: 'Manutenção Predial', icon: ClipboardList, sindico: true },
  { to: '/moradores', label: 'Moradores', icon: Users, sindico: true },
  { to: '/unidades', label: 'Unidades', icon: Building2, sindico: true }
];

/** Barra inferior (mobile) — no máximo 5 itens. */
export const bottomNavItems: NavItem[] = [
  navItems[0],
  navItems[1],
  navItems[2],
  navItems[3],
  navItems[4]
];
