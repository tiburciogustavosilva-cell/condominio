import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

/** Campo de busca com lupa (mesmo visual de Encomendas). */
export function BuscaInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input type="search" className="pl-9" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** true se algum dos textos contém o termo (sem diferenciar maiúsculas). */
export function bate(termo: string, ...textos: (string | null | undefined)[]) {
  const t = termo.trim().toLowerCase();
  return !t || textos.join(' ').toLowerCase().includes(t);
}
