import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Brand } from '@/components/shared/Brand';

/** Aberta pelo link do e-mail de cadastro: confirma o e-mail e já entra. */
export default function ConfirmarEmail() {
  const [params] = useSearchParams();
  const [erro, setErro] = useState('');
  const { confirmarEmail } = useAuth();
  const navigate = useNavigate();
  const feito = useRef(false); // StrictMode roda o efeito 2x em dev

  useEffect(() => {
    if (feito.current) return;
    feito.current = true;
    confirmarEmail(params.get('token') ?? '')
      .then(() => {
        toast.success('E-mail confirmado! Bem-vindo(a).');
        navigate('/', { replace: true });
      })
      .catch((err) => setErro(err instanceof Error ? err.message : 'Não foi possível confirmar o e-mail'));
  }, [confirmarEmail, navigate, params]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6 app-surface">
      <div className="w-full max-w-md">
        <Brand className="mb-6" />
        <Card className="space-y-4 p-8 text-center shadow-md">
          {erro ? (
            <>
              <p className="text-sm text-destructive">{erro}</p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Ir para o login</Link>
              </Button>
            </>
          ) : (
            <p className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Confirmando seu e-mail…
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
