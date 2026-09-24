-- Mais uma pergunta de onboarding: se o condomínio tem área que precisa de
-- reserva (salão de festas, churrasqueira, ou outra digitada pelo síndico).
-- Quando a resposta é "não", o módulo de Reservas fica escondido — não faz
-- sentido reservar o que não existe.

alter table public.condominios
  add column tem_areas_reserva boolean not null default false;

-- Condomínio de demonstração já tem áreas cadastradas (Salão de festas,
-- Churrasqueira, Quadra poliesportiva) — reflete isso sem mudar nada.
update public.condominios
set tem_areas_reserva = true
where nome = 'Residencial Jardim das Palmeiras';
