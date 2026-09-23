-- Perguntas de onboarding respondidas pelo síndico logo depois do cadastro
-- (uma pergunta por vez na tela /perguntas-condominio): blocos, comércio no
-- térreo e porteiro. `tem_porteiro` liga/desliga o módulo de Encomendas —
-- sem porteiro não faz sentido registrar recebimento de encomendas.
-- `onboarding_concluido` marca se a pessoa já passou por essa etapa, pra
-- decidir se redireciona pra lá logo após o login.

alter table public.condominios
  add column tem_blocos boolean not null default false,
  add column qtd_blocos integer,
  add column tem_comercio boolean not null default false,
  add column qtd_comercio integer,
  add column tem_porteiro boolean not null default false,
  add column onboarding_concluido boolean not null default false;

alter table public.condominios
  add constraint condominios_qtd_blocos_check check (qtd_blocos is null or qtd_blocos >= 0),
  add constraint condominios_qtd_comercio_check check (qtd_comercio is null or qtd_comercio >= 0);

-- Condomínio de demonstração já em uso (login de teste) reflete os dados que
-- já existem em `unidades` (blocos A/B, uma "Loja 1") e não deve ser jogado
-- de volta pro onboarding no próximo login.
update public.condominios
set tem_blocos = true,
    qtd_blocos = 2,
    tem_comercio = true,
    qtd_comercio = 1,
    tem_porteiro = true,
    onboarding_concluido = true
where nome = 'Residencial Jardim das Palmeiras';
