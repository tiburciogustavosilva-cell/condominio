-- Módulo "Manutenção Predial", espelhando a planilha Modelo_Controle_
-- Manutencoes_Prediais: Cadastro (ativos), Plano de Manutenção (amplia
-- manutencoes já existente) e Registro de Serviços (ordens_servico).
-- Igual a prestadores/manutencoes, é um módulo restrito ao síndico.

-- ---------------------------------------------------------------------
-- Cadastro de equipamentos / áreas
-- ---------------------------------------------------------------------
create table public.ativos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  nome text not null,
  categoria text not null default 'outros'
    check (categoria in ('eletrica', 'hidraulica', 'elevadores', 'incendio', 'climatizacao', 'civil', 'outros')),
  localizacao text not null default '',
  fabricante_modelo text not null default '',
  numero_serie text not null default '',
  data_instalacao date,
  vida_util_anos integer,
  responsavel text not null default '',
  observacoes text not null default '',
  criado_em timestamptz not null default now()
);

alter table public.ativos enable row level security;
create policy "ativos_sindico" on public.ativos
  for all using (public.is_sindico()) with check (public.is_sindico());

-- ---------------------------------------------------------------------
-- Plano de Manutenção = amplia a tabela manutencoes já existente
-- ("ativo" já existe como boolean de liga/desliga lembrete; "ativo_id"
-- abaixo é o vínculo com o equipamento/área — nomes parecidos, propósitos
-- diferentes, cuidado ao ler o schema).
-- ---------------------------------------------------------------------
alter table public.manutencoes
  add column ativo_id uuid references public.ativos (id),
  add column tipo text not null default 'preventiva' check (tipo in ('preventiva', 'corretiva', 'preditiva')),
  add column prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta', 'critica')),
  add column status_manual text not null default 'programada'
    check (status_manual in ('programada', 'em_andamento', 'concluida', 'atrasada', 'cancelada')),
  add column custo_previsto numeric,
  add column numero_os text;

-- ---------------------------------------------------------------------
-- Registro de Serviços (ordens de serviço)
-- ---------------------------------------------------------------------
create table public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  numero_os text,
  data_abertura date not null default current_date,
  data_execucao date,
  ativo_id uuid references public.ativos (id),
  tipo text not null default 'corretiva' check (tipo in ('preventiva', 'corretiva', 'preditiva')),
  descricao text not null,
  diagnostico text not null default '',
  acao_executada text not null default '',
  responsavel text not null default '',
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta', 'critica')),
  status text not null default 'programada'
    check (status in ('programada', 'em_andamento', 'concluida', 'atrasada', 'cancelada')),
  custo_material numeric not null default 0,
  custo_mao_obra numeric not null default 0,
  custo_total numeric generated always as (custo_material + custo_mao_obra) stored,
  observacoes text not null default '',
  criado_em timestamptz not null default now()
);
create index ordens_servico_ativo_id_idx on public.ordens_servico (ativo_id);

alter table public.ordens_servico enable row level security;
create policy "ordens_servico_sindico" on public.ordens_servico
  for all using (public.is_sindico()) with check (public.is_sindico());
