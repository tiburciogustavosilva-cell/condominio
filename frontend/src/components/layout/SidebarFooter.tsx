import { CircleHelp, LogOut, Moon, Repeat, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { iniciais } from '@/lib/format';

/** Rodapé do menu lateral (desktop e drawer mobile): usuário, trocar condomínio, tutorial, tema, sair. */
export function SidebarFooter({ collapsed = false, onTutorial }: { collapsed?: boolean; onTutorial: () => void }) {
  const { usuario, isAdministradora, condominio, logout } = useAuth();
  const { tema, alternar } = useTheme();
  const navigate = useNavigate();
  const acao = cn('w-full text-muted-foreground', !collapsed && 'justify-start');
  const size = collapsed ? 'icon' : 'sm';

  return (
    <div className="border-t border-sidebar-border p-3">
      <div className={cn('mb-2 flex items-center gap-3 rounded-md px-2 py-2', collapsed && 'justify-center px-0')}>
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
          {iniciais(usuario?.nome)}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{usuario?.nome}</p>
            <p className="truncate text-xs capitalize text-muted-foreground">{usuario?.papel}</p>
            {isAdministradora && condominio && <p className="truncate text-xs text-muted-foreground">{condominio.nome}</p>}
          </div>
        )}
      </div>

      {isAdministradora && (
        <Button variant="ghost" size={size} className={acao} onClick={() => navigate('/meus-condominios')} title={collapsed ? 'Trocar condomínio' : undefined}>
          <Repeat className="h-4 w-4" />
          {!collapsed && 'Trocar condomínio'}
        </Button>
      )}

      <Button variant="ghost" size={size} className={acao} onClick={onTutorial} title={collapsed ? 'Ver tutorial' : undefined}>
        <CircleHelp className="h-4 w-4" />
        {!collapsed && 'Ver tutorial'}
      </Button>

      <Button
        variant="ghost"
        size={size}
        className={acao}
        onClick={alternar}
        title={collapsed ? (tema === 'dark' ? 'Modo claro' : 'Modo escuro') : undefined}
      >
        {tema === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        {!collapsed && (tema === 'dark' ? 'Modo claro' : 'Modo escuro')}
      </Button>

      <Button
        variant="ghost"
        size={size}
        className={acao}
        title={collapsed ? 'Sair' : undefined}
        onClick={() => {
          logout();
          navigate('/login');
        }}
      >
        <LogOut className="h-4 w-4" />
        {!collapsed && 'Sair'}
      </Button>
    </div>
  );
}
