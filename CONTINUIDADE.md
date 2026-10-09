# Continuidade — telas mobile, autenticação e planejamento do back-end

Registro do trabalho interrompido em 08/10/2026 para retomar depois.
Escopo da tarefa: concluir as telas do app (`App/AcessoApk`) com base no site, corrigir o ícone,
ajustar a tela de apresentação ao fluxo de login, preparar a autenticação para a API e escrever
`App/AcessoApk/docs/PLANEJAMENTO_BACKEND.md`.

> **Atenção: o app NÃO compila neste commit.** O trabalho parou no meio da troca das telas.
> Classes já referenciadas (`TelaStatusEmpresa`, `FragmentoPerfil`, `FragmentoPesquisa`,
> `TelaPrincipal.abrirCriacao`) ainda não existem, e telas antigas ainda usam a API velha do
> repositório. Veja "Pendências" na ordem sugerida.

## 1. O que a análise encontrou

- **App** (Java + XML, MVVM): Tela → ViewModel → Repositório → **Supabase Auth direto**, com a
  tabela própria `perfis` (`App/AcessoApk/supabase/001_perfis.sql`). Não tinha tipo de conta
  (pessoa/empresa). As 5 abas (Início, Oportunidades, Criar, Pesquisa, Perfil) eram
  "em construção" (`FragmentoEmConstrucao`).
- **Site/Backend** (Express + Sequelize + JWT + bcrypt) já tem as rotas de autenticação:
  `POST /api/auth/login`, `/register/candidato`, `/register/empresa`, `/refresh`, `/logout`,
  `/senha/esqueci`, `/senha/redefinir`, `GET /api/auth/me`. Tabelas `usuarios`, `candidatos`,
  `empresas` (empresa nasce com `statusAprovacao = pendente`).
- Ou seja: hoje **app e site têm bases de usuários separadas** (Supabase Auth × tabela `usuarios`).
  Recomendação para o documento do back-end: o app passar a usar a API do site.
- **Ícone**: o launcher usava um desenho genérico de "pessoa". O logo do site é o ícone
  `Accessibility` do lucide-react num círculo verde (`size-9` + `rounded-xl` = círculo).
- **Apresentação**: aparecia só na primeira abertura (`GerenciadorApresentacao`). O commit
  `012aa19` pede que ela volte a aparecer enquanto não houver login.
- **Linha de base** (antes das mudanças): `assembleDebug` e `testDebugUnitTest` passavam;
  `lintDebug` tinha 1 erro (`windowLightNavigationBar` exige API 27) e 33 avisos.
- Emuladores disponíveis: `Small_Phone`, `Medium_Phone`, `Pixel_API_30` (todos API 30).

## 2. O que já foi feito (neste commit)

### Configuração
- `app/build.gradle`: `FONTE_AUTENTICACAO` (`supabase` padrão | `api` | `simulada`) e `URL_API`,
  lidos de `-P...` ou do `local.properties`. Valor inválido falha o build.
- `app/src/debug/`: HTTP sem TLS só no debug e só para `10.0.2.2`/`localhost`.
- `local.properties.example` documenta as novas chaves.
- `values-v27/temas.xml`: corrige o erro de lint preexistente.

### Autenticação (estrutura para a API)
- Contrato único `repositorios/RepositorioAutenticacao` (interface) com três implementações,
  escolhidas só em `FabricaRepositorios`:
  - `RepositorioAutenticacaoSupabase` — o código que já funcionava (empresa responde
    "depende da API").
  - `RepositorioAutenticacaoApi` — escrito contra as rotas reais do `Site/Backend`
    (login, cadastros, refresh, logout, senha). **Ainda não testado com a API rodando.**
  - `RepositorioAutenticacaoSimulado` — só no debug, claramente marcado; contas fixas
    (senha `Acesso@2026`): `pessoa@`, `empresa@`, `empresa.pendente@`, `nao.confirmado@`,
    `pausado@`, `falha.rede@acesso.test`.
- `ExecutorHttp` + `ClienteHttp` (um OkHttp só), `ClienteApi`, `TradutorErrosApi`
  (formato `{ mensagem, erros:[{campo,mensagem}] }`), `MensagensErro`, `FalhaHttp`.
- `RetornoRepositorio.aoFalharComCampos` para erros do servidor aparecerem ao lado do campo.
- Modelos: `TipoConta`, `ResultadoLogin` (autenticado / e-mail não confirmado / conta pausada),
  `DadosCadastroPessoa`, `DadosCadastroEmpresa`; `SessaoUsuario` ganhou nome, tipo, status da
  empresa e origem.
- `GerenciadorSessao` grava os novos campos e descarta sessão de outra fonte (token simulado
  nunca vai para servidor real).
- `Navegacao`: decisão pura `destinoPara(sessao)` (apresentação / área pessoa / área empresa /
  empresa em análise) + navegação com `CLEAR_TASK`.
- `Validador`: senha com as regras da API (8–72, maiúscula, minúscula, número, símbolo),
  telefone, CPF/CNPJ com dígito verificador, UF, CEP, site, publicação e vaga. `Mascaras`.
- ViewModels: `ViewModelLogin` (3 desfechos + reativação), `ViewModelCadastro` (pessoa e
  empresa, erros num mapa por campo), `ViewModelSessao` (renova token, sai), `ViewModelInicio`,
  `ViewModelOportunidades`, `ViewModelPesquisa`, `ViewModelCriar`, `EstadoConteudo`.
- Conteúdo: `RepositorioConteudo` → `RepositorioConteudoPendente` (avisa a rota da API que vai
  atender; nada inventado) ou `RepositorioConteudoSimulado` (só no modo demonstração).

### Ícone e visual
- `ic_acessibilidade` agora é o desenho exato do lucide `accessibility` 0.575.0 (o do site).
- `icone_app_frente` usa esse símbolo; ícones adaptativos ganharam camada `monochrome`.
- Logo da apresentação: símbolo com 22dp em 40dp (proporção do site).
- Novos estilos (cartão, selo, aviso, avatar, item de menu, chip), cores de aviso, ícones Material.

### Telas (layouts prontos; Java parcial)
- Layouts: `tela_cadastro` (seletor pessoa/empresa + campos do site), `tela_login` (avisos do
  modo demonstração), `tela_principal`, `tela_status_empresa`, `fragmento_inicio`,
  `fragmento_oportunidades`, `fragmento_criar`, `fragmento_pesquisa`, `fragmento_perfil`,
  componentes e itens de lista.
- Java pronto: `FragmentoInicio`, `FragmentoOportunidades`, `FragmentoCriar`,
  `ExibidorEstado`, `Rotulos`, `MargensSistema`.

## 3. Pendências (ordem sugerida)

1. **Fazer compilar**
   - `TelaPrincipal`: usar `ViewModelSessao` (verificar/renovar; ao encerrar →
     `Navegacao.voltarParaApresentacao`), aba Oportunidades vira "Painel" para empresa,
     fragmentos novos, método `abrirCriacao(boolean vaga)`, `MargensSistema` + esconder a barra
     inferior com teclado aberto, mostrar `avisoDemonstracao` se `FabricaRepositorios.modoDemonstracao()`.
   - Criar `TelaStatusEmpresa` (layout já existe; textos `status_empresa_*`; Sair e Fale conosco).
   - Criar `FragmentoPerfil` (layout pronto; sair com confirmação — lógica do
     `FragmentoEmConstrucao`) e `FragmentoPesquisa` (layout + `ViewModelPesquisa` prontos).
   - `TelaApresentacao`: com sessão → `Navegacao.abrirAreaAutenticada`; sem sessão → sempre
     mostrar; botões abrem login/cadastro **sem** `finish()` (usar `Navegacao.loginECadastro`;
     "Sou empresa" pré-seleciona empresa); mostrar `EXTRA_AVISO`. Remover
     `GerenciadorApresentacao` e `EXTRA_MOSTRAR_APRESENTACAO`.
   - `TelaLogin`: tirar `verificarSessaoSalva`; observar `getSessaoAutenticada()` →
     `Navegacao.abrirAreaAutenticada`; diálogo de reativação; avisos de demonstração.
   - `TelaCadastro`: `EXTRA_EMPRESA`, alternar seções, máscaras, lista de porte, mapa de erros →
     campos (ordem visual, foco no primeiro), desfecho AUTENTICADO → área da conta.
   - `TelaEsqueciSenha`/`TelaNovaSenha`/`TelaTermos`: `MargensSistema`; nova senha volta com
     `Navegacao.abrirLoginDoZero`.
   - Apagar `FragmentoEmConstrucao` e `fragmento_em_construcao.xml`.
   - `AndroidManifest`: registrar `TelaStatusEmpresa`; `adjustResize` na `TelaPrincipal`.
2. **Testes**: atualizar `ValidadorTeste` (regra de senha mudou: `acesso2026` deixou de ser
   válida); criar testes de `Navegacao.destinoPara`, `RepositorioAutenticacaoApi.lerResultadoLogin`
   / `lerExpiracaoJwt`, `TradutorErrosApi`, `ViewModelCadastro.validar*`/`montarDados*`,
   `Mascaras.formatar`, CPF/CNPJ.
3. **Verificação**: `./gradlew testDebugUnitTest assembleDebug lintDebug`; depois
   `./gradlew installDebug -PFONTE_AUTENTICACAO=simulada` no emulador `Small_Phone` e conferir:
   apresentação → login → área pessoa/empresa/empresa em análise; Voltar não retorna à
   apresentação; reabrir o app vai direto à área logada; sair volta à apresentação; validações,
   carregamento e teclado no cadastro. Registrar o que foi visto de fato.
4. **Documentação**: `App/AcessoApk/docs/PLANEJAMENTO_BACKEND.md` (seções 6.1–6.10 do pedido) e
   atualizar `App/AcessoApk/README.md` (fontes de login, modo demonstração, estrutura nova).

## 4. Como retomar

```bash
git checkout app/telas-mobile-autenticacao
cd App/AcessoApk
./gradlew --offline assembleDebug     # vai falhar até o item 1 das pendências
```

Contexto útil: o build e os testes rodam offline; o `lintDebug` precisa de internet na primeira
vez (baixa `lint-gradle`). O arquivo `App/AcessoApk/Quero` é um resto de saída de terminal já
versionado antes desta tarefa — não foi mexido.
