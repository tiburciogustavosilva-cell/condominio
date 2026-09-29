-- Tutorial de primeiro acesso: null = ainda não viu (o app mostra ao entrar
-- no sistema). Fica no banco, não no navegador, para não reaparecer ao
-- trocar de aparelho. A policy profiles_update_self já limita à própria linha.

alter table public.profiles add column tutorial_visto_em timestamptz;

grant update (tutorial_visto_em) on public.profiles to authenticated;
