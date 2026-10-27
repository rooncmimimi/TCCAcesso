# Continuidade — app mobile, autenticação e integração com o back-end

Registro para retomar o trabalho em outra sessão. Última atualização: 27/10/2026,
branch `app/telas-mobile-autenticacao`.

> **O app compila**, 211 testes JUnit (197 passam; os 14 do contrato com a API real ficam ignorados sem
> `ACESSO_API_TESTE_URL`) e o `lintDebug` não tem erros nem avisos de acessibilidade (27/10/2026).
> **A comunicação com a API foi testada de verdade** (27/10): o código do app (corpos, leitores e
> repositórios) contra o backend de `main` com PostgreSQL local — 14 de 14. A API publicada no Render
> responde e está ligada ao banco. As telas das duas últimas sessões **não** foram abertas em emulador nem
> celular (o ambiente não tinha virtualização).

Documentos relacionados:
- `App/AcessoApk/docs/PLANEJAMENTO_BACKEND.md` — como o app vai usar a API, endpoints reais,
  propostas e plano por etapas.
- `App/AcessoApk/README.md` — como configurar, rodar e testar o app.
- `App/AcessoApk/docs/ACESSIBILIDADE.md` — auditoria de acessibilidade, recursos do celular (Android e iOS)
  separados do que o app precisa fazer, e roteiro de teste em aparelho.

## 1. Histórico

| Commit | O que foi feito |
|---|---|
| `b76d8bf` (08/10) | Estrutura de autenticação (Supabase / API / simulada), sessão com tipo de conta, validações iguais às da API, ícone com o símbolo do site, layouts das abas. App não compilava. |
| `2859ee0` (09/10) | App volta a compilar: `TelaPrincipal`, `TelaStatusEmpresa`, `FragmentoPerfil`, `FragmentoPesquisa`, apresentação/login/cadastro ligados à `Navegacao`; remoção de `FragmentoEmConstrucao` e `GerenciadorApresentacao`; testes novos. |
| `1274db5` (09/10) | Correções vistas no emulador (Início em branco, topo do login cortado, cores do Material 3, rótulos cortados) e ajustes visuais. |
| `81f8715` (09/10) | `PLANEJAMENTO_BACKEND.md`, README do app e da raiz, este arquivo. |
| (este commit) | Correção do fechamento do app ao entrar sem servidor configurado (ver abaixo). |

### Correção: app fechava ao tocar em "Entrar"

Sintoma: tela preta, volta ao login e, na segunda tentativa, "ACESSO keeps stopping".
Logcat: `IllegalArgumentException: Expected URL scheme 'http' or 'https' but no scheme was found
for /auth/...` em `ClienteSupabase.requisicao`, chamado por `RepositorioAutenticacaoSupabase.entrar`.
Causa: com a fonte padrão (`supabase`) e `URL_SUPABASE` vazia no `local.properties`, a
requisição era montada **antes** da checagem "está configurado?", e o OkHttp lançava a exceção
na thread principal. O mesmo acontecia na fonte `api` com `URL_API` vazia.
Correção: as requisições passaram a ser montadas só depois da checagem, e a checagem recusa
também endereços sem `http://`/`https://` (`ClienteHttp.enderecoValido`, com teste). Sem
configuração, o login mostra "O app ainda não foi configurado com o Supabase. Veja o README."

### Rede profissional, chat e notificações (21/10/2026, commit `87824ca`)

- Navegação no estilo LinkedIn: cabeçalho (avatar → Perfil, busca → `TelaPesquisa`, ícone de mensagens
  com não lidas) e abas Início · Vagas/Painel · Publicar · Notificações · Perfil.
- Telas novas (todas herdam `TelaAutenticada`, que confere a sessão): `TelaVaga` (detalhe + candidatura),
  `TelaPerfilUsuario` (perfil + botão Mensagem com `pode-iniciar`), `TelaConversas`, `TelaConversa`
  (atualiza a cada 5 s enquanto visível), `TelaCandidaturas`, `TelaPesquisa`; aba `FragmentoNotificacoes`.
- Perfil com Sobre, Competências, Experiência e Formação (`/perfil/candidatos/usuario/:id`).
- Repositórios novos: `RepositorioMensagens*`, `RepositorioNotificacoes*` (fora da fonte `api`, avisam
  "Integração pendente"); `MontadorRequisicao` compartilhado.
- Verificado: 136 testes JUnit, `assembleDebug`, `lintDebug` (0 erros), 59 testes do backend (com variáveis
  fictícias), telas no emulador `Medium_Phone` em modo demonstração.
- **Pendente:** testar chat, notificações e candidatura com contas reais pela API (`FONTE_AUTENTICACAO=api`).

### Perfil, fotos, comentários e seguir (21/10/2026, commit `5cdbdf3`)

- **Upload de imagem não existia no app** (sem seletor, sem biblioteca de imagens, avatares só com iniciais). Agora:
  `PreparadorImagem` (seletor do sistema `PickVisualMedia`, sem permissão; corrige rotação, reduz para 1024/1920 px e comprime em JPEG < 4 MB),
  `RepositorioSocialApi.enviarImagem` (PATCH multipart: `/usuarios/:id/foto|capa` na pessoa, `/empresas/:id/logo|capa` na empresa — mesmas rotas do site),
  `CarregadorImagem` (OkHttp + cache LRU; URLs `/uploads/...` relativas são resolvidas contra o servidor da API; só http/https; o token nunca vai junto).
- Telas: `TelaEditarPerfil` (fotos enviadas ao escolher; dados em Salvar; pergunta antes de descartar), `TelaComentarios` (lista com respostas, comentar, responder, excluir os próprios),
  menu ⋮ nas próprias publicações (editar/excluir), imagens anexadas no feed com o texto alternativo do autor, botão Seguir + contadores no perfil.
- Verificado: 170 testes JUnit, `lintDebug` sem erros. No emulador (API 30) contra um servidor Express de teste, fora do repositório,
  que reimplementa o contrato da API e **reaproveita o `uploadMiddleware.js` real do backend**: login, feed com imagem, comentar, editar post, trocar foto (PNG → JPEG aceito pelo multer/assinatura real, gravado em disco e reexibido após reinstalar e reabrir o app), seguir, fonte 1,5×.
- **Não verificado:** nada disso contra a API do Render com contas reais (sem credenciais aqui; o app só foi apontado ao servidor de teste); upload com Supabase Storage (URLs públicas absolutas, ramo coberto só por teste unitário); excluir publicação no emulador (coberto por teste unitário); capa e logo de empresa no emulador; perfil privado e pedido de seguir no emulador (só testes); TalkBack.
- **Ainda fora do app (existe no site/API):** anexar imagens ao criar publicação (`POST /postagens` multipart com `descricoesAnexos`), editar experiências/formação/competências, listas de seguidores/seguindo, aceitar pedidos de seguir, bloquear/denunciar, privacidade, currículo, edição de comentário.

### Alinhamento com o backend de `main` (21/10/2026, commits `cd694c2`, `e7b726a`, `6f9bbbb`)

**O que motivou.** Esta branch parte de `012aa19` e está **12 commits à frente e 4 atrás de `main`**. As 4
de `main` (`71adf89`, `782d498`, `397e49a`, `c41c9ff`, de 12 e 13/10) mexem em `Site/` e **mudaram o
contrato de cadastro da API**, que o app consome (nenhuma delas toca em `App/`). O README da raiz diz que o
push em `main` dispara o deploy no Render, então é esse o contrato de produção (conferido em 27/10: o serviço
publica `main`, deploy ativo `c41c9ff`). A branch **não** recebeu esses commits (não houve
merge); o contrato foi lido de `origin/main` com `git show`. Comparado com o app:

| API em `main` | O app antes |
|---|---|
| `POST /auth/register/candidato` exige `telefone`, `cpf`, `pais`, `dataNascimento`, `cidade`, `estado` | mandava só nome, e-mail, senha, telefone e CPF **opcionais**; descartava cidade e data |
| `POST /auth/register/empresa` exige **sessão de candidato** (401 sem ela); o vínculo `usuario_candidato_id` vem do token | abria o formulário sem conta e mandava sem token |
| Login devolve `emailNaoVerificado` para quem **não é candidato** e **não envia** código novo | só dizia "procure o e-mail", sem onde digitar o código |

**O que foi feito** (espelhando `Site/Frontend/src/routes/cadastro/*` de `main`):
- **Cadastro de pessoa** (`cd694c2`): campo UF; telefone, CPF, data de nascimento, cidade e UF obrigatórios
  (variantes `*Obrigatorio` no `Validador`; as opcionais seguem para empresa/vaga/perfil); cidade de 2 a 100;
  `pais` fixo `BR`, como o Site (`PAIS_PADRAO`). Payload em `RepositorioAutenticacaoApi.corpoCadastroPessoa`.
- **Confirmação de e-mail por código** (`e7b726a`): `TelaConfirmarEmail` + `ViewModelConfirmarEmail`
  (`/auth/cadastro/confirmar-email` e `/reenviar-confirmacao`; código de 6 dígitos, vale 15 min, 5 tentativas,
  reenvio com espera de 60 s igual à do servidor). O login abre a tela quando a fonte confirma por código.
  Na demonstração o código é `123456`.
- **Cadastro de empresa a partir da conta de candidato** (`6f9bbbb`): `ModoCadastroEmpresa` decide entre
  portão ("Primeiro, a sua conta pessoal" → cadastro de pessoa → segue para a empresa), formulário com token
  (aberto pelo novo item **Cadastrar minha empresa** no Perfil) e painel de e-mail pendente
  (Confirmar agora / Depois; confirmado → "Entrar com a empresa", que encerra a conta de pessoa e abre o login
  com o e-mail da empresa). Fonte `supabase` mantém o formulário livre.
- Verificado: `testDebugUnitTest` (185 testes, 0 falhas), `assembleDebug` e `lintDebug` (0 erros, 72 avisos).
  Dos avisos, o `TooManyViews` em `tela_cadastro.xml` é novo (o formulário passou de 80 views com o portão e o
  painel); `accessibilityHeading` é o atributo que todas as telas já usam. Não medi o total de avisos antes
  desta sessão.
- **Não verificado:** nenhuma dessas telas foi aberta em emulador/celular (o ambiente da sessão não tinha
  virtualização) nem contra a API real (o Render não era acessível de lá). Só a lógica pura e os payloads têm teste.
  Conferir: portão, painel de e-mail (inclusive girar a tela), "Entrar com a empresa", `TelaConfirmarEmail`.

**Decisões em aberto (precisam de alguém do projeto):**
1. **Aceite dos termos não é registrado para quem se cadastra pelo app.** A API só grava `termos_aceitos_em` quando
   recebe `termosVersao`, e o Site manda o rótulo dos documentos *dele* (`VERSAO_DOCUMENTOS`). O app mostra
   `termos_texto` próprio, então mandar esse rótulo afirmaria algo que não é verdade; o app **não envia**
   `termosVersao`. Definir: levar os mesmos documentos legais ao app (e a versão deles) ou outra versão própria.
2. **`POST /auth/cadastro/concluir`** (marca o fim do assistente de cadastro): o app não chama. Quem se cadastra
   pelo app fica com `cadastroConcluidoEm` nulo e o Site vai oferecer "retomar o cadastro" no login. Decidir se
   isso é o desejado ou se o app deve chamar a rota.
3. **Merge de `main`** nesta branch (traz o Site novo, login com Google e termos reescritos) antes de abrir o PR.
4. **Login com Google** (`/auth/google/*`) existe na API e no Site; o app não tem.
5. A branch `claude/zealous-pasteur-2cu3a1` (20 e 21/10, ainda fora de `main`) traz idioma pt/en/es, mexe no
   cadastro do Site (`pais` some da tela e o Site manda `BR` fixo) e no backend. Rever o contrato quando entrar.

### Conexão verificada, acessibilidade e logos (27/10/2026, commits `190c729` a `e2ca0e0`)

**Stack real.** O app é Android nativo (Java + XML), não React Native/Expo, e não tem versão iOS.

**Backend e banco — o que foi testado de fato:**
- Backend de `main` (cópia em worktree, sem tocar na branch): `vitest` 59/59 com PostgreSQL 16 local (Docker).
  As 6 migrations aplicam; para rodar fora do Supabase é preciso criar os papéis `anon`, `authenticated` e
  `service_role` antes (o `scripts/migrar.js` faz `REVOKE ... FROM anon, authenticated` e, sem eles, **sai com
  código 1 sem mostrar o erro**).
- `ContratoApiRealTeste` (app) contra essa API: 14/14 — cadastro de pessoa e de empresa, login, renovação,
  `/auth/me`, confirmação de e-mail (código errado, código curto, reenvio), feed (publicar, comentar, curtir,
  editar, excluir), perfil (ler, editar, foto), logo da empresa, busca, notificações, mensagens, seguir,
  empresa em análise sem vaga, vaga → candidatura → painel (empresa aprovada direto no banco, como faria a
  moderação) e saída com revogação do refresh token. O log da API confirma cada chamada e os códigos.
- Produção (somente leitura): Render publica `main` (`c41c9ff`, ativo), `/api/health` 200 depois de ~12 s
  acordando (plano grátis), logs com "[DB] Banco conectado com sucesso". No Supabase "Acesso", as 6 migrations
  estão registradas e as colunas novas existem. Um cadastro no formato antigo (que nada grava, senha inválida
  de propósito) é recusado com erro em telefone, cpf, pais, dataNascimento, cidade e estado — confirma que o
  app antigo não conseguiria cadastrar e que o corrigido envia o que a produção exige.
- Achados no backend/infra (fora do app, para a equipe): **o serviço no Render usa `npm install` como build
  (sem `npm run migrate`) e health check vazio**, diferente do `render.yaml`; migrations novas não serão
  aplicadas sozinhas. Os logs de acesso guardam a URL de retorno do Google com o `code` de autorização.

**Design.** Cartões de vaga e detalhe passam a mostrar o **logotipo da empresa** (`empresa.logo` já vinha da
API e era ignorado); sem logo, as iniciais. Demais telas já seguiam o padrão de rede profissional (cabeçalho
com avatar/busca/mensagens, 5 abas com rótulo, cartões, perfil com seções, estados de carregando/vazio/erro).

**Acessibilidade** (detalhes em `docs/ACESSIBILIDADE.md`): contraste AA conferido por cálculo; botão Salvar
da edição de perfil sem altura fixa; conversa anuncia mensagem recebida e detecta novas pelo id (a contagem
falhava quando a janela de 2 páginas virava); guia **Acessibilidade no seu celular**; `LayoutsAcessiveisTeste`
para não regredir; falso positivo `LabelFor` anotado. Corrigida também uma corrida em
`RepositorioSocialApiTeste` (dois envios paralelos, ordem de chegada variável).

**Não verificado:** nada em aparelho (TalkBack, fonte máxima, Acesso por voz); roteiro em
`docs/ACESSIBILIDADE.md`.

## 2. O que foi verificado no emulador (modo demonstração)

Visto de fato, com capturas de tela, no `Small_Phone` (720×1280, API 30):

- Apresentação sem sessão; "Entrar", "Criar conta" e "Sou empresa" (cadastro já em Empresa).
- Login de pessoa → área da pessoa; reabrir o app → direto na área logada (sem apresentação).
- Abas Início, Vagas, Criar, Pesquisa e Perfil; Voltar numa aba → Início.
- Pesquisa: erro de termo curto, estado vazio, resultados; barra de abas some com o teclado.
- Sair com confirmação → apresentação; Voltar depois disso sai do app.
- Empresa aprovada → aba "Painel"; "Publicar nova vaga" abre Criar em "Vaga"; validação da vaga.
- Empresa pendente → tela "Sua empresa está em análise"; Voltar sai do app.
- Cadastro de pessoa: erros por campo com foco no primeiro, máscara de CPF, cadastro concluído
  → área da pessoa.
- Fonte do sistema em 1,3×: Perfil e Vagas sem sobreposição.

**Não verificado:** TalkBack navegando de verdade, contas `nao.confirmado@`, `pausado@` e
`falha.rede@`, máscaras de telefone/CNPJ/CEP na tela (cobertas só por teste unitário),
orientação paisagem, telas maiores (Medium_Phone), Android 15 (edge-to-edge obrigatório),
fontes `supabase` e `api` com servidor real.

## 3. Pendências (ordem sugerida)

Conferido no código e na API em 27/10/2026.

1. **Testar em aparelho** (nada foi aberto em emulador/celular nas duas últimas sessões): roteiro em
   `docs/ACESSIBILIDADE.md` (TalkBack, fonte máxima, Acesso por voz) e os fluxos novos (portão de empresa,
   confirmação de e-mail, guia de acessibilidade, logos, aviso de mensagem nova).
2. **Infra (equipe do backend):** alinhar o serviço do Render ao `render.yaml` (build com `npm run migrate`,
   health check `/api/health`); tirar o `code` do Google dos logs de acesso; fazer o `migrar.js` mostrar o erro
   quando falha fora do laço das migrations.
3. Resolver as **decisões em aberto** da seção 1 (termos, `/cadastro/concluir`, merge de `main`) e a de
   **Libras** (o site usa VLibras; o app não tem).
4. Botão "Verificar novamente" na `TelaStatusEmpresa` (hoje ela consulta o status só ao abrir).
5. Recuperação de senha com a fonte `api`: o link do e-mail abre o **site**; a `TelaNovaSenha` só entende o link
   do Supabase (`access_token`).
6. Do que existe no site/API e não no app: anexar imagens (com texto alternativo) ao publicar, editar
   experiências/formação/competências, listas de seguidores/seguindo, aceitar pedidos de seguir,
   bloquear/denunciar, privacidade, currículo, edição de comentário, login com Google.
7. Ajustes menores: `termos_texto` cita o Supabase Auth (mudar quando a fonte padrão for `api`);
   `tela_cadastro.xml` passou de 80 views (aviso do lint); conferir em aparelho se a contagem "Reenviar código em
   N s" é repetida pelo TalkBack a cada segundo.
8. Testar em Android 15 (edge-to-edge obrigatório).

## 4. Como retomar

```bash
git checkout app/telas-mobile-autenticacao
cd App/AcessoApk
./gradlew --offline testDebugUnitTest assembleDebug lintDebug
./gradlew installDebug -PFONTE_AUTENTICACAO=simulada   # emulador ligado
```

**Contrato com a API real** (cria contas `@acesso.test`: use API local ou de teste, nunca a de produção):

```bash
# 1. PostgreSQL local (Docker Hub pode dar 429; o espelho do Google serve a mesma imagem oficial)
docker run -d --name acesso-pg -e POSTGRES_PASSWORD=<senha local> -e POSTGRES_DB=acesso \
  -p 127.0.0.1:55432:5432 mirror.gcr.io/library/postgres:16-alpine
docker exec acesso-pg psql -U postgres -d acesso -c \
  "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;"
# 2. API (Site/Backend de main) com DB_HOST=127.0.0.1 DB_PORT=55432 DB_NAME=acesso DB_USER=postgres
#    DB_PASSWORD=<senha local> DB_SSL=false JWT_SECRET=<32+ caracteres> no .env
npm ci && npm run migrate && npm start
# 3. Testes do app (a empresa aprovada é opcional: libera vaga → candidatura)
cd App/AcessoApk
ACESSO_API_TESTE_URL=http://127.0.0.1:3000/api/ ./gradlew testDebugUnitTest --tests '*ContratoApiRealTeste'
```

Se a API responder 429 ("Muitas tentativas de autenticação"), é o limitador de login dela: espere ou
reinicie a API local.

Dicas do ambiente: o build e os testes rodam offline; o `lintDebug` precisa de internet na
primeira vez (se o Maven Central responder `429 Too Many Requests`, é limite passageiro: repetir o comando).
Sem Android Studio, basta um SDK com `platforms;android-35` e `build-tools;34.0.0` em `ANDROID_HOME` (o Gradle
8.9 do wrapper é baixado sozinho; não é preciso criar `local.properties`). No Git Bash, comandos `adb` com caminhos `/sdcard/...` precisam de
`MSYS_NO_PATHCONV=1`. O arquivo `App/AcessoApk/Quero` é um resto de saída de terminal
versionado antes desta tarefa — não foi mexido.
