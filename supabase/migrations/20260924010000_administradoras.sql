-- Administradoras: empresa que gerencia vários condomínios. No cadastro, a
-- pessoa escolhe se é síndico (cria 1 condomínio, dono dele) ou
-- administradora (cria a empresa, sem condomínio ainda — cadastra quantos
-- quiser depois em /meus-condominios e alterna entre eles).
--
-- Design: em vez de reescrever toda RLS pra "pertence a uma das N
-- administradoras", a administradora tem um condomínio "ativo" (o mesmo
-- profiles.condominio_id que síndico/condômino já usam) que ela troca via
-- trocar_condominio_ativo(). Assim minha_condominio() continua sendo a
-- única fonte de verdade pras policies de negócio — nenhuma delas precisou
-- ser tocada.

create table public.administradoras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text not null default '',
  criado_em timestamptz not null default now()
);

alter table public.administradoras enable row level security;

alter table public.profiles
  add column administradora_id uuid references public.administradoras (id);

alter table public.profiles drop constraint profiles_papel_check;
alter table public.profiles add constraint profiles_papel_check
  check (papel in ('sindico', 'condomino', 'administradora'));

alter table public.condominios
  add column administradora_id uuid references public.administradoras (id);

-- is_sindico() passa a valer também pra administradora: enquanto ela está
-- "dentro" de um condomínio (profiles.condominio_id = o condomínio ativo),
-- tem as mesmas permissões de escrita que um síndico teria nele. Isso
-- reaproveita 100% das policies/RPCs que já usam is_sindico().
create or replace function public.is_sindico()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and papel in ('sindico', 'administradora')
  );
$$;

create or replace function public.is_administradora()
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and papel = 'administradora');
$$;

create or replace function public.minha_administradora()
returns uuid
language sql security definer set search_path = public stable
as $$
  select administradora_id from public.profiles where id = auth.uid()
$$;

-- administradora enxerga TODOS os condomínios que ela gerencia (não só o
-- ativo) — precisa disso pra montar o seletor em /meus-condominios.
create policy "condominios_select_administradora" on public.condominios
  for select using (administradora_id = public.minha_administradora());

-- administradora vê/edita a própria empresa.
create policy "administradoras_select_propria" on public.administradoras
  for select using (id = public.minha_administradora());
create policy "administradoras_update_propria" on public.administradoras
  for update using (id = public.minha_administradora());

-- Troca qual condomínio está "ativo" pro usuário administradora (tudo que
-- lê minha_condominio() passa a enxergar esse). Só pode trocar pra um
-- condomínio que pertence à própria administradora.
create or replace function public.trocar_condominio_ativo(p_condominio_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  minha_admin uuid := public.minha_administradora();
begin
  if not public.is_administradora() or minha_admin is null then
    raise exception 'apenas uma administradora com empresa cadastrada pode trocar de condomínio';
  end if;

  if (select administradora_id from public.condominios where id = p_condominio_id) is distinct from minha_admin then
    raise exception 'condomínio não pertence à sua administradora';
  end if;

  update public.profiles set condominio_id = p_condominio_id where id = auth.uid();
end;
$$;

-- Cria um condomínio novo sob a administradora logada e já troca pra ele
-- (fica ativo), pra cair direto nas perguntas de onboarding.
create or replace function public.administradora_criar_condominio(
  p_nome text,
  p_endereco text default '',
  p_cnpj text default ''
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  minha_admin uuid := public.minha_administradora();
  novo_id uuid;
begin
  if not public.is_administradora() or minha_admin is null then
    raise exception 'apenas uma administradora com empresa cadastrada pode cadastrar condomínios';
  end if;

  insert into public.condominios (nome, endereco, cnpj, administradora_id)
  values (p_nome, p_endereco, p_cnpj, minha_admin)
  returning id into novo_id;

  update public.profiles set condominio_id = novo_id where id = auth.uid();

  return novo_id;
end;
$$;

-- handle_new_user: agora três caminhos — administradora (cria a empresa,
-- sem condomínio), síndico com condominio_nome (cria o condomínio, como já
-- era), ou fallback condômino solto.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  novo_condominio_id uuid;
  nova_administradora_id uuid;
  nome_condominio text;
  nome_administradora text;
  tipo_cadastro text;
begin
  tipo_cadastro := new.raw_user_meta_data ->> 'papel';
  nome_condominio := nullif(trim(new.raw_user_meta_data ->> 'condominio_nome'), '');
  nome_administradora := nullif(trim(new.raw_user_meta_data ->> 'administradora_nome'), '');

  if tipo_cadastro = 'administradora' and nome_administradora is not null then
    insert into public.administradoras (nome, cnpj)
    values (nome_administradora, coalesce(new.raw_user_meta_data ->> 'administradora_cnpj', ''))
    returning id into nova_administradora_id;

    insert into public.profiles (id, nome, email, papel, administradora_id)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
      new.email,
      'administradora',
      nova_administradora_id
    );
  elsif nome_condominio is not null then
    insert into public.condominios (nome, endereco, cnpj)
    values (
      nome_condominio,
      coalesce(new.raw_user_meta_data ->> 'condominio_endereco', ''),
      coalesce(new.raw_user_meta_data ->> 'condominio_cnpj', '')
    )
    returning id into novo_condominio_id;

    insert into public.profiles (id, nome, email, papel, condominio_id)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
      new.email,
      'sindico',
      novo_condominio_id
    );
  else
    insert into public.profiles (id, nome, email, papel)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
      new.email,
      coalesce(nullif(tipo_cadastro, 'administradora'), 'condomino')
    );
  end if;

  return new;
end;
$$;

-- dashboard_resumo: não conta a própria administradora (que não é moradora)
-- no total de moradores do condomínio ativo.
create or replace function public.dashboard_resumo()
returns json
language plpgsql security definer set search_path = public stable
as $$
declare
  eh_sindico boolean := public.is_sindico();
  minha_unid uuid := public.minha_unidade();
  minha_cond uuid := public.minha_condominio();
  hoje date := current_date;
  resultado json;
begin
  select json_build_object(
    'chamados', (
      select json_build_object(
        'aberto', count(*) filter (where status = 'aberto'),
        'em_andamento', count(*) filter (where status = 'em_andamento'),
        'concluido', count(*) filter (where status = 'concluido')
      )
      from public.chamados
      where condominio_id = minha_cond and (eh_sindico or usuario_id = auth.uid())
    ),
    'reservas', (
      select json_build_object(
        'pendentes', count(*) filter (where status = 'pendente'),
        'proximas', count(*) filter (where status = 'aprovada' and data >= hoje)
      )
      from public.reservas
      where condominio_id = minha_cond and (eh_sindico or usuario_id = auth.uid())
    ),
    'encomendas', (
      select json_build_object('aguardando', count(*) filter (where status = 'aguardando'))
      from public.encomendas
      where condominio_id = minha_cond and (eh_sindico or unidade_id = minha_unid)
    ),
    'totais', case when eh_sindico then (
      select json_build_object(
        'unidades', (select count(*) from public.unidades where condominio_id = minha_cond),
        'moradores', (select count(*) from public.profiles where condominio_id = minha_cond and papel <> 'administradora')
      )
    ) else null end,
    'avisos', (
      select coalesce(json_agg(a order by a.fixado desc, a.criado_em desc), '[]'::json)
      from (
        select * from public.avisos where condominio_id = minha_cond
        order by fixado desc, criado_em desc limit 4
      ) a
    )
  ) into resultado;

  return resultado;
end;
$$;
