# Planejamento do back-end para o app ACESSO

Documento para a equipe do TCC. Explica como o site, o aplicativo e a API se encaixam, o que já
existe, o que falta e em que ordem fazer a integração do app com a API.

Tudo aqui foi conferido no código em 09/10/2026 (branch `app/telas-mobile-autenticacao`).
Quando algo for **proposta** (ainda não existe), está escrito assim. Os JSON de exemplo usam
dados fictícios e estão marcados como **exemplo**.

---

## 1. Visão geral

```
 ┌──────────────┐      HTTPS + JSON       ┌────────────────────────┐      SQL      ┌──────────────┐
 │ Site (React) │ ───────────────────────▶│ API (Express, Node.js) │ ─────────────▶│ PostgreSQL   │
 └──────────────┘                         │ Site/Backend           │               │ (Supabase)   │
 ┌──────────────┐      HTTPS + JSON       │ /api/...               │               └──────────────┘
 │ App Android  │ ───────────────────────▶│                        │──▶ Supabase Storage (arquivos)
 │ App/AcessoApk│   (meta desta etapa)    └────────────────────────┘──▶ Brevo (e-mails)
 └──────────────┘
```

- O **site** já usa a API para tudo (login, vagas, feed, mensagens, painel da empresa).
- O **app** hoje faz login **direto no Supabase Auth** (fonte `supabase`, a padrão), com uma
  tabela própria `perfis`. Isso cria **duas bases de usuários separadas**: quem se cadastra no
  app não consegue entrar no site, e vice-versa.
- **Recomendação:** o app passa a usar a mesma API do site (fonte `api`). Assim existe uma conta
  só, as mesmas regras e o mesmo banco. O app já tem esse caminho pronto para a autenticação
  (`RepositorioAutenticacaoApi`); falta testar com a API rodando e fazer o conteúdo.

## 2. Tecnologias e responsabilidades

| Parte | Tecnologias | Responsabilidade |
|---|---|---|
| Site (`Site/Frontend`) | React, TypeScript, Vite, TanStack Router | Telas web. Guarda os tokens no `localStorage` do navegador. |
| API (`Site/Backend`) | Node.js, Express, Sequelize, express-validator, JWT, bcrypt, Socket.IO | **Regras de negócio e validação de verdade**, autenticação, permissões. |
| Banco | PostgreSQL (hospedado no Supabase) | Dados. Esquema em `Site/Backend/migrations/0001_esquema_inicial.sql`. |
| Arquivos | Supabase Storage | Fotos, capas, anexos (a API gera os links). |
| E-mail | Brevo (`BREVO_API_KEY`) | Confirmação de cadastro e recuperação de senha. |
| App (`App/AcessoApk`) | Java, XML, MVVM, OkHttp, Gson | Telas Android. Valida os campos para ajudar a pessoa, mas **quem decide é a API**. |
| Publicação | Render (`render.yaml`, serviço `acesso-backend`), Vercel (site) | Servidores de produção. |

## 3. O que já existe e o que falta

### Na API (já existe)
- Autenticação completa: cadastro de candidato e de empresa, login, renovação de sessão,
  logout, esqueci/redefinir senha, confirmação de e-mail por código, pausar e excluir conta.
- Empresa nasce com `status_aprovacao = 'pendente'`; a moderação aprova pelo painel admin.
- Rotas de conteúdo usadas pelas abas do app: postagens, vagas, busca, painel da empresa.
- CORS: requisições **sem** cabeçalho `Origin` (caso dos apps nativos) já são aceitas
  (`src/app.js`).

### No app (já existe)
- Contrato `RepositorioAutenticacao` com três implementações, escolhidas em `FabricaRepositorios`
  pela configuração `FONTE_AUTENTICACAO`:
  - `supabase` (padrão): o login que já funcionava.
  - `api`: chama as rotas reais de `/api/auth`. **Escrito a partir do código da API e coberto por
    testes de leitura de JSON, mas ainda não executado contra a API rodando.**
  - `simulada`: respostas falsas, **só no build de debug**, com a faixa "Modo demonstração" em
    todas as telas. Nunca deve ser apresentada como login real.
- Sessão com tipo de conta (pessoa/empresa) e status da empresa; navegação decidida por
  `Navegacao.destinoPara(sessao)`.
- Tradução dos erros da API (`TradutorErrosApi`), inclusive erro por campo.
- Telas: apresentação, login, cadastro (pessoa e empresa), esqueci senha, nova senha, termos,
  área logada com 5 abas e tela de empresa em análise.

### Falta (em ordem de importância)
1. **Testar a autenticação do app contra a API rodando** (passo a passo na seção 11).
2. **Conteúdo pela API:** criar `RepositorioConteudoApi` (hoje as abas mostram "Integração
   pendente", sem inventar dados, fora do modo demonstração).
3. **Confirmação de e-mail por código** no app (a API manda um código de 6 dígitos; o app hoje
   só diz "confirme seu e-mail").
4. **Recuperação de senha:** o link do e-mail da API abre a página do site
   (`/redefinir-senha?token=...`), não o app. Ver seção 8.4.
5. **Status da empresa após renovar a sessão:** `/auth/refresh` não devolve a empresa; o app
   mantém o último status conhecido. Ver seção 8.3.
6. **Cidade e data de nascimento do cadastro de pessoa:** o app pede esses campos, mas
   `POST /api/auth/register/candidato` não os lê (ver seção 7).
7. Armazenamento cifrado dos tokens (seção 9).

## 4. Como o login e o cadastro funcionam

### Cadastro
1. A pessoa escolhe **Pessoa candidata** ou **Empresa** e preenche o formulário.
2. O app valida (mesmas regras do site; ver `Validador.java`) e mostra o erro ao lado do campo.
3. O app envia para a API. A API **valida de novo** e pode recusar (ex.: e-mail ou CNPJ já
   cadastrado). Erros por campo voltam e aparecem no campo certo.
4. Resposta:
   - Se o envio de e-mail estiver configurado no servidor (`BREVO_API_KEY`): a conta é criada
     **sem sessão** (`pendenteVerificacaoEmail: true`) e a pessoa precisa confirmar o e-mail.
   - Sem envio de e-mail: a conta já volta com sessão e o app entra direto.
5. Empresa entra com status `pendente` e vê a **tela de empresa em análise** até ser aprovada.

### Login
1. `POST /api/auth/login` com e-mail e senha.
2. Três desfechos possíveis com senha correta:
   - sessão emitida → app salva e vai para a área da conta;
   - `emailNaoVerificado` → app pede para confirmar o e-mail;
   - `contaPausada` → app pergunta "Reativar sua conta?" e repete o login com
     `confirmarReativacao: true`.
3. Senha errada, conta bloqueada ou desativada → erro com a mensagem da API.

### Para onde o app leva a pessoa

| Situação | Tela |
|---|---|
| Sem sessão | Apresentação (sempre) |
| Pessoa candidata | Área logada (Início, Vagas, Criar, Pesquisa, Perfil) |
| Empresa aprovada | Área logada com a aba "Painel" no lugar de "Vagas" |
| Empresa pendente, reprovada ou suspensa | Tela de status (só sair ou falar com a equipe) |

Depois do login a pilha de telas é apagada: o botão Voltar **não** volta para o login nem para
a apresentação. Ao sair da conta, o app volta para a apresentação.

## 5. Como o app envia e recebe dados

- Base: `URL_API` (ex.: `http://10.0.2.2:3000/api`). Configurada no `local.properties` ou com
  `-PURL_API=...`; chega ao código por `BuildConfig.URL_API`.
- Formato: JSON (`Content-Type: application/json`).
- Rotas protegidas: cabeçalho `Authorization: Bearer <token>`.
- Fluxo no código: **Tela → ViewModel → Repositório → ExecutorHttp (OkHttp) → API**.
  As telas nunca fazem HTTP; o ViewModel expõe `carregando`, dados e mensagem de erro.
- Erros da API sempre neste formato (`erroMiddleware.js`, `validacaoMiddleware.js`):

```json
{ "sucesso": false, "mensagem": "Erro de validação.",
  "erros": [ { "campo": "cnpj", "mensagem": "Informe um CNPJ válido." } ] }
```

| Código | O que o app faz |
|---|---|
| 422 com `erros` | Mostra cada mensagem no campo correspondente. |
| 401 / 403 | Mostra a mensagem da API; na renovação, encerra a sessão. |
| 409 | Mostra a mensagem (ex.: "Este e-mail já está cadastrado."). |
| 429 | "Muitas tentativas seguidas. Aguarde alguns minutos." |
| 5xx | "O serviço está indisponível no momento." (não mostra detalhe técnico). |
| Sem internet | "Sem conexão com a internet." |

## 6. Endpoints

Todas as rotas abaixo **existem** em `Site/Backend/src/routes`, com o prefixo `/api`.

### 6.1 Autenticação (já usadas pelo `RepositorioAutenticacaoApi`)

| Método e rota | Uso no app | Situação no app |
|---|---|---|
| `POST /auth/register/candidato` | Cadastro de pessoa | Implementado, não testado com servidor |
| `POST /auth/register/empresa` | Cadastro de empresa | Implementado, não testado com servidor |
| `POST /auth/login` | Login | Implementado, não testado com servidor |
| `POST /auth/refresh` | Renovar sessão ao abrir o app | Implementado, não testado com servidor |
| `POST /auth/logout` | Sair | Implementado, não testado com servidor |
| `POST /auth/senha/esqueci` | Esqueci minha senha | Implementado, não testado com servidor |
| `POST /auth/senha/redefinir` | Nova senha (`token`, `novaSenha`) | Implementado; o link do e-mail abre o site (seção 8.4) |
| `POST /auth/cadastro/confirmar-email` | Confirmar e-mail (`email`, `codigo`) | **Falta tela no app** |
| `POST /auth/cadastro/reenviar-confirmacao` | Reenviar código | **Falta no app** |
| `GET /auth/me` | Dados da conta, com `empresa` | **Falta no app** (útil para o status da empresa) |

### 6.2 Conteúdo (rotas existentes que o app ainda não chama)

| Aba do app | Rota existente |
|---|---|
| Início (feed) | `GET /postagens` |
| Criar publicação | `POST /postagens` (`conteudo` obrigatório) |
| Vagas (pessoa) | `GET /vagas` (filtros como no site) e `GET /vagas/:id` |
| Candidatar-se | `POST /vagas/:vagaId/candidaturas` |
| Painel (empresa) | `GET /dashboard/empresa` e `GET /vagas/minhas` |
| Publicar vaga | `POST /vagas` (só empresa; vaga de empresa não aprovada não aparece para o público) |
| Pesquisa | `GET /busca` |
| Perfil (editar) | `PUT /usuarios/:id` e rotas de `/perfil` |

### 6.3 Propostas (não existem)

Nenhuma rota nova é necessária para o login. As propostas são pequenas mudanças em rotas
**existentes**, para a equipe decidir:

- **Proposta A:** `POST /auth/register/candidato` aceitar `cidade`, `estado` e `dataNascimento`
  (a tabela `candidatos` já tem as colunas `cidade`, `estado` e `data_nascimento`). Alternativa
  sem mexer na API: o app deixa esses campos para depois, na edição do perfil.
- **Proposta B:** `POST /auth/refresh` devolver também `usuario.empresa`, como o login faz.
  Alternativa sem mexer na API: o app chama `GET /auth/me` depois de renovar.

## 7. Banco de dados

Esquema real: `Site/Backend/migrations/0001_esquema_inicial.sql` (tabelas principais abaixo).

| Tabela | Para que serve | Colunas importantes |
|---|---|---|
| `usuarios` | Toda conta | `id`, `nome`, `email` (único), `senha_hash`, `tipo_usuario`, `ativo`, `bloqueado`, `pausado_pelo_usuario`, `email_verificado` |
| `candidatos` | Dados da pessoa | `usuario_id`, `cpf_cifrado`, `cpf_hash`, `data_nascimento`, `cidade`, `estado` |
| `empresas` | Dados da empresa | `usuario_id`, `cnpj_cifrado`, `cnpj_hash`, `razao_social`, `status_aprovacao` (padrão `pendente`) |
| `sessoes` | Refresh tokens | `usuario_id`, `token_hash`, `expira_em`, `revogada_em`, `substituida_por_id` |
| `codigos_verificacao_email`, `codigos_recuperacao_senha` | Códigos e tokens de e-mail | guardados só como hash |
| `vagas`, `candidaturas`, `postagens`, `comentarios`, `curtidas` | Conteúdo | — |
| `tokens_push` | Notificações push | — |

Observações:
- CPF e CNPJ ficam **cifrados**, com um hash para checar duplicidade.
- A tabela `perfis` (`App/AcessoApk/supabase/001_perfis.sql`) é **só do app antigo** (fonte
  `supabase`). Com a fonte `api` ela deixa de ser usada. **Não apagar** até decidir o que fazer
  com contas já criadas por ela (ver seção 11, etapa 5).
- Nenhuma alteração destrutiva no banco é necessária para integrar o app.

## 8. Autenticação, autorização e sessão

### 8.1 Tokens
- **Token de acesso (JWT):** curto, expira em 30 minutos por padrão (`JWT_EXPIRES_IN`). Vai no
  cabeçalho `Authorization`. O app só lê o campo `exp` para saber quando renovar; **quem confere
  a assinatura é a API**.
- **Refresh token:** valor aleatório longo; o banco guarda só o hash. A cada renovação ele é
  **trocado** (o antigo deixa de valer).

### 8.2 Sessão no app
- Ao abrir o app (área logada), `ViewModelSessao.verificar()`: se o token venceu, chama
  `/auth/refresh`. Se a API disser que a sessão acabou (401/403), o app limpa tudo e volta para a
  apresentação com o aviso "Sua sessão expirou". Sem internet, a pessoa continua logada.
- Ao sair: `POST /auth/logout` (mesmo que falhe, a sessão local é apagada).
- Uma sessão de outra fonte (ex.: token simulado) é descartada ao trocar `FONTE_AUTENTICACAO`.

### 8.3 Proteção das telas e autorização
- `TelaPrincipal` e `TelaStatusEmpresa` conferem a sessão ao abrir e redirecionam se preciso.
- Isso é só **experiência**: a proteção de verdade está na API (`autenticacaoMiddleware`,
  `exigirTipoUsuarioMiddleware`, `garantirEmpresaAprovadaMiddleware`, `utils/autorizacao.js`).
  Uma empresa pendente que tentar publicar vaga por fora do app continua sendo barrada.
- Pendência: depois do `/auth/refresh`, o status da empresa não é atualizado (Proposta B).

### 8.4 Recuperação de senha
- A API envia um e-mail com link para o **site** (`FRONTEND_URL/redefinir-senha?token=...`).
- A `TelaNovaSenha` do app hoje entende o link do Supabase (`acesso://redefinir-senha#access_token=...`).
- Caminho mais simples: com a fonte `api`, a pessoa redefine a senha **pelo site** (o link já
  funciona) e depois entra no app. Opcional mais tarde: Android App Links para abrir o app pelo
  mesmo link.

## 9. Segurança básica

- **Senha:** nunca é salva no app. No servidor fica com bcrypt.
- **Tokens no aparelho:** hoje em `SharedPreferences` privado do app (`MODE_PRIVATE`), com
  backup desligado (`allowBackup="false"`). Melhoria recomendada: cifrar os tokens com uma chave
  do **Android Keystore** antes de gravar.
- **HTTPS:** obrigatório em produção. O build de debug libera HTTP **só** para `10.0.2.2`,
  `localhost` e `127.0.0.1` (`app/src/debug/res/xml/configuracao_rede.xml`); o release não
  recebe essa exceção.
- **Segredos:** o `local.properties` não vai para o Git. No app só podem existir valores
  públicos (endereço da API, chave `anon` do Supabase). Nunca colocar no app `JWT_SECRET`,
  `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY` ou senha do banco: eles ficam só no servidor.
- **Logs:** não registrar tokens, senhas, CPF ou CNPJ em `Log.d`.
- **Limite de tentativas:** a API já limita login e cadastro (resposta 429).

## 10. Ambientes

| Ambiente | `URL_API` no app | Observações |
|---|---|---|
| Emulador + API no seu computador | `http://10.0.2.2:3000/api` | `npm run dev` em `Site/Backend`. `10.0.2.2` é o "localhost" do computador visto do emulador. |
| Celular físico na mesma rede | `http://IP-DO-COMPUTADOR:3000/api` | Liberar esse IP em `configuracao_rede.xml` (só debug) ou usar HTTPS. |
| Produção | `https://...` (endereço do serviço no Render) | Sempre HTTPS. |

Exemplo de `local.properties` (só as linhas do app; ver `local.properties.example`):

```properties
FONTE_AUTENTICACAO=api
URL_API=http://10.0.2.2:3000/api
```

Ou sem editar arquivo: `./gradlew installDebug -PFONTE_AUTENTICACAO=api -PURL_API=http://10.0.2.2:3000/api`.

A API precisa do seu próprio `.env` (`DB_*`, `JWT_SECRET` com 32+ caracteres etc.; ver
`Site/Backend/README.md`). Sem `BREVO_API_KEY`, o cadastro entra direto sem confirmação de e-mail,
o que é prático para testar.

## 11. Plano de implementação por etapas

1. **Testar a autenticação real** (sem escrever código novo):
   rodar a API local, instalar o app com `FONTE_AUTENTICACAO=api` e conferir: cadastro de pessoa,
   cadastro de empresa (deve cair na tela "em análise"), login, erro de senha, e-mail duplicado
   (erro no campo), sair, reabrir o app logado. Aprovar a empresa pelo painel admin do site e
   entrar de novo (deve abrir o Painel). Corrigir o que aparecer.
2. **Tela de confirmação de e-mail por código** (`/auth/cadastro/confirmar-email` e
   `/reenviar-confirmacao`), aberta depois do cadastro e quando o login responder
   `emailNaoVerificado`.
3. **Status da empresa:** chamar `GET /auth/me` depois do refresh (ou Proposta B) e incluir um
   botão "Verificar novamente" na tela de empresa em análise.
4. **Conteúdo:** criar `RepositorioConteudoApi` implementando `RepositorioConteudo`, uma aba
   por vez: Vagas → Início → Pesquisa → Painel → Criar. Ligar em `FabricaRepositorios`.
5. **Trocar a fonte padrão para `api`** e decidir o destino das contas criadas na tabela `perfis`
   (provavelmente pedir novo cadastro, já que são contas de teste).
6. Segurança: cifrar tokens com o Keystore; revisar os logs.
7. Depois: editar perfil, candidaturas, notificações (`/notificacoes/push-token` existe, mas o app
   nativo precisaria de Firebase Cloud Messaging).

## 12. Exemplos de requisições e respostas

> **Exemplos** com dados fictícios, montados a partir do código da API. Os campos são os reais;
> valores como tokens e IDs são inventados.

**Login com sucesso** — `POST /api/auth/login`

```json
{ "email": "joana@exemplo.com", "senha": "Acesso@2026" }
```

```json
{
  "sucesso": true,
  "usuario": { "id": "8a1f...", "nome": "Joana Exemplo", "email": "joana@exemplo.com",
               "tipoUsuario": "candidato" },
  "token": "eyJhbGciOi...",
  "refreshToken": "4f9c2b..."
}
```

**Login de empresa** — a resposta inclui a empresa com o status:

```json
{ "sucesso": true,
  "usuario": { "id": "51b0...", "tipoUsuario": "empresa", "empresa": { "statusAprovacao": "pendente" } },
  "token": "eyJ...", "refreshToken": "a7d1..." }
```

**E-mail ainda não confirmado** (senha correta, sem sessão):

```json
{ "sucesso": true, "emailNaoVerificado": true, "email": "joana@exemplo.com" }
```

**Cadastro de empresa** — `POST /api/auth/register/empresa`

```json
{ "nome": "Carlos Responsável", "email": "rh@empresa-exemplo.com", "senha": "Acesso@2026",
  "cnpj": "11222333000181", "razaoSocial": "Empresa Exemplo Ltda",
  "porte": "pequena", "cidade": "Campinas", "estado": "SP", "cep": "13010000" }
```

CPF, CNPJ, CEP e telefone vão **só com dígitos** (o app tira a máscara antes de enviar).

**Erro de validação** (422):

```json
{ "sucesso": false, "mensagem": "Erro de validação.",
  "erros": [ { "campo": "senha", "mensagem": "A senha deve conter ao menos um caractere especial." } ] }
```

**Renovar sessão** — `POST /api/auth/refresh`

```json
{ "refreshToken": "4f9c2b..." }
```

Resposta: `usuario`, `token` e um **novo** `refreshToken` (sem `usuario.empresa`).

**Rota protegida** (exemplo):

```
GET /api/vagas/minhas
Authorization: Bearer eyJhbGciOi...
```

## 13. Próximos passos recomendados

1. Fazer a etapa 1 da seção 11 e registrar o resultado no `CONTINUIDADE.md`.
2. Decidir as Propostas A e B com quem cuida da API.
3. Implementar a confirmação de e-mail por código.
4. Começar o `RepositorioConteudoApi` pela aba Vagas (é a mais simples e a mais importante para
   quem procura emprego).
5. Só então trocar a fonte padrão do app para `api`.
