import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { Perfil } from '@/types/condominio';

export function usePerfil() {
  const { usuario, atualizarNome } = useAuth();
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  const recarregar = useCallback(async () => {
    if (!usuario) return;
    setPerfil(await api.get<Perfil>('/perfil').catch(() => null));
  }, [usuario]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function atualizarDados(dados: { nome: string; telefone: string }) {
    const data = await api.put<{ nome: string; telefone: string | null }>('/perfil', dados);
    atualizarNome(data.nome);
    setPerfil((p) => (p ? { ...p, nome: data.nome, telefone: data.telefone } : p));
    return data;
  }

  async function trocarSenha(senhaAtual: string, novaSenha: string) {
    await api.put('/perfil/senha', { senhaAtual, novaSenha });
  }

  return { perfil, carregando: perfil === null, recarregar, atualizarDados, trocarSenha };
}
