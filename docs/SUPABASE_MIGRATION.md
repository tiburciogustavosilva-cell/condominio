# Migração para Supabase

O app roda 100% no Supabase agora (Postgres + Auth + RLS). O backend Express
em `backend/` ficou **dormente** — nenhuma página do frontend chama mais
`/api/*`. Os arquivos continuam no repo como referência/rollback, mas
`npm run dev` na raiz não sobe mais o Express (só `vite`).

## Status

| Módulo | Situação |
|---|---|
| 0. Projeto Supabase criado + credenciais | ✅ Projeto `xhclyysquwtojxsqflgd` |
| 1. `profiles` + Auth | ✅ Login real via Supabase Auth (`sindico@condominio.com` / `morador@condominio.com`, mesmas senhas de antes) |
| 2. `unidades`, `areas` | ✅ |
| 3. `avisos`, `encomendas` | ✅ |
| 4. `chamados` (+ comentários), `reservas` | ✅ |
| 5. `prestadores`, `manutencoes` (+ histórico) | ✅ CRUD completo. Envio automático de e-mail: ⬜ (Edge Function não implantada, ver módulo 5 abaixo) |
| 6. Moradores: criar morador novo (login + senha) | ⬜ exige `service_role`, ver seção "O que ainda não dá pra fazer" |
| 7. Apagar `backend/`, simplificar `npm run dev` | ✅ script simplificado; pasta `backend/` mantida no disco como referência |

Todo o schema, RLS e RPCs foram testados de ponta a ponta: login real dos
dois papéis, CRUD de cada módulo, e tentativas deliberadas de burlar RLS
(condômino tentando mudar status de chamado, cancelar reserva já aprovada,
ler prestadores, se auto-promover a síndico) — todas bloqueadas.

## O que ainda não dá pra fazer

**Criar um morador novo** (com login e senha) pela tela de Moradores. Isso
exige a `auth.admin.createUser()` do Supabase, que só funciona com a chave
`service_role` — e essa chave **nunca deve rodar no navegador** (ela ignora
RLS inteiro). Os caminhos possíveis:

1. Criar o morador manualmente pelo Supabase Studio → Authentication → Users
   (funciona hoje, sem mudar nada de código).
2. Implementar uma Edge Function `criar-morador` que recebe nome/e-mail/senha/
   unidade, valida que quem chamou é síndico, e usa `service_role` só ali
   dentro (nunca exposta). Precisa da CLI linkada ou da service_role key pra
   eu implantar.

Editar (nome, telefone, papel, unidade) e remover morador já funcionam sem
precisar de nada disso — ver `admin_atualizar_morador` no módulo 1.

## Como o schema ficou

`profiles` (módulo 1) espelha o antigo `usuarios`, 1:1 com `auth.users`, com
uma cópia de `email` (auth.users não é exposto via API):

```
profiles: id (uuid = auth.users.id), nome, email, telefone, papel ('sindico'|'condomino'), unidade_id, criado_em
```

Demais tabelas espelham as coleções de `backend/db.js`, com `id uuid default
gen_random_uuid()` e FKs de usuário apontando pra `profiles` (não pra
`auth.users`, que não é exposto — isso é o que permite o PostgREST fazer
"join" automático, tipo `chamados?select=*,profiles(nome)`):

| Tabela | Observações |
|---|---|
| `unidades`, `areas` | dados de referência; leitura livre pra autenticado, escrita só síndico |
| `chamados` + `chamado_comentarios` | síndico vê tudo, condômino só os próprios; só síndico muda status |
| `avisos` | leitura livre, escrita só síndico |
| `reservas` | síndico vê tudo, condômino só as próprias; condômino só cancela (e só se `pendente`); síndico decide livremente |
| `encomendas` | síndico cria/remove; condômino da unidade só confirma retirada |
| `prestadores`, `manutencoes`, `manutencao_historico` | módulo inteiro restrito a síndico |

RPCs (`security definer`, bypassam RLS com checagem própria dentro):
- `is_sindico()` / `minha_unidade()` — helpers usados dentro das policies.
- `admin_atualizar_morador(...)` — síndico edita qualquer perfil sem precisar de `service_role`.
- `dashboard_resumo()` — contadores do dashboard num round-trip só.

## Módulo 5 pendente: lembretes de manutenção por e-mail

Hoje o cálculo de "próxima manutenção"/status roda no **cliente**
(`frontend/src/lib/recorrencia.ts`, porta de `backend/lib/recorrencia.js`) —
CRUD completo de prestadores/manutenções funciona. O que falta é o envio
automático:

- `supabase/functions/enviar-lembretes-manutencao/index.ts` (a criar) — mesma
  lógica de `statusManutencao` + envio de e-mail (Resend ou SMTP).
- Agendada com `pg_cron` chamando a function via `pg_net` todo dia — substitui
  o `cron.schedule('0 8 * * *', ...)` do Express.
- `manutencoes.ultimo_lembrete_ciclo` já existe na tabela, pronta pra guardar
  a idempotência (não avisar duas vezes no mesmo ciclo).

**Por que não foi implantada:** a Supabase CLI desta máquina está logada
numa conta sem acesso a este projeto (`supabase projects list` não lista
`xhclyysquwtojxsqflgd`), então `supabase functions deploy` não funciona por
aqui. Pra implantar: linkar a CLI na conta certa (`supabase login` + `supabase
link --project-ref xhclyysquwtojxsqflgd`) ou implantar direto pelo Supabase
Studio → Edge Functions.

## Notas técnicas úteis se for mexer no schema de novo

- Sem CLI linkada, migrations foram aplicadas por conexão direta ao Postgres
  (`DATABASE_URL` do `.env`, via `pg`) em vez de `supabase db push`. Se a CLI
  for linkada depois, `db push` volta a funcionar normal lendo os mesmos
  arquivos de `supabase/migrations/`.
- Regenerar types (precisa da CLI linkada):
  ```
  npx supabase gen types typescript --project-id xhclyysquwtojxsqflgd > frontend/src/integrations/supabase/types.ts
  ```
  Depois é só trocar `createClient(...)` por `createClient<Database>(...)` em
  `frontend/src/integrations/supabase/client.ts` — os hooks não precisam mudar.
- RLS trava linha; GRANT de coluna trava campo. Em `profiles`, RLS libera
  `update` na própria linha, mas um `revoke update ... / grant update (nome,
  telefone) ...` impede qualquer um de mudar o próprio `papel` direto pela
  tabela — os dois mecanismos são necessários juntos.
- Teste de RLS sem precisar de sessão real: `set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true);`
  dentro de uma transação via `DATABASE_URL` simula qualquer usuário.
