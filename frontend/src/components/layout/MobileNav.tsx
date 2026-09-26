import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Brand } from '@/components/shared/Brand';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { itemVisivel, navItems } from './nav-items';
import { NavLink } from './NavLink';
import { SidebarFooter } from './SidebarFooter';

type Props = {
  open: boolean;
  onClose: () => void;
  onTutorial: () => void;
};

export function MobileNav({ open, onClose, onTutorial }: Props) {
  const auth = useAuth();
  const links = navItems.filter((l) => itemVisivel(l, auth));

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            className="absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar text-sidebar-foreground shadow-lg"
          >
            <div className="flex h-16 items-center justify-between px-4">
              <Brand />
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar menu">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
              {links.map(({ to, label, icon: Icon, end, emBreve }) =>
                emBreve ? (
                  <div
                    key={to}
                    aria-disabled="true"
                    className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground opacity-60"
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {label}
                    <Badge variant="muted" className="ml-auto text-[10px]">
                      Em breve
                    </Badge>
                  </div>
                ) : (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
                    )}
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {label}
                  </NavLink>
                )
              )}
            </nav>
            <SidebarFooter onTutorial={onTutorial} />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
