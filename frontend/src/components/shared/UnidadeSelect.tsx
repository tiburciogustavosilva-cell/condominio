import { useEffect, useRef, useState } from 'react';
import { rotuloUnidade } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

type UnidadeLeve = { id: string; numero: string; bloco: string };

type Props<T extends UnidadeLeve> = {
  unidades: T[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  /** Rótulo de uma opção "vazia" selecionável (ex.: "Sem unidade"). Sem isso, só aceita uma unidade real. */
  opcaoVazia?: string;
  id?: string;
  className?: string;
  /** Só quando não tem `<Field label>` por perto — senão o `id`/`htmlFor` já basta. */
  ariaLabel?: string;
};

/**
 * Combobox de unidade: clica pra escolher da lista ou digita pra filtrar por
 * bloco/número. Substitui o `<select>` simples em todo lugar que escolhe
 * unidade — mais rápido de achar quando o condomínio tem muitas.
 */
export function UnidadeSelect<T extends UnidadeLeve>({
  unidades,
  value,
  onChange,
  placeholder = 'Buscar unidade…',
  opcaoVazia,
  id,
  className,
  ariaLabel
}: Props<T>) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
        setBusca('');
      }
    }
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, []);

  const opcoes: { id: string; label: string }[] = [
    ...(opcaoVazia !== undefined ? [{ id: '', label: opcaoVazia }] : []),
    ...unidades.map((u) => ({ id: u.id, label: rotuloUnidade(u) ?? u.id }))
  ];
  const termo = busca.trim().toLowerCase();
  const filtradas = termo ? opcoes.filter((o) => o.label.toLowerCase().includes(termo)) : opcoes;
  const selecionada = opcoes.find((o) => o.id === value);

  function selecionar(o: { id: string; label: string }) {
    onChange(o.id);
    setBusca('');
    setAberto(false);
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Input
        id={id}
        autoComplete="off"
        role="combobox"
        aria-expanded={aberto}
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={aberto ? busca : (selecionada?.label ?? '')}
        onFocus={() => setAberto(true)}
        onChange={(e) => {
          setBusca(e.target.value);
          if (!aberto) setAberto(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setAberto(false);
            setBusca('');
          }
          if (e.key === 'Enter' && filtradas.length === 1) {
            e.preventDefault();
            selecionar(filtradas[0]);
          }
        }}
      />
      {aberto && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg">
          {filtradas.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">Nenhuma unidade encontrada</p>
          ) : (
            filtradas.map((o) => (
              <button
                key={o.id || '__vazio__'}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selecionar(o)}
                className={cn(
                  'block w-full rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                  o.id === value && 'bg-accent/60 font-medium'
                )}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
