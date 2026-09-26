import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { itemVisivel, bottomNavItems } from './nav-items';
import { NavLink } from './NavLink';

export function BottomNav({ onMenu }: { onMenu: () => void }) {
  const auth = useAuth();
  const items = bottomNavItems.filter((l) => itemVisivel(l, auth));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden">
      <ul
        className="mx-auto grid max-w-md"
        style={{ gridTemplateColumns: `repeat(${items.length + 1}, minmax(0, 1fr))` }}
      >
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={cn(
                'flex flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors'
              )}
              activeClassName="text-primary"
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{label}</span>
            </NavLink>
          </li>
        ))}
        <li>
          <button
            onClick={onMenu}
            className="flex w-full flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors"
          >
            <Menu className="h-5 w-5" />
            <span className="truncate">Menu</span>
          </button>
        </li>
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
