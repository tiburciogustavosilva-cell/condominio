import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { NovaPauta } from '@/hooks/useAssembleias';
import { LABEL, type Vinculo } from '@/types/condominio';
import { Field } from '@/components/shared/Field';
import { BotaoDitado, juntarDitado } from '@/components/shared/BotaoDitado';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const VINCULOS: Vinculo[] = ['proprietario', 'inquilino', 'procurador'];

export const PAUTA_VAZIA: NovaPauta = {
  titulo: '',
  descricao: '',
  opcoes: ['Sim', 'Não', 'Abstenção'],
  vinculosPermitidos: [...VINCULOS]
};

type Props = {
  id: string;
  pauta: NovaPauta;
  onChange: (pauta: NovaPauta) => void;
};

/** Título, explicação e opções de voto de uma pauta (padrão Sim / Não / Abstenção). */
export function CamposPauta({ id, pauta, onChange }: Props) {
  const [novaOpcao, setNovaOpcao] = useState('');
  const set = (campos: Partial<NovaPauta>) => onChange({ ...pauta, ...campos });

  function adicionarOpcao() {
    const texto = novaOpcao.trim();
    if (texto && !pauta.opcoes.includes(texto)) set({ opcoes: [...pauta.opcoes, texto] });
    setNovaOpcao('');
  }

  return (
    <div className="space-y-3">
      <Field label="O que vai ser votado" htmlFor={`${id}-titulo`}>
        <Input
          id={`${id}-titulo`}
          placeholder="Ex.: Pintura da fachada"
          value={pauta.titulo}
          onChange={(e) => set({ titulo: e.target.value })}
          required
        />
      </Field>
      <Field label="Explicação (opcional)" htmlFor={`${id}-desc`}>
        <div className="flex gap-2">
          <Input id={`${id}-desc`} value={pauta.descricao} onChange={(e) => set({ descricao: e.target.value })} />
          <BotaoDitado onTexto={(texto) => set({ descricao: juntarDitado(pauta.descricao, texto) })} />
        </div>
      </Field>
      <Field label="Opções de voto" htmlFor={`${id}-opcao`} hint="Mínimo de 2 opções.">
        <div className="flex flex-wrap gap-2">
          {pauta.opcoes.map((opcao) => (
            <span
              key={opcao}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold"
            >
              {opcao}
              <button
                type="button"
                onClick={() => set({ opcoes: pauta.opcoes.filter((o) => o !== opcao) })}
                disabled={pauta.opcoes.length <= 2}
                className="rounded-full text-muted-foreground hover:text-foreground disabled:opacity-40"
                aria-label={`Remover opção ${opcao}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            id={`${id}-opcao`}
            placeholder="Outra opção"
            value={novaOpcao}
            onChange={(e) => setNovaOpcao(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                adicionarOpcao();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={adicionarOpcao} disabled={!novaOpcao.trim()}>
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
      </Field>
      <Field
        label="Quem pode votar"
        htmlFor={`${id}-vinculo-proprietario`}
        hint="Por padrão todos podem. Desmarque pra deixar essa pauta só pra alguns vínculos."
      >
        <div className="flex flex-wrap gap-4">
          {VINCULOS.map((v) => (
            <label key={v} htmlFor={`${id}-vinculo-${v}`} className="flex items-center gap-2 text-sm">
              <input
                id={`${id}-vinculo-${v}`}
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={pauta.vinculosPermitidos.includes(v)}
                disabled={pauta.vinculosPermitidos.length <= 1 && pauta.vinculosPermitidos.includes(v)}
                onChange={(e) =>
                  set({
                    vinculosPermitidos: e.target.checked
                      ? [...pauta.vinculosPermitidos, v]
                      : pauta.vinculosPermitidos.filter((x) => x !== v)
                  })
                }
              />
              {LABEL.vinculo[v]}
            </label>
          ))}
        </div>
      </Field>
    </div>
  );
}
