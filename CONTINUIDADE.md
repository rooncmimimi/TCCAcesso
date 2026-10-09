# Continuidade — app mobile, autenticação e integração com o back-end

Registro para retomar o trabalho em outra sessão. Última atualização: 09/10/2026,
branch `app/telas-mobile-autenticacao`.

> **O app compila**, os 51 testes JUnit passam e o `lintDebug` não tem erros. Os fluxos
> principais foram conferidos no emulador `Small_Phone` (API 30) em modo demonstração.
> A autenticação pela API do site (`FONTE_AUTENTICACAO=api`) ainda **não** foi testada com a
> API rodando.

Documentos relacionados:
- `App/AcessoApk/docs/PLANEJAMENTO_BACKEND.md` — como o app vai usar a API, endpoints reais,
  propostas e plano por etapas.
- `App/AcessoApk/README.md` — como configurar, rodar e testar o app.

## 1. Histórico

| Commit | O que foi feito |
|---|---|
| `b76d8bf` (08/10) | Estrutura de autenticação (Supabase / API / simulada), sessão com tipo de conta, validações iguais às da API, ícone com o símbolo do site, layouts das abas. App não compilava. |
| `2859ee0` (09/10) | App volta a compilar: `TelaPrincipal`, `TelaStatusEmpresa`, `FragmentoPerfil`, `FragmentoPesquisa`, apresentação/login/cadastro ligados à `Navegacao`; remoção de `FragmentoEmConstrucao` e `GerenciadorApresentacao`; testes novos. |
| `1274db5` (09/10) | Correções vistas no emulador (Início em branco, topo do login cortado, cores do Material 3, rótulos cortados) e ajustes visuais. |
| (este commit) | `PLANEJAMENTO_BACKEND.md`, README do app e da raiz, este arquivo. |

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

1. **Testar a fonte `api` com a API local** — passo a passo na seção 11 do planejamento.
2. **Tela de confirmação de e-mail por código** (`POST /api/auth/cadastro/confirmar-email`).
3. **Status da empresa após renovar a sessão** (`GET /api/auth/me`) e botão "Verificar
   novamente" na `TelaStatusEmpresa`.
4. **`RepositorioConteudoApi`** para as abas (começar por Vagas).
5. Decidir as propostas A (cidade/data no cadastro de candidato) e B (`/auth/refresh` com
   empresa) do planejamento.
6. Recuperação de senha com a fonte `api` (hoje o link do e-mail abre o site).
7. Cifrar os tokens com o Android Keystore.
8. Ajustes visuais menores: dica da busca de vagas cortada com fonte grande; o texto de
   `termos_texto` cita o Supabase Auth (precisa mudar quando a fonte padrão for `api`).
9. Testar com TalkBack e em Android 15.

## 4. Como retomar

```bash
git checkout app/telas-mobile-autenticacao
cd App/AcessoApk
./gradlew --offline testDebugUnitTest assembleDebug lintDebug
./gradlew installDebug -PFONTE_AUTENTICACAO=simulada   # emulador ligado
```

Dicas do ambiente: o build e os testes rodam offline; o `lintDebug` precisa de internet na
primeira vez. No Git Bash, comandos `adb` com caminhos `/sdcard/...` precisam de
`MSYS_NO_PATHCONV=1`. O arquivo `App/AcessoApk/Quero` é um resto de saída de terminal
versionado antes desta tarefa — não foi mexido.
