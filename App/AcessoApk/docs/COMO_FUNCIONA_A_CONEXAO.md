# Como o app Android conversa com a API do ACESSO

Explicação para quem está aprendendo. Os nomes de pessoas, e-mails e tokens abaixo são **fictícios**.

## 1. A ideia geral

```
Tela (Activity/Fragment)
   -> ViewModel                 (guarda o estado e chama o repositório)
      -> Repositório            (sabe QUAL rota da API chamar e como ler a resposta)
         -> ExecutorHttp        (envia a requisição pela internet, fora da thread da tela)
            -> API Express      (Site/Backend, Node.js)
               -> PostgreSQL    (banco hospedado no Supabase)
```

O app **nunca fala direto com o banco**. Só a API tem a senha do banco. O app só conhece o endereço
da API e o token da pessoa logada.

## 2. Quem faz o quê no app

| Classe | Função |
|---|---|
| `servicos/ClienteApi` | **Monta a URL**: junta a base (`URL_API`) com o caminho (`auth/login`) e põe o cabeçalho `Authorization: Bearer <token>` quando a chamada é de uma pessoa logada. |
| `servicos/ClienteHttp` | Guarda o cliente OkHttp (tempos limite, tipo JSON) e confere se um endereço é válido. |
| `repositorios/ExecutorHttp` | **Executa a requisição**: verifica internet, envia em outra thread, traduz erros e devolve o resultado na thread principal. Com sessão (`executarComSessao`), renova o token vencido e repete a chamada se a API responder 401. |
| `repositorios/RepositorioAutenticacaoApi` | Login, cadastro, `/auth/me`, sair, recuperar senha. Cada método monta o JSON, escolhe a rota e lê a resposta. |
| `repositorios/RepositorioConteudoApi` | Feed, vagas, pesquisa, painel da empresa, publicar e criar vaga. |
| `repositorios/LeitoresConteudoApi` | Converte o JSON da API nos objetos do app (`Vaga`, `Publicacao`...). |
| `repositorios/RenovadorSessao` | Renova o token uma única vez, mesmo que várias telas peçam ao mesmo tempo. |
| `servicos/TradutorErrosApi` | Transforma `{sucesso:false, mensagem, erros[...]}` em mensagens para a tela. |
| `utilitarios/GerenciadorSessao` | Guarda a sessão (SharedPreferences privado). |
| `repositorios/FabricaRepositorios` | Escolhe a implementação: `api` (real), `supabase`, `simulada`. |

## 3. Exemplo de uma requisição (dados fictícios)

A pessoa "Maria Exemplo" toca em **Entrar**.

1. `ViewModelLogin` chama `RepositorioAutenticacaoApi.entrar("maria@exemplo.test", "********")`.
2. O repositório monta o corpo: `{"email":"maria@exemplo.test","senha":"********"}`.
3. `ClienteApi.url("auth/login")` produz `http://10.0.2.2:3000/api/auth/login`.
4. `ExecutorHttp` envia `POST` com `Content-Type: application/json`.
5. A API (Express) valida os dados, procura o usuário na tabela `usuarios` (via Sequelize no PostgreSQL),
   compara a senha com o hash bcrypt e responde:

```json
{ "sucesso": true,
  "usuario": { "id": "…", "nome": "Maria Exemplo", "tipoUsuario": "candidato" },
  "token": "<JWT de 30 minutos>",
  "refreshToken": "<código longo e aleatório>" }
```

6. O repositório lê o JSON, `GerenciadorSessao` salva a sessão e a tela principal abre.

Depois, ao abrir o feed: `GET /api/postagens?page=1&limit=20` com `Authorization: Bearer <token>`.

## 4. Login, cadastro e tokens

- **Cadastro:** `POST /api/auth/register/candidato` ou `/register/empresa`. Empresa nova fica
  "pendente" até um administrador aprovar (o app mostra a tela de status).
- **Login:** `POST /api/auth/login` devolve dois tokens:
  - **token de acesso (JWT)**: dura ~30 minutos e vai em cada chamada;
  - **refresh token**: serve só para pedir um token novo em `POST /api/auth/refresh`.
    É **rotativo**: cada uso gera outro. Se um refresh antigo for reapresentado, o servidor derruba todas as
    sessões da conta. Por isso o app renova com um único pedido por vez (`RenovadorSessao`).
- **Erros importantes:** 401 = token inválido; `CONTA_BLOQUEADA` e `SENHA_ALTERADA` encerram a sessão; 429 = muitas tentativas.

## 5. Como o backend chega ao Supabase

O Supabase fornece o **PostgreSQL**. A API conecta com as variáveis `DB_HOST`, `DB_NAME`, `DB_USER`,
`DB_PASSWORD` (arquivo `.env` do backend, que **não** vai para o Git). Os modelos Sequelize
(`Site/Backend/src/models`) viram consultas SQL. Arquivos (fotos, anexos) vão para o Supabase Storage,
usando `SUPABASE_SERVICE_ROLE_KEY`, que também fica só no servidor.

## 6. Configurar a URL

| Onde o app roda | `URL_API` |
|---|---|
| Emulador, API no seu PC | `http://10.0.2.2:3000/api` (`10.0.2.2` = o "localhost" do PC visto do emulador) |
| Celular físico, mesma rede Wi-Fi | `http://IP-DO-PC:3000/api` (ex.: `192.168.0.10`). Precisa liberar esse IP em `app/src/debug/res/xml/configuracao_rede.xml` (só debug) e liberar a porta 3000 no firewall |
| API publicada (Render) | `https://<endereço-do-serviço>/api` (sempre HTTPS) |

Duas formas de configurar (qualquer uma):

- `local.properties`: `FONTE_AUTENTICACAO=api` e `URL_API=...`
- na linha de comando: `./gradlew installDebug -PFONTE_AUTENTICACAO=api -PURL_API=http://10.0.2.2:3000/api`

## 7. Como testar sozinho

1. **A API está no ar?** No navegador ou terminal: `http://localhost:3000/api/health` deve responder `{"sucesso":true,...}`.
2. **O emulador enxerga a API?** No navegador do emulador, abra `http://10.0.2.2:3000/api/health`.
3. Instale o app com `-PFONTE_AUTENTICACAO=api` e tente entrar.

| Sintoma | Causa provável |
|---|---|
| "O endereço da API ainda não foi configurado" | `URL_API` vazia ou sem `http://`/`https://` |
| "Servidor inacessível" | API desligada, IP errado, firewall, ou `localhost` usado no lugar de `10.0.2.2` |
| `Cleartext HTTP traffic not permitted` | HTTP para um endereço que não está em `configuracao_rede.xml`, ou build release |
| 401 logo no login | e-mail/senha errados |
| 429 | limite de 10 tentativas / 15 min em login e cadastro |
| "Integração pendente" | a fonte ativa não é `api` |

## 8. O que está conectado hoje

| Parte | Estado |
|---|---|
| Login, cadastro, renovação de token, sair, status da empresa, recuperar senha | Código pronto e testado **só com servidor falso** |
| Feed, vagas, pesquisa, painel, publicar, criar vaga | Código pronto e testado **só com servidor falso** |
| Detalhe da vaga, candidatura, minhas candidaturas, curtir, perfil próprio e de outras contas | Código pronto e testado **só com servidor falso** |
| Chat (`/conversas`: lista, abrir, pode-iniciar, mensagens, enviar, marcar lidas, não lidas) | `RepositorioMensagensApi`, testado **só com servidor falso**. Sem Socket.IO: a conversa aberta consulta a API a cada 5 s |
| Notificações (`/notificacoes`: lista, não lidas, marcar uma/todas) | `RepositorioNotificacoesApi`, testado **só com servidor falso** |
| Contra a API real (Render) | Só leitura conferida: `/health` 200, `/vagas` e `/publico/home` 200 (consultam o banco), rotas protegidas 401 sem token. **Fluxos com login não testados** (exigem contas reais) |
| Comentar (com respostas), editar/excluir a própria publicação, seguir (pessoa e empresa, com pedido em perfil privado), editar perfil, foto/capa/logo (upload multipart), imagens do feed | `RepositorioSocialApi` e `RepositorioConteudoApi`. Testado com servidor falso **e** num servidor Express de teste que usa o middleware de upload real do backend (ver CONTINUIDADE.md) |
