import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { AppSidebar } from './AppSidebar';
import { BottomNav } from './BottomNav';
import { MobileNav } from './MobileNav';
import { Tutorial } from './Tutorial';

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar:collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tutorialAberto, setTutorialAberto] = useState(false);
  const location = useLocation();
  const { usuario, concluirTutorial } = useAuth();

  useEffect(() => {
    localStorage.setItem('sidebar:collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  return (
    <div className="app-surface min-h-screen">
      <AppSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        onTutorial={() => setTutorialAberto(true)}
      />
      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onTutorial={() => {
          setMobileOpen(false);
          setTutorialAberto(true);
        }}
      />

      <div className={cn('transition-[padding] duration-300', collapsed ? 'lg:pl-[72px]' : 'lg:pl-64')}>
        {/* conteúdo */}
        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 lg:px-6 lg:pb-10">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <BottomNav onMenu={() => setMobileOpen(true)} />
      {tutorialAberto ? (
        <Tutorial onClose={() => setTutorialAberto(false)} />
      ) : (
        usuario && !usuario.tutorialVisto && <Tutorial onClose={concluirTutorial} />
      )}
    </div>
  );
}
