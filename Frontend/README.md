# ACESSO — Frontend

Interface web da plataforma ACESSO, voltada à inclusão profissional de pessoas com
deficiência (PCD) e profissionais 50+.

## Stack

- React 19 + TypeScript
- Vite
- TanStack Router (roteamento por arquivos) e TanStack Query
- Tailwind CSS v4 + componentes shadcn/ui (Radix UI)
- Axios para consumo da API
- VLibras e recursos de acessibilidade (WCAG 2.2)

## Requisitos

- Node.js 20 LTS ou superior
- npm 10 ou superior

## Executando localmente

```bash
npm install
cp .env.example .env
npm run dev
```

A aplicação sobe em `http://localhost:5173`.

## Variáveis de ambiente

| Variável       | Descrição                        | Exemplo                       |
| -------------- | -------------------------------- | ----------------------------- |
| `VITE_API_URL` | URL base da API do backend        | `http://localhost:3000/api`   |

Somente variáveis prefixadas com `VITE_` são expostas ao navegador. Nunca
coloque segredos aqui.

## Scripts

| Script              | Descrição                          |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Ambiente de desenvolvimento        |
| `npm run build`     | Build de produção em `dist/`       |
| `npm run preview`   | Servidor local do build            |
| `npm run lint`      | Análise estática com ESLint        |
| `npm run typecheck` | Verificação de tipos TypeScript    |

## Estrutura

```
src/
├── components/   Componentes reutilizáveis (UI e acessibilidade)
├── contexts/     Providers de acessibilidade, voz e sessão
├── hooks/        Hooks personalizados
├── layouts/      Cabeçalho e casca da aplicação
├── lib/          Utilidades e dados de apoio
├── routes/       Páginas (roteamento por arquivos do TanStack Router)
├── services/     Cliente HTTP e serviços de API
├── styles/       Estilos globais e design system
├── types/        Tipagens compartilhadas
└── utils/        Funções utilitárias de formatação
```

> `src/routeTree.gen.ts` é gerado automaticamente pelo TanStack Router ao rodar
> `npm run dev` ou `npm run build`.

## Deploy (Vercel)

1. Importe o repositório na Vercel e defina **Root Directory** como `Frontend`.
2. Build Command: `npm run build` — Output Directory: `dist`.
3. Configure a variável `VITE_API_URL` com a URL pública da API.

O arquivo `vercel.json` já inclui o rewrite de SPA para as rotas do cliente.
