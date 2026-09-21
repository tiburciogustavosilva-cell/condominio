import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Papel } from '@/types/condominio';

export type Usuario = {
  id: string;
  nome: string;
  papel: Papel;
  unidadeId: string | null;
};

type AuthValue = {
  usuario: Usuario | null;
  isSindico: boolean;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Atualiza só o nome exibido (topbar/sidebar) após editar o perfil. */
  atualizarNome: (nome: string) => void;
};

const AuthContext = createContext<AuthValue | null>(null);

async function carregarPerfil(userId: string): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome, papel, unidade_id')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id, nome: data.nome, papel: data.papel, unidadeId: data.unidade_id };
}

function mensagemErro(msg: string) {
  if (msg === 'Invalid login credentials') return 'E-mail ou senha inválidos';
  return msg;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function hidratar(session: Session | null) {
      if (!session) {
        if (ativo) {
          setUsuario(null);
          setCarregando(false);
        }
        return;
      }
      const perfil = await carregarPerfil(session.user.id);
      if (ativo) {
        setUsuario(perfil);
        setCarregando(false);
      }
    }

    supabase.auth.getSession().then(({ data }) => hidratar(data.session));

    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, session) => {
      hidratar(session);
    });

    return () => {
      ativo = false;
      assinatura.subscription.unsubscribe();
    };
  }, []);

  async function login(email: string, senha: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw new Error(mensagemErro(error.message));
  }

  async function logout() {
    await supabase.auth.signOut();
    setUsuario(null);
  }

  function atualizarNome(nome: string) {
    setUsuario((u) => (u ? { ...u, nome } : u));
  }

  return (
    <AuthContext.Provider
      value={{ usuario, isSindico: usuario?.papel === 'sindico', carregando, login, logout, atualizarNome }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
