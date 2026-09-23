-- condominio_id passa a ter DEFAULT = minha_condominio() em toda tabela de
-- negócio. Assim, um insert comum vindo do frontend (sem informar
-- condominio_id) já cai automaticamente no condomínio de quem está logado
-- — nenhum hook precisa ser alterado pra setar isso manualmente, e não tem
-- como "esquecer" e deixar a linha sem condomínio.

alter table public.unidades alter column condominio_id set default public.minha_condominio();
alter table public.areas alter column condominio_id set default public.minha_condominio();
alter table public.chamados alter column condominio_id set default public.minha_condominio();
alter table public.chamado_comentarios alter column condominio_id set default public.minha_condominio();
alter table public.avisos alter column condominio_id set default public.minha_condominio();
alter table public.reservas alter column condominio_id set default public.minha_condominio();
alter table public.encomendas alter column condominio_id set default public.minha_condominio();
alter table public.prestadores alter column condominio_id set default public.minha_condominio();
alter table public.manutencoes alter column condominio_id set default public.minha_condominio();
alter table public.manutencao_historico alter column condominio_id set default public.minha_condominio();
alter table public.ativos alter column condominio_id set default public.minha_condominio();
alter table public.ordens_servico alter column condominio_id set default public.minha_condominio();
