# Sistema de Condomínio

Gestão de condomínio: **React + Vite** no frontend e **API Express + Prisma + Postgres** no backend.
A autenticação usa JWT Bearer.

## Como rodar

Pré-requisitos: **Node.js 18+** e um **Postgres** acessível.

```bash
cp backend/.env.example backend/.env    # preencha DATABASE_URL e JWT_SECRET
cp frontend/.env.example frontend/.env
npm install                              # instala frontend + backend
npm run db:migrate                       # aplica prisma/migrations
npm run db:seed                          # dados de demonstração
npm run dev                              # API :4000 + Vite :8080
npm test                                 # smoke test da API (auth + regras de acesso)
```

## Login de teste

| Perfil    | E-mail                  | Senha       |
|-----------|-------------------------|-------------|
| Síndico   | sindico@condominio.com  | admin123    |
| Condômino | morador@condominio.com  | morador123  |
| Portaria  | portaria@condominio.com | portaria123 |

**Funcionários** (porteiro, zelador, limpeza, jardineiro, manutenção, segurança…) são cadastrados pelo síndico em
`/funcionarios`, todos com login. O **cargo** define o acesso: porteiro usa **Encomendas** e **Avisos**, os demais só
**Avisos** (regra em `CARGOS_PORTARIA`, em `backend/src/utils/acesso.js` e `frontend/src/types/condominio.ts`).

O sistema é **multi-condomínio**. Em `/cadastro` dá pra criar uma conta de **síndico**, que já cria 1 condomínio, ou de
**administradora**, que depois cadastra vários condomínios em `/meus-condominios` e alterna entre eles.

## Módulos

| Módulo | Condômino | Síndico |
|---|---|---|
| **Dashboard** | Resumo pessoal (chamados, reservas, encomendas) | Visão geral do condomínio |
| **Chamados** | Abre e acompanha os próprios, comenta, define prioridade | Vê todos, muda status, comenta |
| **Reservas** | Solicita áreas comuns (salão, churrasqueira, quadra); só cancela enquanto pendente | Aprova / rejeita / cancela qualquer uma |
| **Encomendas** | Vê o que chegou para a unidade, a foto e o **código de retirada** (5 dígitos) | Portaria/síndico registra com foto `.webp`, código de rastreio (opcional), nome e CPF do entregador; libera só com o código informado + nome de quem retira (a portaria nunca vê o código; 5 códigos errados bloqueiam e só o síndico desbloqueia). Filtros, busca, selos (perecível, volume grande, parada há 3+ dias) e relatório .xlsx por período (síndico) |
| **Avisos** | Lê o mural | Publica, fixa no topo, remove |
| **Livro de Ocorrência** | Registra reclamações/ocorridos (barulho, segurança, convivência…) e acompanha os próprios | Vê todos, muda status |
| **Prestadores** | — | Cadastro de quem executa serviço (nome, e-mail, contato) |
| **Manutenção Predial** | — | Cadastro de equipamentos/áreas, plano de manutenção (tipo/prioridade/custo/status), registro de ordens de serviço, dashboard próprio e exportação para `.xlsx` — espelha a planilha de controle predial |
| **Tarefas** | — | Síndico cadastra tarefas por cargo (todo dia, dias da semana, mensal ou única); funcionário do cargo vê as de hoje e conclui com 1–5 fotos, carimbadas com data/hora. Histórico com fotos e relatório de dias não feitos; tarefa com histórico não se exclui, só pausa |
| **Funcionários** | — | Cadastra porteiros, zeladores, limpeza etc. com login; o cargo define o acesso |
| **Moradores** | — | Edita dados/papel/unidade e remove (`POST /api/moradores` já cria, falta a tela) |
| **Unidades** | — | CRUD de unidades |
| **Perfil** | Edita dados e troca a senha | idem |

## Estrutura

```
backend/
  prisma/schema.prisma   modelos (o "model" do app) + migrations/ + seed.js
  src/server.js          sobe a API + agendador de lembretes
  src/app.js             express, /api, handler de erro
  src/routes/            1 arquivo por módulo; index.js monta tudo sob /api
  src/controllers/       lê req → chama service → responde
  src/services/          regras de negócio + permissões + queries Prisma
  src/models/prisma.js   PrismaClient único
  src/middlewares/       auth (Bearer JWT, apenasSindico), erro
  src/integrations/      mailer (SMTP/simulado), lembretes (cron diário)
  src/utils/             jwt, acesso, validar, recorrencia, json
  test/smoke.js          smoke test (node + assert)
frontend/
  src/lib/api.ts         fetch com Bearer; 401 → desloga
  src/hooks/             1 hook por domínio, chama a API
  src/pages/             uma página por módulo
```

## Arquitetura em 30 segundos

- **Auth**: `POST /api/auth/login` devolve `{ token, tokenType: "Bearer", usuario, condominio }`. O token fica no
  `localStorage` e vai no header `Authorization: Bearer ...`. O middleware `autenticar` valida o JWT e carrega o usuário
  do banco. Logout é só descartar o token.
- **Permissões** (antes eram RLS no Supabase): todo service filtra por `condominioId` do usuário logado. Síndico e
  administradora veem tudo do condomínio. O condômino só vê os próprios chamados, reservas e ocorrências, e as
  encomendas da própria unidade. Rotas administrativas passam por `apenasSindico`.
- **Datas**: colunas `@db.Date` saem como `YYYY-MM-DD` e `Decimal` sai como `number` (ver `src/utils/json.js`).
- **Lembretes de manutenção**: cron diário às 08:00 (`src/integrations/lembretes.js`). Sem `SMTP_HOST`, o e-mail é
  simulado e só aparece no console.
- **Padrão de módulo novo**: model no `schema.prisma` + `npx prisma migrate dev`, depois
  `services/x.service.js` → `controllers/x.controller.js` → `routes/x.routes.js` (registrar em `routes/index.js`),
  depois o hook `useX.ts` e a página.
