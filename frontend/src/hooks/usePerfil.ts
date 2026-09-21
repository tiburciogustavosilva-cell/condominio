import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Perfil } from '@/types/condominio';

export function usePerfil() {
  const { usuario, atualizarNome } = useAuth();
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  const recarregar = useCallback(async () => {
    if (!usuario) return;
    const [{ data: authData }, { data: prof, error }] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('profiles')
        .select('nome, telefone, papel, unidades:unidade_id ( bloco, numero )')
        .eq('id', usuario.id)
        .maybeSingle()
    ]);
    if (error || !prof) return;
    const unidade = prof.unidades as unknown as { bloco: string; numero: string } | null;
    setPerfil({
      id: usuario.id,
      nome: prof.nome,
      email: authData.user?.email ?? '',
      telefone: prof.telefone,
      papel: prof.papel,
      unidade: unidade ? { bloco: unidade.bloco, numero: unidade.numero } : null
    });
  }, [usuario]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function atualizarDados(dados: { nome: string; telefone: string }) {
    if (!usuario) throw new Error('Sessão inválida');
    const { data, error } = await supabase
      .from('profiles')
      .update({ nome: dados.nome, telefone: dados.telefone })
      .eq('id', usuario.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    atualizarNome(data.nome);
    setPerfil((p) => (p ? { ...p, nome: data.nome, telefone: data.telefone } : p));
    return data;
  }

  async function trocarSenha(senhaAtual: string, novaSenha: string) {
    const { data: authData } = await supabase.auth.getUser();
    const email = authData.user?.email;
    if (email) {
      const { error: erroReauth } = await supabase.auth.signInWithPassword({ email, password: senhaAtual });
      if (erroReauth) throw new Error('Senha atual incorreta');
    }
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) throw new Error(error.message);
  }

  return { perfil, carregando: perfil === null, recarregar, atualizarDados, trocarSenha };
}
