import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function RequireAuth() {
  const { usuario, carregando } = useAuth();
  const location = useLocation();

  if (carregando) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }
  if (!usuario) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

export function RequireSindico() {
  const { isSindico } = useAuth();
  if (!isSindico) return <Navigate to="/" replace />;
  return <Outlet />;
}
