# ACESSO — app Android

Rede profissional inclusiva para pessoas com deficiência, profissionais 50+ e empresas que levam a
inclusão a sério. App nativo em **Java + XML** (MVVM), versão para celular do site do TCCACESSO.

Todo o código do projeto (classes, métodos, variáveis, IDs, layouts, recursos e tabelas) está em
português. Ficam em inglês apenas os nomes que pertencem ao Android, às bibliotecas ou às APIs
usadas e não podem ser trocados (ex.: `AppCompatActivity`, `onCreate`, `colorPrimary`,
`access_token`, `auth.users`).

## Estado atual

- **Telas:** apresentação, login, cadastro de pessoa e de empresa, esqueci/nova senha, termos,
  área logada com 5 abas (Início, Vagas — "Painel" para empresa —, Criar, Pesquisa, Perfil) e
  tela de empresa em análise.
- **Login:** três fontes, escolhidas por `FONTE_AUTENTICACAO` (ver abaixo). A padrão continua
  sendo o **Supabase Auth**, como o app já funcionava. A fonte **`api`** (mesma API do site) está
  implementada mas **ainda não foi testada com a API rodando**.
- **Conteúdo das abas** (feed, vagas, painel, pesquisa, publicar): ainda não vem de servidor.
  Fora do modo demonstração, cada aba avisa "Integração pendente" e qual rota da API vai usar —
  o app não inventa dados.
- Plano de integração com a API: [`docs/PLANEJAMENTO_BACKEND.md`](docs/PLANEJAMENTO_BACKEND.md).
- Histórico e pendências entre sessões de trabalho: [`CONTINUIDADE.md`](../../CONTINUIDADE.md)
  na raiz do repositório.

## Como rodar

1. Abra a pasta `App/AcessoApk` no Android Studio (Ladybug ou mais novo) e espere o Gradle
   sincronizar. Requer JDK 17.
2. Copie as linhas de `local.properties.example` para o `local.properties` (o Android Studio cria
   esse arquivo com `sdk.dir`; ele **não vai para o Git**) e preencha conforme a fonte de login:

   | `FONTE_AUTENTICACAO` | Para que serve | O que mais configurar |
   |---|---|---|
   | `supabase` (padrão) | Login real pelo Supabase Auth | `URL_SUPABASE` e `CHAVE_ANONIMA_SUPABASE` (Supabase > Project Settings > API). **Nunca use a service_role key no app.** |
   | `api` | Login real pela API do site (`Site/Backend`) | `URL_API`, ex.: `http://10.0.2.2:3000/api` no emulador |
   | `simulada` | Testar telas e navegação sem servidor | Nada. Só existe no build de debug. |

   Também dá para trocar sem editar o arquivo: `./gradlew installDebug -PFONTE_AUTENTICACAO=simulada`.
3. Só para a fonte `supabase`:
   - rode `supabase/001_perfis.sql` no SQL Editor do Supabase;
   - em Supabase > Authentication > URL Configuration, adicione `acesso://redefinir-senha` em
     **Redirect URLs** (é para onde o link de recuperação de senha leva).
4. Só para a fonte `api`: rode a API (`cd Site/Backend && npm run dev`, ver o README dela).
5. Rode o app num emulador ou celular (Android 8.0 ou mais novo).

### Modo demonstração (`simulada`)

Respostas falsas, sem servidor, para conferir telas e fluxos. Todas as telas mostram a faixa
amarela **"Modo demonstração"**; nada é salvo e nada é validado por um servidor. O build de
release ignora esta opção (cai no Supabase).

Contas de teste (senha `Acesso@2026`): `pessoa@acesso.test`, `empresa@acesso.test` (empresa
aprovada), `empresa.pendente@acesso.test` (empresa em análise), `nao.confirmado@acesso.test`
(e-mail não confirmado), `pausado@acesso.test` (conta pausada) e `falha.rede@acesso.test`
(simula falta de internet). Um cadastro feito neste modo entra direto na área da conta.

## Comandos

Na pasta `App/AcessoApk` (no Windows: `gradlew.bat` ou `./gradlew` no Git Bash):

```bash
./gradlew testDebugUnitTest      # testes JUnit (app/src/test)
./gradlew assembleDebug          # gera app/build/outputs/apk/debug/app-debug.apk
./gradlew lintDebug              # análise do Android (relatório em app/build/reports)
./gradlew installDebug -PFONTE_AUTENTICACAO=simulada   # instala no emulador em modo demonstração
```

O build e os testes funcionam offline (`--offline`) depois da primeira sincronização; o
`lintDebug` precisa de internet na primeira vez. O CI (`.github/workflows/ci.yml`) roda
`testDebugUnitTest assembleDebug` com a configuração padrão.

## Navegação

- Ao abrir o app: **com sessão salva**, vai direto para a área da conta; **sem sessão**, mostra
  sempre a apresentação, com Entrar, Criar conta, "Quero encontrar vagas" e "Sou empresa" (abre
  o cadastro já em Empresa).
- Login e cadastro abrem por cima da apresentação (Voltar retorna a ela).
- Depois de entrar, a pilha de telas é apagada: Voltar não leva de volta ao login. Numa aba que
  não é a Início, Voltar leva à Início.
- Empresa pendente, reprovada ou suspensa só vê a tela de status (sair ou falar com a equipe).
- Sair da conta (Perfil ou tela de status) volta à apresentação.

## Estrutura

```
com.acesso.app
├── telas         Apresentacao, Login, Cadastro, EsqueciSenha, NovaSenha, Termos,
│                 Principal (abas) e StatusEmpresa
├── fragmentos    abas: Inicio, Oportunidades (Vagas/Painel), Criar, Pesquisa, Perfil
├── viewmodels    estado das telas, validação e chamadas aos repositórios
├── repositorios  RepositorioAutenticacao (interface) + Supabase, Api e Simulado;
│                 RepositorioConteudo + Pendente e Simulado; FabricaRepositorios escolhe
├── servicos      clientes HTTP (OkHttp), tradução de erros do Supabase e da API
├── modelos       SessaoUsuario, TipoConta, ResultadoLogin, dados de cadastro, Vaga, Publicacao...
└── utilitarios   Validador, Mascaras, Navegacao, GerenciadorSessao, MargensSistema, Rotulos...
```

Fluxo: **Tela → ViewModel → Repositório → servidor**. As telas nunca fazem chamadas HTTP.

As validações do app seguem as regras do site e da API (ex.: senha de 8 a 72 caracteres com
maiúscula, minúscula, número e símbolo; CPF/CNPJ com dígito verificador). Elas só ajudam quem
preenche: **o servidor sempre valida de novo**.

## Identidade visual e acessibilidade

Cores e cantos seguem o site (`Site/Frontend/src/styles/globals.css`); a paleta está em
`res/values/cores.xml` com o contraste de cada combinação. O raio decorativo é o mesmo do site
(`raio-acesso.svg`), vetorizado em `res/drawable/raio_acesso.xml` e aplicado pelo estilo
`Estilo.Acesso.FundoRaio` (apresentação) e pelo layout `componente_fundo_raio_topo.xml` (login e
cadastro). O ícone do app usa o mesmo símbolo de acessibilidade do logo do site.

Cuidados já aplicados: textos em `sp` (acompanham a fonte do celular), telas com rolagem para
fonte grande, botões com no mínimo 48dp, rótulos sempre visíveis nos campos, erros com ícone e
texto (não só cor), aba ativa em negrito além da cor, títulos marcados como cabeçalho para o
TalkBack, imagens decorativas ocultas do leitor de tela, e campos que continuam visíveis acima do
teclado. Isso não substitui um teste completo com TalkBack e com usuários.

## Banco (fonte `supabase`)

`supabase/001_perfis.sql` cria a tabela `perfis`. O `id` é o mesmo UUID do usuário no
Supabase Auth, e a senha nunca é guardada nessa tabela. Um gatilho cria o perfil
automaticamente quando a conta é criada. RLS: usuários logados veem os perfis, mas só editam
o próprio. E-mail e data de nascimento não aparecem para outras pessoas.

O banco é o mesmo projeto Supabase do site. As tabelas do site já ficam bloqueadas para a
chave pública, então o app não consegue acessá-las por esse caminho. Com a fonte `api`, o app
usa as tabelas do site **pela API**, e a tabela `perfis` deixa de ser usada (ver o planejamento).

## Testes

Testes JUnit em `app/src/test`: validações (`ValidadorTeste`), navegação por tipo de conta
(`NavegacaoTeste`), máscaras, tradução de erros do Supabase e da API, leitura das respostas da
API de autenticação e validação/montagem dos dados do cadastro. No Android Studio: botão direito
na pasta `test` > Run Tests, ou `./gradlew testDebugUnitTest`.
