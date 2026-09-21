-- Módulos 3+4 do plano: chamados, avisos, reservas, encomendas — o dia a dia
-- do condômino. RLS espelha exatamente backend/routes/*.js.

create table public.chamados (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text not null,
  categoria text not null default 'geral',
  status text not null default 'aberto' check (status in ('aberto', 'em_andamento', 'concluido')),
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta')),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  unidade_id uuid references public.unidades (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index chamados_usuario_id_idx on public.chamados (usuario_id);

create table public.chamado_comentarios (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references public.chamados (id) on delete cascade,
  autor_id uuid not null references auth.users (id) on delete cascade,
  texto text not null,
  criado_em timestamptz not null default now()
);
create index chamado_comentarios_chamado_id_idx on public.chamado_comentarios (chamado_id);

create table public.avisos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  mensagem text not null,
  fixado boolean not null default false,
  autor_id uuid not null references auth.users (id),
  criado_em timestamptz not null default now()
);

create table public.reservas (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.areas (id),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  unidade_id uuid references public.unidades (id),
  data date not null,
  periodo text not null check (periodo in ('manha', 'tarde', 'noite', 'dia_todo')),
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'rejeitada', 'cancelada')),
  observacao text not null default '',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index reservas_usuario_id_idx on public.reservas (usuario_id);

create table public.encomendas (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references public.unidades (id),
  descricao text not null,
  remetente text not null default '',
  status text not null default 'aguardando' check (status in ('aguardando', 'entregue')),
  recebido_por text,
  criado_em timestamptz not null default now(),
  entregue_em timestamptz
);
create index encomendas_unidade_id_idx on public.encomendas (unidade_id);

alter table public.chamados enable row level security;
alter table public.chamado_comentarios enable row level security;
alter table public.avisos enable row level security;
alter table public.reservas enable row level security;
alter table public.encomendas enable row level security;

-- chamados: síndico vê tudo; condômino só os próprios. Só síndico muda status.
create policy "chamados_select" on public.chamados
  for select using (public.is_sindico() or usuario_id = auth.uid());

create policy "chamados_insert" on public.chamados
  for insert with check (usuario_id = auth.uid());

create policy "chamados_update_status_sindico" on public.chamados
  for update using (public.is_sindico()) with check (public.is_sindico());

-- comentários: só quem pode ver o chamado (dono ou síndico) pode ler/comentar.
create policy "comentarios_select" on public.chamado_comentarios
  for select using (
    public.is_sindico()
    or exists (select 1 from public.chamados c where c.id = chamado_id and c.usuario_id = auth.uid())
  );

create policy "comentarios_insert" on public.chamado_comentarios
  for insert with check (
    autor_id = auth.uid()
    and (
      public.is_sindico()
      or exists (select 1 from public.chamados c where c.id = chamado_id and c.usuario_id = auth.uid())
    )
  );

-- avisos: leitura livre pra autenticado, escrita só síndico.
create policy "avisos_select_autenticado" on public.avisos
  for select using (auth.role() = 'authenticated');

create policy "avisos_write_sindico" on public.avisos
  for all using (public.is_sindico()) with check (public.is_sindico());

-- reservas: síndico vê tudo; condômino só as próprias. Condômino só pode
-- cancelar (e só se ainda estiver pendente); síndico decide livremente.
create policy "reservas_select" on public.reservas
  for select using (public.is_sindico() or usuario_id = auth.uid());

create policy "reservas_insert" on public.reservas
  for insert with check (usuario_id = auth.uid());

create policy "reservas_cancelar_owner" on public.reservas
  for update
  using (usuario_id = auth.uid() and status = 'pendente')
  with check (status = 'cancelada');

create policy "reservas_update_sindico" on public.reservas
  for update using (public.is_sindico()) with check (public.is_sindico());

-- encomendas: síndico vê/cria/remove tudo; condômino só vê e confirma
-- retirada das da própria unidade.
create policy "encomendas_select" on public.encomendas
  for select using (public.is_sindico() or unidade_id = public.minha_unidade());

create policy "encomendas_insert_sindico" on public.encomendas
  for insert with check (public.is_sindico());

create policy "encomendas_entregar_owner" on public.encomendas
  for update
  using (status = 'aguardando' and unidade_id = public.minha_unidade())
  with check (status = 'entregue');

create policy "encomendas_update_sindico" on public.encomendas
  for update using (public.is_sindico()) with check (public.is_sindico());

create policy "encomendas_delete_sindico" on public.encomendas
  for delete using (public.is_sindico());
