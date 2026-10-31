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
- Um banco PostgreSQL no Supabase. Num Postgres comum, crie antes os papéis `anon` e `authenticated`:
  o `0001_esquema_inicial.sql` os usa em `REVOKE` e falha sem eles (`role "anon" does not exist`).

## Executando localmente

```bash
npm install
cp .env.example .env   # no Windows: copy .env.example .env
npm run migrate        # cria as tabelas do banco que o .env aponta
npm run dev
```

A API sobe em `http://localhost:3000/api` e o health check fica em
`GET /api/health`.

## Banco de dados

O schema da aplicação fica em `public` no PostgreSQL. A conexão usa exclusivamente as variáveis
`DB_*` do ambiente; credenciais nunca devem ser incluídas no frontend.

- [Guia do schema](ESQUEMA_DO_BANCO.md): grupos de tabelas, relações e decisões de normalização.
- [Histórico e execução das migrations](migrations/README.md): ordem, regras e procedimento de atualização.
- `src/models/`: definição dos models Sequelize.
- `src/models/index.js`: associações entre entidades.
- `migrations/`: fonte versionada da estrutura física do banco.

**Importante:** não use `sequelize.sync()` para evoluir o banco de produção. Mudanças estruturais devem
ser migrations incrementais e aplicadas com `npm run migrate`.

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

| Script | Descrição |
| --- | --- |
| `npm run dev` | Desenvolvimento com recarga (nodemon). |
| `npm start` | Execução da API. |
| `npm run migrate` | Aplica somente migrations ainda não registradas. |
| `npm run criar-admin` | Cria uma conta de administrador. Com `--promover`, transforma uma conta existente em administradora: o perfil antigo e o que depende dele (candidaturas, vagas) são apagados, depois de confirmação. |
| `npm test` | Executa a suíte de testes do backend. |

## Deploy (Render)

O `render.yaml` fica na **raiz do repositório** (com `rootDir: Site/Backend`) e descreve o serviço, mas só
vale para um serviço criado a partir dele: um serviço criado à mão no painel ignora o arquivo. Cadastre as
variáveis de ambiente do `.env.example` no painel do Render.

As migrations só rodam no deploy se o **Build Command** do serviço, no painel, for
`npm install && npm run migrate` (Settings → Build Command). Se não for, rode `npm run migrate` à mão,
apontando para o banco de produção, antes de publicar código que dependa de uma migration nova.

Consulte também o README da raiz do repositório para os comandos completos de desenvolvimento
do frontend e do app.
