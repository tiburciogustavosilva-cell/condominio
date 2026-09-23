import { motion } from 'framer-motion';
import { Building2, ChevronLeft, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { iniciais } from '@/lib/format';
import { navItems } from './nav-items';
import { NavLink } from './NavLink';

type Props = {
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export function AppSidebar({ collapsed, onToggleCollapse }: Props) {
  const { usuario, isSindico, condominio, logout } = useAuth();
  const navigate = useNavigate();
  const links = navItems.filter((l) => (!l.sindico || isSindico) && (!l.porteiro || condominio?.temPorteiro));

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex"
    >
      {/* marca */}
      <div className={cn('flex h-16 items-center gap-2 px-4', collapsed && 'justify-center px-0')}>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gradient-primary text-primary-foreground shadow-glow">
          <Building2 className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate font-heading text-sm font-extrabold leading-tight">Condomínio</p>
            <p className="truncate text-xs text-muted-foreground">Gestão</p>
          </div>
        )}
      </div>

      {/* navegação */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 no-scrollbar">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={cn(
              'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
              collapsed && 'justify-center px-0'
            )}
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shadow-sm"
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* rodapé */}
      <div className="border-t border-sidebar-border p-3">
        <div
          className={cn(
            'mb-2 flex items-center gap-3 rounded-md px-2 py-2',
            collapsed && 'justify-center px-0'
          )}
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
            {iniciais(usuario?.nome)}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{usuario?.nome}</p>
              <p className="truncate text-xs capitalize text-muted-foreground">{usuario?.papel}</p>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          className={cn('w-full text-muted-foreground', !collapsed && 'justify-start')}
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && 'Sair'}
        </Button>
      </div>

      {/* colapsar */}
      <button
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        className="absolute -right-3 top-16 grid h-6 w-6 place-items-center rounded-full border bg-background text-muted-foreground shadow-sm transition-transform hover:text-foreground"
      >
        <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
      </button>
    </motion.aside>
  );
}
