# TCCACESSO

Plataforma web de inclusão profissional para pessoas com deficiência (PCD) e
profissionais 50+, conectando candidatos a empresas com vagas realmente
inclusivas.

## Organização do repositório

```
TCCACESSO/
├── Backend/    API REST (Node.js + Express + Sequelize + PostgreSQL)
└── Frontend/   Aplicação web (React + TypeScript + Vite + TanStack Router)
```

Cada pasta é um projeto independente com seu próprio `package.json`, `.env.example`
e README com instruções detalhadas.

## Começando

Abra dois terminais no Visual Studio Code:

```bash
# Terminal 1 — API
cd Backend
npm install
cp .env.example .env
npm run dev

# Terminal 2 — Interface
cd Frontend
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
| Frontend  | Vercel  | Root Directory `Frontend`, build `npm run build`, saída `dist` |
| Backend   | Render  | Root Directory `Backend`, start `npm start` (ver `render.yaml`) |

Com o repositório conectado a esses serviços, cada `git push` na branch
principal dispara o deploy automaticamente.

## Acessibilidade

O projeto segue as diretrizes WCAG 2.2: contraste ajustável, escala tipográfica,
fonte para dislexia, leitura por voz com consentimento, navegação por teclado,
marcos semânticos e integração com o VLibras.

## Licença

MIT.
