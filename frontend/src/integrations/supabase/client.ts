import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase do frontend — usado pelos hooks em src/hooks/*.
 *
 * Sem generics de tipo (<Database>) de propósito: os types reais dependem de
 * `supabase gen types` com a CLI linkada ao projeto certo (ver
 * docs/SUPABASE_MIGRATION.md, seção 0). Enquanto isso, os hooks tipam as
 * linhas manualmente ao mapear a resposta — trocar para `createClient<Database>`
 * depois de gerar src/integrations/supabase/types.ts é só isso, sem tocar
 * nos hooks.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (import.meta.env.DEV && (!url || !anonKey)) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configurados em frontend/.env — ' +
      'o cliente Supabase não vai conseguir se conectar até isso ser preenchido.'
  );
}

export const supabase = createClient(url ?? 'https://placeholder.supabase.co', anonKey ?? 'placeholder', {
  auth: { persistSession: true, autoRefreshToken: true }
});
