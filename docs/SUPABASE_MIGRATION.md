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
| 8. `ativos`, `ordens_servico` + módulo Manutenção Predial | ✅ Schema + RLS testados; espelha a planilha "Controle de Manutenções Prediais" (Cadastro, Plano de Manutenção, Registro de Serviços, Dashboard) + exportação `.xlsx` |
| 9. Multi-condomínio + tela de Cadastro (`/cadastro`) | ✅ Schema + RLS + fluxo de signup testados ponta a ponta (ver seção abaixo) |

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
| `ativos` | cadastro de equipamentos/áreas (Manutenção Predial); restrito a síndico |
| `ordens_servico` | registro de serviços/OS, `custo_total` é coluna gerada (`custo_material + custo_mao_obra`); restrito a síndico |

`manutencoes` ganhou colunas extra no módulo 8 pra virar o "Plano de
Manutenção" da planilha: `ativo_id` (FK pra `ativos`, opcional), `tipo`
(preventiva/corretiva/preditiva), `prioridade` (baixa/media/alta/critica),
`status_manual` (programada/em_andamento/concluida/atrasada/cancelada —
**diferente** do status calculado em_dia/proxima/vencida, que continua vindo
do prazo via `recorrencia.ts`), `custo_previsto`, `numero_os`. Repare também
que a tabela já tinha uma coluna `ativo` (boolean, liga/desliga lembrete) —
`ativo_id` é outra coisa (o equipamento/área vinculado), nomes parecidos de
propósito, não confundir ao ler o schema.

RPCs (`security definer`, bypassam RLS com checagem própria dentro):
- `is_sindico()` / `minha_unidade()` — helpers usados dentro das policies.
- `admin_atualizar_morador(...)` — síndico edita qualquer perfil sem precisar de `service_role`.
- `dashboard_resumo()` — contadores do dashboard num round-trip só.

## Módulo 9: multi-condomínio + tela de Cadastro

O sistema deixou de ser single-tenant. Agora existe uma tabela `condominios`,
e **toda** tabela de negócio (unidades, areas, chamados, avisos, reservas,
encomendas, prestadores, manutencoes, manutencao_historico, ativos,
ordens_servico, e `profiles`) tem uma coluna `condominio_id`. As RLS
policies de cada tabela foram reescritas pra sempre incluir `condominio_id =
minha_condominio()`, então um síndico/condômino de um condomínio nunca
enxerga (nem consegue escrever em) linhas de outro — isso vale inclusive
para a RPC `dashboard_resumo()`, que passou a filtrar cada subquery pelo
condomínio de quem chamou.

Como funciona o cadastro (tela `/cadastro`, `frontend/src/pages/Cadastro.tsx`):

1. A pessoa preenche e-mail, senha, nome e os dados do condomínio (nome,
   endereço, CNPJ opcional).
2. O frontend chama `useAuth().cadastrar(dados)`
   (`frontend/src/hooks/useAuth.tsx`), que é só um `supabase.auth.signUp()`
   passando esses dados em `options.data` (metadata do usuário).
3. O trigger `handle_new_user()` (roda em `auth.users` depois do insert) vê
   que veio `condominio_nome` na metadata, cria a linha em `public.condominios`
   e já cria o `profile` dessa pessoa como `papel = 'sindico'` apontando pro
   `condominio_id` recém-criado. Se não vier `condominio_nome` (fluxo antigo,
   ex.: síndico convidando morador por outro caminho), o profile é criado sem
   condomínio associado — hoje isso não acontece pela UI, mas o trigger
   sustenta os dois casos.
4. Toda tabela de negócio tem `condominio_id` com `default
   public.minha_condominio()` — então os hooks existentes (`useChamados`,
   `useReservas`, etc.) não precisaram de nenhuma mudança pra inserts:
   o Postgres já preenche o condomínio certo sozinho a partir de quem está
   logado.
5. Se a confirmação de e-mail estiver ligada no projeto (é o padrão), o
   `signUp()` não devolve sessão — a tela mostra "confirme seu e-mail" em vez
   de logar direto. Isso foi testado de ponta a ponta (signUp real via
   `@supabase/supabase-js`, conferido no banco que `condominios` e `profiles`
   ficaram corretos, e limpo depois).

**Risco que foi verificado e corrigido antes de existir em produção:** a
versão original (single-tenant) de `dashboard_resumo()` e de
`admin_atualizar_morador()` teriam vazado dados entre condomínios diferentes
(a primeira agregando contadores de todo mundo, a segunda deixando um síndico
editar o perfil de alguém de outro condomínio). Ambas foram reescritas nas
migrations de multi-condomínio antes de ir pro ar.

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
