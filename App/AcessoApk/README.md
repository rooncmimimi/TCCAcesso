# ACESSO — app Android

Rede profissional inclusiva, com foco em acessibilidade e inclusão de pessoas com deficiência.
App nativo em **Java + XML**, usando o **Supabase** como backend (Auth, PostgreSQL, Storage e RLS).
Não existe backend próprio: o app fala direto com o Supabase usando só a chave pública (anon),
e as políticas RLS do banco decidem o que cada usuário pode ver ou alterar.

Todo o código do projeto (classes, métodos, variáveis, IDs, layouts, recursos e tabelas) está em
português. Ficam em inglês apenas os nomes que pertencem ao Android, às bibliotecas ou à API do
Supabase e não podem ser trocados (ex.: `AppCompatActivity`, `onCreate`, `colorPrimary`,
`access_token`, `auth.users`).

## Como rodar

1. Abra a pasta `App/AcessoApk` no Android Studio (Ladybug ou mais novo) e espere o Gradle sincronizar.
2. No arquivo `local.properties` (o Android Studio cria sozinho), acrescente:
   ```
   URL_SUPABASE=https://SEU-PROJETO.supabase.co
   CHAVE_ANONIMA_SUPABASE=sua-chave-anon
   ```
   Os valores ficam em Supabase > Project Settings > API. **Nunca use a service_role key no app.**
   O `local.properties` não vai para o Git.
3. No Supabase, rode `supabase/001_perfis.sql` no SQL Editor.
4. Em Supabase > Authentication > URL Configuration, adicione `acesso://redefinir-senha`
   em **Redirect URLs** (é para onde o link de recuperação de senha leva).
5. Rode o app num emulador ou celular (Android 8.0 ou mais novo).

## Estrutura

```
com.acesso.app
├── telas         TelaLogin, TelaCadastro, TelaEsqueciSenha, TelaNovaSenha, TelaTermos, TelaPrincipal
├── fragmentos    conteúdo das abas da barra inferior
├── viewmodels    estado das telas e validações antes de chamar o Supabase
├── repositorios  RepositorioAutenticacao: toda a comunicação com o Supabase Auth
├── servicos      ClienteSupabase (conexão) e TradutorErrosSupabase (mensagens em português)
├── modelos       SessaoUsuario, ResultadoCadastro
└── utilitarios   Validador, GerenciadorSessao, UtilitarioRede, MensagemStatus
```

Fluxo: **Tela → ViewModel → Repositório → Supabase**.

## Banco (Supabase)

`supabase/001_perfis.sql` cria a tabela `perfis`. O `id` é o mesmo UUID do usuário no
Supabase Auth, e a senha nunca é guardada nessa tabela. Um gatilho cria o perfil
automaticamente quando a conta é criada. RLS: usuários logados veem os perfis, mas só editam
o próprio. E-mail e data de nascimento não aparecem para outras pessoas.

O banco é o mesmo projeto Supabase do Site. As tabelas do Site já ficam bloqueadas para a
chave pública, então o app não consegue acessá-las.

## Testes

Validações e mensagens de erro têm testes JUnit em `app/src/test` (Android Studio: botão
direito na pasta > Run Tests, ou `./gradlew test`).
