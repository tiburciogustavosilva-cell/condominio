-- Módulo 1 do plano de migração (docs/SUPABASE_MIGRATION.md): profiles + Auth.
-- Espelha "usuarios" do backend Express, 1:1 com auth.users.
-- unidade_id fica de fora por enquanto — entra no módulo 2 (unidades), via
-- ALTER TABLE, junto com a FK para public.unidades(id).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  telefone text,
  papel text not null default 'condomino' check (papel in ('sindico', 'condomino')),
  criado_em timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Helper "security definer": permite checar o papel do usuário logado nas
-- policies sem recursão de RLS (subquery direta em profiles dentro de uma
-- policy de profiles causaria recursão).
create or replace function public.is_sindico()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and papel = 'sindico'
  );
$$;

-- Cria a linha em profiles automaticamente quando alguém se cadastra no
-- Supabase Auth. "nome" e "papel" vêm de options.data no signUp(); sem isso,
-- cai em condomino + o prefixo do e-mail como nome.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'papel', 'condomino')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Leitura: cada um vê o próprio perfil; síndico vê todos (necessário pra
-- futura tela de Moradores).
create policy "profiles_select_self" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_select_sindico" on public.profiles
  for select using (public.is_sindico());

-- Escrita: cada um edita o próprio perfil (RLS libera a linha; o GRANT
-- abaixo restringe as colunas a nome/telefone — ninguém promove o próprio
-- papel sozinho). Mudar papel/criar/remover morador é trabalho do módulo de
-- Moradores, via service_role/Edge Function (não vai direto pela tabela).
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id);

revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (nome, telefone) on public.profiles to authenticated;
