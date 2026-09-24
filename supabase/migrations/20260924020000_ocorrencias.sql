-- Livro de Ocorrência: condômino registra reclamações/ocorridos (barulho,
-- segurança, convivência, danos...). Mesmo padrão de chamados (RLS,
-- status), mas é um módulo à parte — não mistura com solicitação de
-- manutenção.

create table public.ocorrencias (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios (id) default public.minha_condominio(),
  titulo text not null,
  descricao text not null,
  categoria text not null default 'outro',
  status text not null default 'aberto' check (status in ('aberto', 'em_andamento', 'concluido')),
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  unidade_id uuid references public.unidades (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index ocorrencias_usuario_id_idx on public.ocorrencias (usuario_id);

alter table public.ocorrencias enable row level security;

-- síndico vê tudo do próprio condomínio; condômino só as próprias. Só
-- síndico muda status (mesma regra de chamados).
create policy "ocorrencias_select" on public.ocorrencias
  for select using (
    condominio_id = public.minha_condominio()
    and (public.is_sindico() or usuario_id = auth.uid())
  );
create policy "ocorrencias_insert" on public.ocorrencias
  for insert with check (usuario_id = auth.uid() and condominio_id = public.minha_condominio());
create policy "ocorrencias_update_status_sindico" on public.ocorrencias
  for update using (public.is_sindico() and condominio_id = public.minha_condominio())
  with check (public.is_sindico() and condominio_id = public.minha_condominio());
