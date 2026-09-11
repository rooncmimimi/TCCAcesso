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
    └── AcessoApk/  Aplicativo mobile (React Native + Expo)
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
dos três projetos (App, Backend, Frontend) em todo push e pull request —
nenhum precisa de banco de dados real nem de segredo nenhum (os testes de
cada projeto já são isolados por design). Ver comentários no próprio
workflow para o detalhamento de cada job.

## Build do app mobile (EAS)

`App/AcessoApk/eas.json` define os perfis de build (`development`,
`preview`, `production`) do [EAS Build](https://docs.expo.dev/build/introduction/).
`.github/workflows/eas-build.yml` aciona um build manualmente (aba Actions
do GitHub → "EAS Build (App)" → "Run workflow") — nunca automático a cada
push, para não consumir cota de build sem necessidade.

**Pendente (exige uma conta Expo de verdade, fora do alcance de qualquer
sessão automatizada)**, antes do workflow funcionar pela primeira vez:

1. Rodar `eas init` (ou `eas build:configure`) uma vez, localmente, dentro
   de `App/AcessoApk`, autenticado na conta Expo do projeto — isso
   preenche `extra.eas.projectId` em `app.json` sozinho.
2. Gerar um token em <https://expo.dev/settings/access-tokens> e salvá-lo
   como o segredo do repositório `EXPO_TOKEN` (Settings → Secrets and
   variables → Actions, no GitHub).

Sem isso, o workflow falha cedo com uma mensagem explicando exatamente o
que falta — nunca tenta simular uma conta/projeto que não existe.

## Acessibilidade

O projeto segue as diretrizes WCAG 2.2: contraste ajustável, escala tipográfica,
fonte para dislexia, leitura por voz com consentimento, navegação por teclado,
marcos semânticos e integração com o VLibras.

## Licença

MIT.
