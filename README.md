# Sistema de Condomínio

Aplicação de gestão de condomínio: React + Vite no frontend, **Supabase**
(Postgres + Auth + RLS) como backend. Sem servidor próprio para manter — os
dados e as regras de autorização vivem no banco.

## Como rodar

Pré-requisito: **Node.js 18+** (`node -v`).

```bash
npm install
npm run dev
```

Abre **http://localhost:8080** no navegador. `npm run dev` só sobe o Vite —
console limpo, sem nada mais rodando em paralelo.

As credenciais do Supabase já estão em `frontend/.env` (gitignored). Se você
clonar isso em outra máquina, copie `frontend/.env.example` para
`frontend/.env` e preencha `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
(Project Settings → API no painel do Supabase).

## Login de teste

| Perfil    | E-mail                  | Senha       |
|-----------|-------------------------|-------------|
| Síndico   | sindico@condominio.com  | admin123    |
| Condômino | morador@condominio.com  | morador123  |

## Módulos

| Módulo | Condômino | Síndico |
|---|---|---|
| **Dashboard** | Resumo pessoal (chamados, reservas, encomendas) | Visão geral do condomínio |
| **Chamados** | Abre e acompanha os próprios, comenta, define prioridade | Vê todos, muda status, comenta |
| **Reservas** | Solicita áreas comuns (salão, churrasqueira, quadra); só cancela enquanto pendente | Aprova / rejeita / cancela qualquer uma |
| **Encomendas** | Vê o que chegou para a unidade e confirma retirada | Registra recebimento na portaria |
| **Avisos** | Lê o mural | Publica, fixa no topo, remove |
| **Prestadores** | — | Cadastro de quem executa serviço (nome, e-mail, contato) |
| **Manutenção Predial** | — | Cadastro de equipamentos/áreas, plano de manutenção (tipo/prioridade/custo/status), registro de ordens de serviço, dashboard próprio e exportação para `.xlsx` — espelha a planilha de controle predial |
| **Moradores** | — | Edita dados/papel/unidade e remove — **criar morador novo ainda não** (exige `service_role`, ver `docs/SUPABASE_MIGRATION.md`) |
| **Unidades** | — | CRUD de unidades |
| **Perfil** | Edita dados e troca a senha | idem |

## Estrutura

```
condominio-sistema/
  package.json          scripts (dev = só o frontend)
  frontend/              React + Vite + TypeScript + Tailwind + shadcn/ui
    src/index.css       tokens HSL — tema claro (recolorir = 3 variáveis)
    tailwind.config.ts  mapeia tokens → classes
    src/integrations/supabase/  client.ts (cliente real, sem generics de tipo
                                por enquanto) + types.ts (placeholder p/ codegen)
    src/hooks/           1 hook por domínio de dado — busca + cache em useState
                        + mutações via supabase-js: useAuth (Provider + sessão),
                        useChamados, useAvisos, useReservas, useEncomendas,
                        useMoradores, useUnidades, usePrestadores, useAtivos,
                        useOrdensServico, useDashboard, usePerfil
    src/types/condominio.ts  types + enums + labels (LABEL) compartilhados
    src/lib/recorrencia.ts   cálculo de "próxima manutenção"/status (cliente)
    src/lib/exportarRelatorio.ts  gera o .xlsx de Manutenção Predial (import
                                 dinâmico do pacote `xlsx`, só ao clicar em
                                 "Baixar relatório" — não entra no bundle inicial)
    src/lib/format.ts   funções puras de formatação (moeda, datas…)
    src/components/ui/       primitivos shadcn (button, card, badge, dialog…)
    src/components/layout/   AdminLayout, AppSidebar, BottomNav, NavLink, guards
    src/components/shared/   StatCard, StatusBadge, PageHeader, ListCard,
                             FilterPills, DatePicker, EmptyState, AsyncConfirmDialog…
    src/pages/          uma página .tsx por módulo, consome os hooks
    DESIGN_SYSTEM.md    guia do design system + passo a passo de port
  supabase/
    migrations/          uma migration por módulo, todas aplicadas no banco real
  backend/               API Express antiga — DORMENTE, nada mais chama isso
                        (mantida no disco só como referência/rollback)
  docs/
    SUPABASE_MIGRATION.md  o que foi migrado, como o schema/RLS ficaram, e o
                          que ainda falta (criação de morador, Edge Function
                          de e-mail)
```

> UX: sidebar colapsável no desktop + bottom-nav no mobile, tema claro,
> CTA laranja (`24 95% 53%`) + apoio roxo, fontes Nunito/Plus Jakarta Sans,
> movimento com framer-motion. Detalhes em `frontend/DESIGN_SYSTEM.md`.

## Arquitetura em 30 segundos

- **Auth**: Supabase Auth (`supabase.auth.signInWithPassword`). Sessão fica em
  `localStorage` (gerenciado pelo próprio supabase-js), papel (`sindico`/
  `condomino`) vive em `profiles.papel`, lido via `auth.uid()` nas policies —
  não existe mais JWT customizado nem checagem de papel manual no cliente
  além de esconder UI (a autorização de verdade é sempre RLS).
- **Dados**: Postgres do Supabase. Toda tabela tem RLS habilitado; nada é
  filtrado "na mão" no frontend — se uma linha não deveria aparecer para o
  usuário logado, a query já volta sem ela.
- **Padrão de módulo**: uma tabela (+ policies) em `supabase/migrations/` +
  um hook em `src/hooks/useX.ts` (mapeia snake_case do banco para o shape que
  as páginas já usam) + uma página em `src/pages/` + um item em
  `src/components/layout/nav-items.ts`.
- **RLS + GRANT de coluna**: em `profiles`, RLS libera `update` na própria
  linha, mas um `grant update (nome, telefone)` restringe *quais campos* —
  ninguém muda o próprio `papel` só porque a linha é sua. Ver mais em
  `docs/SUPABASE_MIGRATION.md`.
- **RPCs `security definer`**: operações administrativas que não cabem numa
  policy simples (editar qualquer morador, resumo do dashboard) viram função
  Postgres chamada via `supabase.rpc(...)`, com a checagem de permissão
  *dentro* da função.

## O que ainda não está pronto

1. **Criar morador novo** pela tela de Moradores — precisa da `service_role`
   key (nunca no navegador). Por enquanto, crie pelo Supabase Studio →
   Authentication → Users. Editar/remover já funcionam.
2. **E-mail automático de lembrete de manutenção** — o cálculo de status já
   roda no cliente, falta implantar a Edge Function agendada que dispara o
   envio (bloqueado hoje só porque a CLI local não está logada na conta certa
   deste projeto).

Detalhes, decisões e como resolver cada um em `docs/SUPABASE_MIGRATION.md`.

## Próximos passos sugeridos

1. Implantar a Edge Function de lembretes de manutenção (`pg_cron` + e-mail).
2. Edge Function `criar-morador` (ou fluxo de autocadastro) pra fechar o
   módulo de Moradores sem precisar do Supabase Studio.
3. Upload de foto/anexo nos chamados e nas encomendas (Supabase Storage).
4. Gerar `frontend/src/integrations/supabase/types.ts` de verdade (`supabase
   gen types`) e tipar `createClient<Database>` — hoje os hooks tipam as
   linhas manualmente.
5. Deploy: frontend na Vercel/Netlify (só variáveis `VITE_SUPABASE_*`).

## Dúvidas comuns

**Tela fica carregando / redireciona pro login sem motivo**: confirme
`frontend/.env` com `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` preenchidos
e reinicie o `npm run dev`.

**Erro de RLS ao tentar salvar algo**: normalmente é uma ação legítima sendo
bloqueada (ex.: condômino tentando editar algo de outra unidade) — veja a
tabela de policies em `docs/SUPABASE_MIGRATION.md` pra saber o que cada papel
pode fazer em cada tabela.

**Quero voltar a usar o backend Express**: os arquivos continuam em
`backend/`; `npm run dev:backend-legado` na raiz sobe ele sozinho. Mas as
páginas não chamam mais `/api/*`, então isso é só útil como referência.
