import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Vote } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { AssembleiaResumo } from '@/types/condominio';

/**
 * Faixa grande no topo de qualquer tela quando há assembleia acontecendo: o condômino não precisa
 * achar "Votações" no menu. Some dentro da própria assembleia.
 */
export function AvisoAssembleia() {
  const { usuario, isSindico, isFuncionario } = useAuth();
  const { pathname } = useLocation();
  const [abertas, setAbertas] = useState<AssembleiaResumo[]>([]);
  const participa = !!usuario && !isSindico && !isFuncionario;

  useEffect(() => {
    if (!participa) return;
    api
      .get<AssembleiaResumo[]>('/assembleias')
      .then((lista) => setAbertas(lista.filter((a) => a.status === 'aberta')))
      .catch(() => setAbertas([]));
  }, [participa, pathname]);

  const assembleia = abertas[0];
  if (!participa || !assembleia || pathname.startsWith(`/votacoes/`)) return null;

  return (
    <Link
      to={`/votacoes/${assembleia.id}`}
      className="mb-6 flex items-center gap-4 rounded-xl bg-primary p-5 text-primary-foreground shadow-md transition-opacity hover:opacity-95"
    >
      <Vote className="h-10 w-10 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold leading-tight">Assembleia acontecendo agora</p>
        <p className="truncate text-base opacity-90">{assembleia.titulo}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1 rounded-lg bg-primary-foreground px-4 py-3 text-base font-bold text-primary">
        Entrar <ArrowRight className="h-5 w-5" aria-hidden />
      </span>
    </Link>
  );
}
