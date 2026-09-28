# ACESSO — app Android

Rede profissional inclusiva, com foco em acessibilidade e inclusão de pessoas com deficiência.
App nativo em **Java + XML**, usando o **Supabase** como backend (Auth, PostgreSQL, Storage e RLS).
Não existe backend próprio: o app fala direto com o Supabase usando só a chave pública (anon),
e as políticas RLS do banco decidem o que cada usuário pode ver ou alterar.

## Como rodar

1. Abra a pasta `App/AcessoApk` no Android Studio (Ladybug ou mais novo) e espere o Gradle sincronizar.
2. No arquivo `local.properties` (o Android Studio cria sozinho), acrescente:
   ```
   SUPABASE_URL=https://SEU-PROJETO.supabase.co
   SUPABASE_ANON_KEY=sua-chave-anon
   ```
   Os valores ficam em Supabase > Project Settings > API. **Nunca use a service_role key no app.**
   O `local.properties` não vai para o Git.
3. No Supabase, rode `supabase/001_profiles.sql` no SQL Editor.
4. Em Supabase > Authentication > URL Configuration, adicione `acesso://redefinir-senha`
   em **Redirect URLs** (é para onde o link de recuperação de senha leva).
5. Rode o app num emulador ou celular (Android 8.0 ou mais novo).

## Estrutura

```
com.acesso.app
├── activities    telas (Login, Cadastro, Recuperar senha, Nova senha, Termos, Principal)
├── fragments     conteúdo das abas da barra inferior
├── viewmodels    estado das telas e validações antes de chamar o Supabase
├── repositories  AuthRepository: toda a comunicação com o Supabase Auth
├── services      SupabaseClient (conexão) e SupabaseErrorMapper (mensagens em português)
├── models        AuthSession, SignUpResult
└── utils         Validator, SessionManager, NetworkUtils, StatusMessage
```

Fluxo: **Tela (Activity) → ViewModel → Repository → Supabase**.

## Banco (Supabase)

`supabase/001_profiles.sql` cria a tabela `profiles`. O `id` é o mesmo UUID do usuário no
Supabase Auth, e a senha nunca é guardada nessa tabela. Um gatilho cria o perfil
automaticamente quando a conta é criada. RLS: usuários logados veem os perfis, mas só editam
o próprio. E-mail e data de nascimento não aparecem para outras pessoas.

O banco é o mesmo projeto Supabase do Site. As tabelas do Site (em português) já ficam
bloqueadas para a chave pública, então o app não consegue acessá-las.

## Testes

Validações e mensagens de erro têm testes JUnit em `app/src/test` (Android Studio: botão
direito na pasta > Run Tests, ou `./gradlew test`).
