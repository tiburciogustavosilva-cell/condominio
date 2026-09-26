import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { Brand } from '@/components/shared/Brand';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { itemVisivel, navItems } from './nav-items';
import { NavLink } from './NavLink';
import { SidebarFooter } from './SidebarFooter';

type Props = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onTutorial: () => void;
};

export function AppSidebar({ collapsed, onToggleCollapse, onTutorial }: Props) {
  const auth = useAuth();
  const links = navItems.filter((l) => itemVisivel(l, auth));

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex"
    >
      {/* marca */}
      <div className={cn('flex h-16 items-center gap-2 px-4', collapsed && 'justify-center px-0')}>
        <Brand compact={collapsed} />
      </div>

      {/* navegação */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 no-scrollbar">
        {links.map(({ to, label, icon: Icon, end, emBreve }) =>
          emBreve ? (
            <div
              key={to}
              aria-disabled="true"
              title={collapsed ? `${label} (em breve)` : undefined}
              className={cn(
                'flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground opacity-60',
                collapsed && 'justify-center px-0'
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && (
                <>
                  <span className="truncate">{label}</span>
                  <Badge variant="muted" className="ml-auto text-[10px]">
                    Em breve
                  </Badge>
                </>
              )}
            </div>
          ) : (
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
          )
        )}
      </nav>

      <SidebarFooter collapsed={collapsed} onTutorial={onTutorial} />

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
