-- Módulo 2 do plano: unidades + areas. Adiciona profiles.unidade_id agora
-- que unidades existe.

create table public.unidades (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  bloco text not null default '-',
  tipo text not null default 'apartamento',
  fracao_ideal numeric not null default 0,
  criado_em timestamptz not null default now()
);

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text not null default '',
  capacidade integer not null default 0,
  taxa numeric not null default 0,
  horario text not null default '',
  criado_em timestamptz not null default now()
);

alter table public.profiles
  add column unidade_id uuid references public.unidades (id);

-- Helper: unidade do usuário logado, evita repetir a subquery em várias policies.
create or replace function public.minha_unidade()
returns uuid
language sql security definer set search_path = public stable
as $$
  select unidade_id from public.profiles where id = auth.uid()
$$;

alter table public.unidades enable row level security;
alter table public.areas enable row level security;

create policy "unidades_select_autenticado" on public.unidades
  for select using (auth.role() = 'authenticated');

create policy "unidades_write_sindico" on public.unidades
  for all using (public.is_sindico()) with check (public.is_sindico());

create policy "areas_select_autenticado" on public.areas
  for select using (auth.role() = 'authenticated');

create policy "areas_write_sindico" on public.areas
  for all using (public.is_sindico()) with check (public.is_sindico());
