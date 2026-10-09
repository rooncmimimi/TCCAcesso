# TCCACESSO

Plataforma web de inclusão profissional para pessoas com deficiência (PCD) e
profissionais 50+, conectando candidatos a empresas com vagas realmente
inclusivas.

## Organização do repositório

```
TCCACESSO/
├── Site/
│   ├── Backend/    API REST (Node.js + Express + Sequelize + PostgreSQL)
│   └── Frontend/   Aplicação web (React + TypeScript + Vite + TanStack Router)
└── App/
    └── AcessoApk/  Aplicativo Android (Java + XML; login pelo Supabase ou pela API do Site)
```

Cada pasta em `Site/` é um projeto independente com seu próprio `package.json`,
`.env.example` e README com instruções detalhadas.

## Começando

Abra dois terminais no Visual Studio Code:

```bash
# Terminal 1 — API
cd Site/Backend
npm install
cp .env.example .env
npm run dev

# Terminal 2 — Interface
cd Site/Frontend
npm install
cp .env.example .env
npm run dev
```

No Windows, use `copy .env.example .env`.

- API: `http://localhost:3000/api`
- Interface: `http://localhost:5173`

## Banco de dados

PostgreSQL (Supabase). A conexão é configurada exclusivamente por variáveis de
ambiente (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`).
Nenhuma credencial fica no código.

## Hospedagem

| Camada    | Serviço | Configuração                                        |
| --------- | ------- | --------------------------------------------------- |
| Frontend  | Vercel  | Root Directory `Site/Frontend`, build `npm run build`, saída `dist` |
| Backend   | Render  | Root Directory `Site/Backend`, start `npm start` (ver `render.yaml`) |

Com o repositório conectado a esses serviços, cada `git push` na branch
principal dispara o deploy automaticamente.

## Integração contínua (CI)

`.github/workflows/ci.yml` roda lint, checagem de tipos e a suíte de testes
dos três projetos (App Android, Backend, Frontend) em todo push e pull request —
nenhum precisa de banco de dados real nem de segredo nenhum (os testes de
cada projeto já são isolados por design). Ver comentários no próprio
workflow para o detalhamento de cada job.

## App Android

O app fica em `App/AcessoApk`: Android nativo em Java. Hoje o login padrão
ainda é o Supabase Auth; o caminho para usar a mesma API do site
(`/api/auth`) já está no código e o plano de integração está em
`App/AcessoApk/docs/PLANEJAMENTO_BACKEND.md`. Abra a pasta no Android Studio e
siga o `App/AcessoApk/README.md`. O CI compila o APK de debug e roda os
testes JUnit em todo push e pull request.

## Acessibilidade

O projeto segue as diretrizes WCAG 2.2: contraste ajustável, escala tipográfica,
fonte para dislexia, leitura por voz com consentimento, navegação por teclado,
marcos semânticos e integração com o VLibras.

## Licença

MIT.
