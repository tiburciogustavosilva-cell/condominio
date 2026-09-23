-- Multi-condomínio, parte 1: schema. Cada condomínio passa a ser um
-- "tenant" isolado. Toda tabela de negócio ganha condominio_id. Os dados
-- que já existiam (seed) são migrados para um condomínio "Residencial
-- Jardim das Palmeiras" criado aqui, pra nada sumir.
--
-- Parte 2 (próxima migration) reescreve TODAS as policies de RLS pra
-- considerar condominio_id — sem ela, este schema sozinho não isola nada.

create table public.condominios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  endereco text not null default '',
  cnpj text not null default '',
  criado_em timestamptz not null default now()
);

-- Condomínio "legado" pra abrigar os dados que já existiam antes do
-- multi-tenant (seed de teste + qualquer coisa cadastrada até agora).
insert into public.condominios (nome, endereco, cnpj)
values ('Residencial Jardim das Palmeiras', 'Rua das Palmeiras, 100 - Centro', '00.000.000/0001-00');

do $$
declare
  legado_id uuid;
begin
  select id into legado_id from public.condominios where nome = 'Residencial Jardim das Palmeiras' limit 1;

  alter table public.profiles add column condominio_id uuid references public.condominios (id);
  update public.profiles set condominio_id = legado_id where condominio_id is null;

  alter table public.unidades add column condominio_id uuid references public.condominios (id);
  update public.unidades set condominio_id = legado_id where condominio_id is null;
  alter table public.unidades alter column condominio_id set not null;

  alter table public.areas add column condominio_id uuid references public.condominios (id);
  update public.areas set condominio_id = legado_id where condominio_id is null;
  alter table public.areas alter column condominio_id set not null;

  alter table public.chamados add column condominio_id uuid references public.condominios (id);
  update public.chamados set condominio_id = legado_id where condominio_id is null;
  alter table public.chamados alter column condominio_id set not null;

  alter table public.chamado_comentarios add column condominio_id uuid references public.condominios (id);
  update public.chamado_comentarios set condominio_id = legado_id where condominio_id is null;
  alter table public.chamado_comentarios alter column condominio_id set not null;

  alter table public.avisos add column condominio_id uuid references public.condominios (id);
  update public.avisos set condominio_id = legado_id where condominio_id is null;
  alter table public.avisos alter column condominio_id set not null;

  alter table public.reservas add column condominio_id uuid references public.condominios (id);
  update public.reservas set condominio_id = legado_id where condominio_id is null;
  alter table public.reservas alter column condominio_id set not null;

  alter table public.encomendas add column condominio_id uuid references public.condominios (id);
  update public.encomendas set condominio_id = legado_id where condominio_id is null;
  alter table public.encomendas alter column condominio_id set not null;

  alter table public.prestadores add column condominio_id uuid references public.condominios (id);
  update public.prestadores set condominio_id = legado_id where condominio_id is null;
  alter table public.prestadores alter column condominio_id set not null;

  alter table public.manutencoes add column condominio_id uuid references public.condominios (id);
  update public.manutencoes set condominio_id = legado_id where condominio_id is null;
  alter table public.manutencoes alter column condominio_id set not null;

  alter table public.manutencao_historico add column condominio_id uuid references public.condominios (id);
  update public.manutencao_historico set condominio_id = legado_id where condominio_id is null;
  alter table public.manutencao_historico alter column condominio_id set not null;

  alter table public.ativos add column condominio_id uuid references public.condominios (id);
  update public.ativos set condominio_id = legado_id where condominio_id is null;
  alter table public.ativos alter column condominio_id set not null;

  alter table public.ordens_servico add column condominio_id uuid references public.condominios (id);
  update public.ordens_servico set condominio_id = legado_id where condominio_id is null;
  alter table public.ordens_servico alter column condominio_id set not null;
end $$;

-- profiles.condominio_id fica nullable de propósito: uma conta criada à mão
-- (fora do fluxo de cadastro) pode existir sem condomínio até alguém setar
-- manualmente — RLS já bloqueia tudo pra esse caso (minha_condominio() = null).

create or replace function public.minha_condominio()
returns uuid
language sql security definer set search_path = public stable
as $$
  select condominio_id from public.profiles where id = auth.uid()
$$;

alter table public.condominios enable row level security;
