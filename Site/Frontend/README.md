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
├── i18n/         Idiomas do Site (pt, en, es): dicionários, estado e seletor
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

## Idiomas (pt, en, es)

O Site inteiro está em português, inglês e espanhol, com o seletor de idioma no topo de todas as
páginas. Não há biblioteca de i18n: são dicionários tipados em `src/i18n/`.

- `src/i18n/pt/<área>.ts` é a fonte da verdade. O tipo do dicionário sai dele (`Dicionario`), e
  `en/` e `es/` são declarados com esse tipo: esquecer uma chave, ou errar a assinatura de uma
  função de texto, é erro de compilação (`npm run typecheck`).
- Em componentes: `const t = useT()` e `t.<área>.<chave>`. Fora de componentes (título da página
  no `head` da rota, avisos de serviços): `dic()` e `metaPagina(dic().<área>.meta)`.
- Textos com número ou nome são funções (`t.comum.pagina(2, 5)`); plural e concordância ficam
  dentro da função, em cada idioma.
- Datas, números e moeda: use `utils/formatacao.ts`, que segue o idioma ativo.
- Valores que vêm do backend (status, modalidade, contrato…) são traduzidos por mapas do dicionário,
  com o valor cru como reserva. Texto escrito por pessoas (posts, currículo, descrições de vaga)
  não é traduzido.
- A escolha vale por navegador (`localStorage`) e, com a pessoa logada, também fica salva na conta
  (`usuarios.idioma`), para o servidor responder e enviar e-mails no mesmo idioma. O cliente HTTP
  manda o idioma no cabeçalho `Accept-Language`.
- Termos de Uso e Política de Privacidade têm tradução completa em `src/i18n/<idioma>/legal.ts`;
  o português prevalece em caso de divergência. Traduzir não muda a `VERSAO_DOCUMENTOS`.
- `src/i18n/dicionario.test.ts` falha se uma tradução ficar vazia ou igual ao português.

## Deploy (Vercel)

1. Importe o repositório na Vercel e defina **Root Directory** como `Frontend`.
2. Build Command: `npm run build` — Output Directory: `dist`.
3. Configure a variável `VITE_API_URL` com a URL pública da API.

O arquivo `vercel.json` já inclui o rewrite de SPA para as rotas do cliente.
