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
| `npm run criar-admin` | Cria/atualiza a conta administrativa conforme o script. |
| `npm test` | Executa a suíte de testes do backend. |

## Deploy (Render)

O arquivo `render.yaml` na pasta do Backend descreve a configuração do serviço.
Cadastre as variáveis de ambiente do `.env.example` no painel do Render. O deploy deve executar
`npm run migrate` antes de iniciar a nova versão da API.

Consulte também o README da raiz do repositório para os comandos completos de desenvolvimento
do frontend e do app.
