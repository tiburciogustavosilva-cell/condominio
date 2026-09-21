-- Reaponta usuario_id/autor_id pra public.profiles (em vez de auth.users),
-- que não fica exposto via API. Os valores são idênticos (profiles.id =
-- auth.users.id sempre, garantido pelo trigger handle_new_user). Isso
-- habilita o PostgREST a fazer "join" direto (select=*,profiles(nome)) pra
-- trazer nome de quem abriu o chamado/aviso/reserva/comentário.

alter table public.chamados
  drop constraint chamados_usuario_id_fkey,
  add constraint chamados_usuario_id_fkey foreign key (usuario_id) references public.profiles (id) on delete cascade;

alter table public.chamado_comentarios
  drop constraint chamado_comentarios_autor_id_fkey,
  add constraint chamado_comentarios_autor_id_fkey foreign key (autor_id) references public.profiles (id) on delete cascade;

alter table public.avisos
  drop constraint avisos_autor_id_fkey,
  add constraint avisos_autor_id_fkey foreign key (autor_id) references public.profiles (id);

alter table public.reservas
  drop constraint reservas_usuario_id_fkey,
  add constraint reservas_usuario_id_fkey foreign key (usuario_id) references public.profiles (id) on delete cascade;
