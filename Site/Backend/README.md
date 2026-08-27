# ACESSO — Backend

API REST da plataforma ACESSO (inclusão profissional para PCD e profissionais 50+).

## Stack

- Node.js 20 LTS + Express 5 (ESM)
- Sequelize + PostgreSQL (Supabase)
- JWT + bcrypt para autenticação
- Helmet, CORS, rate limit e validação com express-validator
- Arquitetura em camadas: Rotas → Controllers → Services → Models

## Requisitos

- Node.js 20 LTS ou superior
- npm 10 ou superior
- Uma instância PostgreSQL (local ou Supabase)

## Executando localmente

```bash
npm install
cp .env.example .env   # no Windows: copy .env.example .env
npm run dev
```

A API sobe em `http://localhost:3000/api` e o health check fica em
`GET /api/health`.

## Variáveis de ambiente

Todas as credenciais vêm exclusivamente do arquivo `.env` — nenhum valor
sensível está no código. Veja `.env.example` para a lista completa
(`DB_*`, `JWT_SECRET`, `FRONTEND_URL`, `UPLOAD_DIR`, entre outras).

O processo falha imediatamente no boot caso alguma variável obrigatória
esteja ausente ou o `JWT_SECRET` tenha menos de 32 caracteres.

## Estrutura

```
src/
├── config/       Variáveis de ambiente, Sequelize e conexão
├── controllers/  Camada HTTP (request/response)
├── middlewares/  Autenticação, RBAC, upload, erros, rate limit
├── models/       Models Sequelize e associações
├── routes/       Definição das rotas da API
├── services/     Regras de negócio
├── utils/        JWT, bcrypt, erros, paginação, autorização
├── validators/   Validações de entrada (express-validator)
├── app.js        Configuração do Express
└── server.js     Bootstrap do servidor
```

Os arquivos enviados por upload são gravados na pasta definida em
`UPLOAD_DIR` (padrão `uploads/`), criada automaticamente na primeira execução.

## Scripts

| Script          | Descrição                          |
| --------------- | ---------------------------------- |
| `npm run dev`   | Desenvolvimento com recarga (nodemon) |
| `npm start`     | Execução em produção               |

## Deploy (Render)

1. Crie um **Web Service** apontando para este repositório.
2. Root Directory: `Backend`.
3. Build Command: `npm install` — Start Command: `npm start`.
4. Cadastre as variáveis de ambiente do `.env.example` no painel do Render.
5. Inclua a URL pública do frontend em `FRONTEND_URL` para liberar o CORS.

O arquivo `render.yaml` na raiz do repositório já descreve esse serviço.
