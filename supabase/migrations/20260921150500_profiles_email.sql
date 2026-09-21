-- auth.users não é exposto via API (nem deveria) e a Moradores admin
-- precisa listar e-mail de outros usuários. Guarda uma cópia em profiles,
-- preenchida pelo trigger no cadastro (não é atualizada se a pessoa trocar
-- o e-mail depois — caso raro, aceitável por ora).

alter table public.profiles add column email text;

update public.profiles p set email = u.email from auth.users u where u.id = p.id;

alter table public.profiles alter column email set not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, papel, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'papel', 'condomino'),
    new.email
  );
  return new;
end;
$$;
