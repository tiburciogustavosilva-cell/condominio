-- RPCs de apoio: edição administrativa de moradores (não exige service_role
-- — só criar/apagar o login em si que exige, ver docs/SUPABASE_MIGRATION.md)
-- e o resumo do dashboard num round-trip só.

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

grant execute on function public.admin_atualizar_morador to authenticated;

-- Síndico remove o perfil de um morador. A identidade em auth.users continua
-- existindo (apagar de vez exige service_role) — sem perfil, as demais
-- policies já bloqueiam esse usuário em todo o resto do app.
create policy "profiles_delete_sindico" on public.profiles
  for delete using (public.is_sindico() and id <> auth.uid());

create or replace function public.dashboard_resumo()
returns json
language plpgsql security definer set search_path = public stable
as $$
declare
  eh_sindico boolean := public.is_sindico();
  minha_unid uuid := public.minha_unidade();
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
      where eh_sindico or usuario_id = auth.uid()
    ),
    'reservas', (
      select json_build_object(
        'pendentes', count(*) filter (where status = 'pendente'),
        'proximas', count(*) filter (where status = 'aprovada' and data >= hoje)
      )
      from public.reservas
      where eh_sindico or usuario_id = auth.uid()
    ),
    'encomendas', (
      select json_build_object('aguardando', count(*) filter (where status = 'aguardando'))
      from public.encomendas
      where eh_sindico or unidade_id = minha_unid
    ),
    'totais', case when eh_sindico then (
      select json_build_object(
        'unidades', (select count(*) from public.unidades),
        'moradores', (select count(*) from public.profiles)
      )
    ) else null end,
    'avisos', (
      select coalesce(json_agg(a order by a.fixado desc, a.criado_em desc), '[]'::json)
      from (select * from public.avisos order by fixado desc, criado_em desc limit 4) a
    )
  ) into resultado;

  return resultado;
end;
$$;

grant execute on function public.dashboard_resumo to authenticated;
