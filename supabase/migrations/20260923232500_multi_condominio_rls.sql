-- Multi-condomínio, parte 2: reescreve TODAS as policies existentes pra
-- considerar condominio_id, corrige os RPCs que agregavam dados sem
-- filtrar por condomínio (vazamento entre clientes) e troca o trigger de
-- cadastro pra criar um condomínio novo quando o signup vem com dados de
-- condomínio (fluxo "Cadastre-se").

-- ---------------------------------------------------------------------
-- condominios
-- ---------------------------------------------------------------------
create policy "condominios_select_proprio" on public.condominios
  for select using (id = public.minha_condominio());

create policy "condominios_update_sindico" on public.condominios
  for update using (public.is_sindico() and id = public.minha_condominio());

-- ---------------------------------------------------------------------
-- profiles — síndico só vê/edita/remove morador do PRÓPRIO condomínio.
-- ---------------------------------------------------------------------
drop policy "profiles_select_sindico" on public.profiles;
drop policy "profiles_delete_sindico" on public.profiles;

create policy "profiles_select_sindico" on public.profiles
  for select using (public.is_sindico() and condominio_id = public.minha_condominio());

create policy "profiles_delete_sindico" on public.profiles
  for delete using (public.is_sindico() and id <> auth.uid() and condominio_id = public.minha_condominio());

-- ---------------------------------------------------------------------
-- unidades / areas — leitura restrita a quem é do mesmo condomínio.
-- ---------------------------------------------------------------------
drop policy "unidades_select_autenticado" on public.unidades;
drop policy "unidades_write_sindico" on public.unidades;
create policy "unidades_select_condominio" on public.unidades
  for select using (condominio_id = public.minha_condominio());
create policy "unidades_write_sindico" on public.unidades
  for all using (public.is_sindico() and condominio_id = public.minha_condominio())
  with check (public.is_sindico() and condominio_id = public.minha_condominio());

drop policy "areas_select_autenticado" on public.areas;
drop policy "areas_write_sindico" on public.areas;
create policy "areas_select_condominio" on public.areas
  for select using (condominio_id = public.minha_condominio());
create policy "areas_write_sindico" on public.areas
  for all using (public.is_sindico() and condominio_id = public.minha_condominio())
  with check (public.is_sindico() and condominio_id = public.minha_condominio());

-- ---------------------------------------------------------------------
-- avisos
-- ---------------------------------------------------------------------
drop policy "avisos_select_autenticado" on public.avisos;
drop policy "avisos_write_sindico" on public.avisos;
create policy "avisos_select_condominio" on public.avisos
  for select using (condominio_id = public.minha_condominio());
create policy "avisos_write_sindico" on public.avisos
  for all using (public.is_sindico() and condominio_id = public.minha_condominio())
  with check (public.is_sindico() and condominio_id = public.minha_condominio());

-- ---------------------------------------------------------------------
-- chamados / chamado_comentarios
-- ---------------------------------------------------------------------
drop policy "chamados_select" on public.chamados;
drop policy "chamados_insert" on public.chamados;
drop policy "chamados_update_status_sindico" on public.chamados;

create policy "chamados_select" on public.chamados
  for select using (
    condominio_id = public.minha_condominio()
    and (public.is_sindico() or usuario_id = auth.uid())
  );
create policy "chamados_insert" on public.chamados
  for insert with check (usuario_id = auth.uid() and condominio_id = public.minha_condominio());
create policy "chamados_update_status_sindico" on public.chamados
  for update using (public.is_sindico() and condominio_id = public.minha_condominio())
  with check (public.is_sindico() and condominio_id = public.minha_condominio());

drop policy "comentarios_select" on public.chamado_comentarios;
drop policy "comentarios_insert" on public.chamado_comentarios;

create policy "comentarios_select" on public.chamado_comentarios
  for select using (
    condominio_id = public.minha_condominio()
    and (
      public.is_sindico()
      or exists (select 1 from public.chamados c where c.id = chamado_id and c.usuario_id = auth.uid())
    )
  );
create policy "comentarios_insert" on public.chamado_comentarios
  for insert with check (
    autor_id = auth.uid()
    and condominio_id = public.minha_condominio()
    and (
      public.is_sindico()
      or exists (select 1 from public.chamados c where c.id = chamado_id and c.usuario_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- reservas
-- ---------------------------------------------------------------------
drop policy "reservas_select" on public.reservas;
drop policy "reservas_insert" on public.reservas;
drop policy "reservas_cancelar_owner" on public.reservas;
drop policy "reservas_update_sindico" on public.reservas;

create policy "reservas_select" on public.reservas
  for select using (
    condominio_id = public.minha_condominio()
    and (public.is_sindico() or usuario_id = auth.uid())
  );
create policy "reservas_insert" on public.reservas
  for insert with check (usuario_id = auth.uid() and condominio_id = public.minha_condominio());
create policy "reservas_cancelar_owner" on public.reservas
  for update
  using (usuario_id = auth.uid() and status = 'pendente' and condominio_id = public.minha_condominio())
  with check (status = 'cancelada');
create policy "reservas_update_sindico" on public.reservas
  for update using (public.is_sindico() and condominio_id = public.minha_condominio())
  with check (public.is_sindico() and condominio_id = public.minha_condominio());

-- ---------------------------------------------------------------------
-- encomendas
-- ---------------------------------------------------------------------
drop policy "encomendas_select" on public.encomendas;
drop policy "encomendas_insert_sindico" on public.encomendas;
drop policy "encomendas_entregar_owner" on public.encomendas;
drop policy "encomendas_update_sindico" on public.encomendas;
drop policy "encomendas_delete_sindico" on public.encomendas;

create policy "encomendas_select" on public.encomendas
  for select using (
    condominio_id = public.minha_condominio()
    and (public.is_sindico() or unidade_id = public.minha_unidade())
  );
create policy "encomendas_insert_sindico" on public.encomendas
  for insert with check (public.is_sindico() and condominio_id = public.minha_condominio());
create policy "encomendas_entregar_owner" on public.encomendas
  for update
  using (status = 'aguardando' and unidade_id = public.minha_unidade() and condominio_id = public.minha_condominio())
  with check (status = 'entregue');
create policy "encomendas_update_sindico" on public.encomendas
  for update using (public.is_sindico() and condominio_id = public.minha_condominio())
  with check (public.is_sindico() and condominio_id = public.minha_condominio());
create policy "encomendas_delete_sindico" on public.encomendas
  for delete using (public.is_sindico() and condominio_id = public.minha_condominio());

-- ---------------------------------------------------------------------
-- prestadores / manutencoes / manutencao_historico / ativos / ordens_servico
-- (mesmo padrão: módulo inteiro restrito a síndico do próprio condomínio)
-- ---------------------------------------------------------------------
drop policy "prestadores_sindico" on public.prestadores;
create policy "prestadores_sindico" on public.prestadores
  for all using (public.is_sindico() and condominio_id = public.minha_condominio())
  with check (public.is_sindico() and condominio_id = public.minha_condominio());

drop policy "manutencoes_sindico" on public.manutencoes;
create policy "manutencoes_sindico" on public.manutencoes
  for all using (public.is_sindico() and condominio_id = public.minha_condominio())
  with check (public.is_sindico() and condominio_id = public.minha_condominio());

drop policy "manutencao_historico_sindico" on public.manutencao_historico;
create policy "manutencao_historico_sindico" on public.manutencao_historico
  for all using (public.is_sindico() and condominio_id = public.minha_condominio())
  with check (public.is_sindico() and condominio_id = public.minha_condominio());

drop policy "ativos_sindico" on public.ativos;
create policy "ativos_sindico" on public.ativos
  for all using (public.is_sindico() and condominio_id = public.minha_condominio())
  with check (public.is_sindico() and condominio_id = public.minha_condominio());

drop policy "ordens_servico_sindico" on public.ordens_servico;
create policy "ordens_servico_sindico" on public.ordens_servico
  for all using (public.is_sindico() and condominio_id = public.minha_condominio())
  with check (public.is_sindico() and condominio_id = public.minha_condominio());

-- ---------------------------------------------------------------------
-- admin_atualizar_morador: só pode editar morador do PRÓPRIO condomínio.
-- ---------------------------------------------------------------------
create or replace function public.admin_atualizar_morador(
  p_id uuid,
  p_nome text default null,
  p_telefone text default null,
  p_papel text default null,
  p_unidade_id uuid default null,
  p_limpar_unidade boolean default false
)
returns public.profiles
language plpgsql security definer set search_path = public
as $$
declare
  resultado public.profiles;
begin
  if not public.is_sindico() then
    raise exception 'apenas o síndico pode editar moradores';
  end if;

  if (select condominio_id from public.profiles where id = p_id) <> public.minha_condominio() then
    raise exception 'morador não pertence ao seu condomínio';
  end if;

  update public.profiles set
    nome = coalesce(p_nome, nome),
    telefone = coalesce(p_telefone, telefone),
    papel = coalesce(p_papel, papel),
    unidade_id = case when p_limpar_unidade then null else coalesce(p_unidade_id, unidade_id) end
  where id = p_id
  returning * into resultado;

  if resultado.id is null then
    raise exception 'morador não encontrado';
  end if;

  return resultado;
end;
$$;

-- ---------------------------------------------------------------------
-- dashboard_resumo: cada subquery agora filtra pelo condomínio do usuário
-- logado — antes somava dados de TODOS os condomínios (vazamento).
-- ---------------------------------------------------------------------
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
        'moradores', (select count(*) from public.profiles where condominio_id = minha_cond)
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

-- ---------------------------------------------------------------------
-- Cadastro: signup cria um condomínio novo quando vem com
-- condominio_nome no metadata (fluxo "Cadastre-se" da tela de login).
-- Sem esse dado, cai no fallback antigo (conta criada à mão, sem
-- condomínio — fica bloqueada por RLS até alguém setar na unha).
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  novo_condominio_id uuid;
  nome_condominio text;
begin
  nome_condominio := nullif(trim(new.raw_user_meta_data ->> 'condominio_nome'), '');

  if nome_condominio is not null then
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
      coalesce(new.raw_user_meta_data ->> 'papel', 'condomino')
    );
  end if;

  return new;
end;
$$;
