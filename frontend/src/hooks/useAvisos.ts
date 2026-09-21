import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Aviso } from '@/types/condominio';

const SELECT = 'id, titulo, mensagem, fixado, autor_id, criado_em, profiles ( nome )';

function mapAviso(row: any): Aviso {
  return {
    id: row.id,
    titulo: row.titulo,
    mensagem: row.mensagem,
    fixado: row.fixado,
    autorId: row.autor_id,
    autorNome: row.profiles?.nome ?? 'Síndico',
    criadoEm: row.criado_em
  };
}

export function useAvisos() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('avisos')
      .select(SELECT)
      .order('fixado', { ascending: false })
      .order('criado_em', { ascending: false });
    setAvisos(error || !data ? [] : data.map(mapAviso));
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return {
    avisos,
    carregando,
    recarregar,
    criar: async (dados: { titulo: string; mensagem: string; fixado: boolean }) => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão inválida');
      const { error } = await supabase.from('avisos').insert({ ...dados, autor_id: user.id });
      if (error) throw new Error(error.message);
    },
    atualizar: async (id: string, dados: { fixado?: boolean; titulo?: string; mensagem?: string }) => {
      const { error } = await supabase.from('avisos').update(dados).eq('id', id);
      if (error) throw new Error(error.message);
    },
    remover: async (id: string) => {
      const { error } = await supabase.from('avisos').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }
  };
}
