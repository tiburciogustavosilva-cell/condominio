# Design system do frontend

Stack: **Vite + React + TypeScript + Tailwind + shadcn/ui + framer-motion**, tudo em PT-BR.

---

## 1. Fundação

| Arquivo | Papel |
|---|---|
| `src/index.css` | Tokens HSL (tema claro), gradientes, sombras, camadas `base/components/utilities` |
| `tailwind.config.ts` | Mapeia os tokens para classes (`bg-primary`, `shadow-glow`, `bg-gradient-primary`…), fontes, `borderRadius`, animações |
| `components.json` | Config do shadcn/ui (style `new-york`, alias `@/`, baseColor `orange`) |
| `src/lib/utils.ts` | `cn()` = `twMerge(clsx(...))` |
| `postcss.config.js` | `tailwindcss` + `autoprefixer` |
| `vite.config.ts` | porta `8080`, alias `@ → src` |

### Recolorir TUDO mexendo em 3 tokens

Em `src/index.css`, dentro de `:root`:

```css
--brand: 24 95% 53%;            /* laranja — CTA principal   */
--brand-support: 265 84% 62%;   /* roxo — apoio / destaque   */
--brand-foreground: 0 0% 100%;  /* texto sobre as cores acima */
```

`--primary` e `--secondary` são **derivados** desses três (`--primary: var(--brand)`), então
trocar o HSL da marca repropaga para botões, badges, foco, sidebar ativa, gradientes e sombra `glow`.
Os valores são triplas HSL **sem** `hsl(...)` — o wrapper fica no Tailwind (`hsl(var(--primary))`).

---

## 2. Identidade

- **CTA**: laranja `24 95% 53%` → `<Button variant="brand">` (gradiente + `shadow-glow`) ou `variant="default"` (chapado).
- **Apoio**: roxo `265 84% 62%` → `variant="secondary"`, avatares, badge "fixado".
- **Fontes**: `Nunito` nos títulos (`font-heading`, aplicado automático em `h1–h5`), `Plus Jakarta Sans` no corpo (`font-sans`). Carregadas via `<link>` no `index.html`.
- **Raio**: `--radius: 0.75rem` → `rounded-lg/md/sm`.
- **Densidade compacta**: inputs/botões `h-9`, cards `p-4/p-5`, textos meta em `text-xs`.
- **Movimento**: `framer-motion` — fade-up nos `StatCard`, transição de rota no `AdminLayout`, drawer mobile, largura da sidebar.
- **Tema**: só claro. `<meta name="color-scheme" content="light only">` + `color-scheme: light` no `body` impedem que o SO force modo escuro. Para reativar dark: `darkMode: ['class']` já está no `tailwind.config.ts`, basta recriar um bloco `.dark { ... }` no `index.css` e um toggle que adicione a classe no `<html>`.

---

## 3. Layout

Padrão **sidebar no desktop + bottom-nav no mobile**.

```
AdminLayout
├─ AppSidebar        (lg+, fixa, colapsável 256↔72, estado em localStorage)
├─ MobileNav         (drawer < lg, abre pelo ícone ☰ do topo)
├─ <header>          sticky: título da seção + avatar
├─ <main><Outlet/>   rotas aninhadas, com AnimatePresence por pathname
└─ BottomNav         (< lg, 5 itens)
```

- `nav-items.ts` centraliza os itens (`navItems` e `bottomNavItems`); `sindico: true` esconde do condômino.
- `NavLink` (`components/layout/NavLink.tsx`) reexpõe a API `activeClassName` sobre o `NavLink` do react-router v6.
- `App.tsx` faz o bootstrap: `<BrowserRouter><AuthProvider>` → `RequireAuth` → `AdminLayout` → rotas; `RequireSindico` protege `/moradores` e `/unidades`; `<Toaster/>` (sonner) no fim.

---

## 4. Primitivos (`src/components/ui/`)

| Componente | Variantes / notas |
|---|---|
| `button` | `default`, `brand`, `secondary`, `destructive`, `outline`, `ghost`, `link` × `sm/default/lg/icon`; `asChild` p/ virar `<Link>` |
| `card` | `Card` + `CardHeader/Title/Description/Content/Footer` |
| `badge` | `default`, `secondary`, `destructive`, `outline`, `success`, `warning`, `info`, `muted` |
| `input`, `textarea`, `label` | estilo shadcn, foco com `ring` |
| `dialog`, `popover` | Radix + animações `data-[state]` |
| `calendar` | `react-day-picker` v8, locale `ptBR` |
| `progress` | Radix, aceita `indicatorClassName` |
| `skeleton`, `sonner` | loading e toasts |

---

## 5. Padrões (`src/components/shared/`)

| Componente | Uso |
|---|---|
| `PageHeader` | título Nunito + descrição + `actions` + `backTo` |
| `StatCard` | métrica com ícone, `tone`, opcional `to` (clicável) e `index` (delay do fade) |
| `StatusBadge` / `PrioridadeBadge` | **mapa único** status→(rótulo PT-BR, variante); fallback `muted` para status desconhecido |
| `ListCard` | card de lista clicável (title/subtitle/meta/trailing + chevron) |
| `FilterPills` | pills de filtro, seleção única |
| `DatePicker` | `Popover` + `Calendar`, entra/sai como `"yyyy-MM-dd"` |
| `EmptyState` | ícone + título + descrição + ação |
| `AsyncConfirmDialog` | `Dialog` com `onConfirm: () => Promise`; spinner no botão, fecha no sucesso, erro vira `toast` |
| `ProgressStat` | barra rotulada `valor/total · %` |
| `Field` | `Label` + controle + `hint`, espaçamento `space-y-1.5` |

---

## 6. Convenções

- **Espaçamento vertical**: página `space-y-6`, blocos internos `space-y-4`, campos `space-y-3/1.5`.
- **Grid de cards**: `grid gap-4 sm:grid-cols-2 xl:grid-cols-4`.
- **Ícones**: `lucide-react`, `h-4 w-4` em botões/meta, `h-5 w-5` em headers/StatCard.
- **Feedback assíncrono**: `toast.success/error` do `sonner`; botões desabilitam e mostram `<Loader2 className="animate-spin"/>` enquanto aguardam.
- **Permissões**: `useAuth().isSindico` no client (esconder UI) — a autorização real é sempre RLS no Postgres (ver `docs/SUPABASE_MIGRATION.md`).
- **Fetch**: tudo via `supabase-js` dentro dos hooks (`src/hooks/useX.ts`), nunca direto nas páginas; sessão expirada é tratada pelo próprio `onAuthStateChange` do `useAuth`, que redireciona pra `/login`.

## 7. Dependências-chave

`tailwindcss` · `tailwindcss-animate` · `class-variance-authority` · `clsx` · `tailwind-merge` ·
`@radix-ui/react-{dialog,popover,label,progress,slot}` · `lucide-react` · `framer-motion` ·
`react-day-picker` + `date-fns` · `sonner` · `react-router-dom`.

---

## 8. Portar para um Vite + React novo

```bash
npm create vite@latest meu-app -- --template react-ts
cd meu-app
npm i tailwindcss@3 postcss autoprefixer tailwindcss-animate class-variance-authority clsx tailwind-merge \
      framer-motion lucide-react sonner react-router-dom \
      @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-label @radix-ui/react-progress @radix-ui/react-slot \
      react-day-picker date-fns
npx tailwindcss init -p
```

1. **Alias `@/`**: em `vite.config.ts` → `resolve.alias['@'] = fileURLToPath(new URL('./src', import.meta.url))` e em `tsconfig.json` → `"paths": { "@/*": ["./src/*"] }`.
2. **Copie 4 arquivos** deste projeto: `src/index.css`, `tailwind.config.ts`, `src/lib/utils.ts`, `components.json`.
3. **Copie as pastas** `src/components/ui`, `src/components/shared`, `src/components/layout`.
4. **Fontes**: cole o `<link>` do Google Fonts (Nunito + Plus Jakarta Sans) no `index.html`.
5. **Bootstrap**: use `App.tsx` como molde (providers + `RequireAuth` + `AdminLayout` + rotas aninhadas). Ajuste `nav-items.ts` para as suas telas.
6. **Recolorir**: troque só `--brand`, `--brand-support`, `--brand-foreground` no `:root` do `index.css`. Opcional: ajustar `--radius` e os tokens `--success/--warning/--info`.
7. Rode `npm run dev`.
