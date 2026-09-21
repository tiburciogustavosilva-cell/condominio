import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { iniciais } from '@/lib/format';
import { navItems } from './nav-items';
import { AppSidebar } from './AppSidebar';
import { BottomNav } from './BottomNav';
import { MobileNav } from './MobileNav';

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar:collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { usuario } = useAuth();
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem('sidebar:collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  const secao =
    navItems.find((n) => (n.end ? n.to === location.pathname : location.pathname.startsWith(n.to)))
      ?.label ?? 'Painel';

  return (
    <div className="app-surface min-h-screen">
      <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} />
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className={cn('transition-[padding] duration-300', collapsed ? 'lg:pl-[72px]' : 'lg:pl-64')}>
        {/* topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-heading text-base font-extrabold tracking-tight lg:text-lg">{secao}</h1>
          <div className="ml-auto flex items-center gap-1">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
              {iniciais(usuario?.nome)}
            </div>
          </div>
        </header>

        {/* conteúdo */}
        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 lg:px-6 lg:pb-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
