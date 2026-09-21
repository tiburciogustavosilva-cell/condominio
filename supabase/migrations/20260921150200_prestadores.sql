-- Módulo 5 do plano: prestadores + manutenções. Módulo inteiro é restrito
-- ao síndico, igual ao router.use(autenticar, apenasSindico) do Express.

create table public.prestadores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  servico text not null default '',
  empresa text not null default '',
  telefone text not null default '',
  observacao text not null default '',
  criado_em timestamptz not null default now()
);

create table public.manutencoes (
  id uuid primary key default gen_random_uuid(),
  prestador_id uuid not null references public.prestadores (id) on delete cascade,
  titulo text not null,
  descricao text not null default '',
  ultima_manutencao date not null,
  frequencia_unidade text not null check (frequencia_unidade in ('semanal', 'mensal', 'anual')),
  frequencia_intervalo integer not null default 1,
  dias_antecedencia integer not null default 0,
  ativo boolean not null default true,
  ultimo_lembrete_ciclo date,
  criado_em timestamptz not null default now()
);
create index manutencoes_prestador_id_idx on public.manutencoes (prestador_id);

create table public.manutencao_historico (
  id uuid primary key default gen_random_uuid(),
  manutencao_id uuid not null references public.manutencoes (id) on delete cascade,
  tipo text not null check (tipo in ('lembrete', 'realizada')),
  data date not null,
  em timestamptz not null default now(),
  detalhe text not null default ''
);
create index manutencao_historico_manutencao_id_idx on public.manutencao_historico (manutencao_id);

alter table public.prestadores enable row level security;
alter table public.manutencoes enable row level security;
alter table public.manutencao_historico enable row level security;

create policy "prestadores_sindico" on public.prestadores
  for all using (public.is_sindico()) with check (public.is_sindico());

create policy "manutencoes_sindico" on public.manutencoes
  for all using (public.is_sindico()) with check (public.is_sindico());

create policy "manutencao_historico_sindico" on public.manutencao_historico
  for all using (public.is_sindico()) with check (public.is_sindico());
