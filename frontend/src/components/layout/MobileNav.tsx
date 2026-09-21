import { AnimatePresence, motion } from 'framer-motion';
import { Building2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { navItems } from './nav-items';
import { NavLink } from './NavLink';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function MobileNav({ open, onClose }: Props) {
  const { isSindico } = useAuth();
  const links = navItems.filter((l) => !l.sindico || isSindico);

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
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-md bg-gradient-primary text-primary-foreground">
                  <Building2 className="h-5 w-5" />
                </div>
                <span className="font-heading text-sm font-extrabold">Condomínio</span>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar menu">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
              {links.map(({ to, label, icon: Icon, end }) => (
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
              ))}
            </nav>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
