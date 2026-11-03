# Cadastro com Google: ACESSO, Gupy e LinkedIn

Comparação do fluxo "criar conta com o Google" entre o ACESSO e as duas plataformas de referência
do projeto. Levantado em **13/10/2026**.

## Como este documento foi feito

O que está marcado como **observado** eu vi na tela: abri `porto.gupy.io/candidates/signup` e
`linkedin.com/signup`, li o conteúdo das páginas e inspecionei a URL de autorização que cada uma
monta ao clicar no botão do Google (escopos, `state`, `prompt`, `redirect_uri` ficam visíveis ali,
antes de qualquer login).

O que está marcado como **inferido** eu não consegui ver, porque exigiria completar o login numa
conta Google real. Onde inferi, digo em que me baseei.

Os dados do ACESSO vêm do código, não de memória: `GoogleAuthService.js`, `GoogleAuthController.js`,
`routes/cadastro/candidato.tsx` e `routes/retorno-google.tsx`.

---

## 1. A resposta curta: o que muda hoje ao clicar "Continuar com Google"?

**Quase nada.** No ACESSO de hoje, o botão do Google economiza **dois campos de digitação** — nome e
e-mail — e registra que aquela conta Google é sua. Só isso.

Depois de voltar do Google você ainda:

- escolhe uma **senha** (obrigatória);
- digita **CPF** e confirma o **país**;
- preenche **telefone, data de nascimento, cidade e estado**;
- e só então a conta passa a existir no banco.

A conta é criada no fim da **etapa 2**, não no retorno do Google. Antes disso não existe conta
nenhuma — se você fechar a aba na etapa 2, não sobra nada.

É por isso que a sensação é de que "não mudou nada". Tecnicamente mudou (a identidade foi
verificada pelo Google e fica vinculada), mas o trabalho que você teve foi praticamente o mesmo.

---

## 2. Comparação lado a lado

| | **ACESSO** | **Gupy** | **LinkedIn** |
|---|---|---|---|
| Onde fica o botão | Login e etapa 1 do cadastro | Login e cadastro | Login e cadastro |
| Rótulo | "Continuar com Google" | "Criar conta via Google" | "Continue with Google" |
| Escopos pedidos | `openid email profile` | `userinfo.email userinfo.profile` | — |
| Recebe ID token assinado | **sim** | não (`openid` ausente) | — |
| Protege contra repetição (`nonce`) | **sim** | não | — |
| `state` | JWT assinado (sem estado no servidor) | UUID opaco (estado no servidor) | — |
| Força escolher a conta (`prompt`) | **sim** (`select_account`) | não | — |
| **Senha obrigatória após o Google** | **sim** | não | **não** (oficial) |
| Campos para a conta existir | 10, em 2 etapas | país + CPF + e-mail | nome + e-mail |
| Confirmação de e-mail | não exigida | exigida (fluxo por e-mail) | — |
| Entrar sem senha | não tem | **tem** ("Entrar sem senha") | — |
| Aceite dos termos | **checkbox explícito + versão registrada** | implícito no botão | implícito no botão |
| Vincular Google a conta que já existe | **prometido, não implementado** | — | — |
| Seletor de idioma | só no cadastro, não salvo | em toda a plataforma | em toda a plataforma |
| Recursos de acessibilidade | painel com 12 recursos + VLibras | widget + "Acessível em Libras" | padrão |
| Etapa de acessibilidade no cadastro | **tem** | não tem | não tem |

Escopos do LinkedIn não aparecem na tabela porque o botão deles usa o fluxo próprio do Google
(`accounts.google.com` com parâmetros que não expus); não quis afirmar o que não medi.

---

## 3. Onde o ACESSO já está na frente

Vale registrar, porque num TCC isso conta e eu confirmei na URL de autorização da Gupy:

**Segurança do OAuth.** O ACESSO pede `openid`, recebe um **ID token assinado** e confere a
assinatura, o emissor, o destinatário e um **`nonce`** contra repetição. A Gupy pede só
`userinfo.email` e `userinfo.profile` — sem `openid` não há ID token nem `nonce`. O ACESSO também
manda `prompt=select_account`, que obriga a escolher a conta; a Gupy não manda, então entra
silenciosamente com a conta que já estiver logada no navegador.

**Não vincula por e-mail.** Se já existe conta ACESSO com aquele e-mail e sem Google vinculado, o
fluxo **para**. Vincular só porque o e-mail coincide deixaria qualquer um que criasse uma conta
Google com aquele endereço assumir a conta alheia. (A intenção está certa — o problema é o que vem
depois, no item 1 da próxima seção.)

**Aceite dos termos.** O ACESSO tem checkbox explícito e grava `termos_aceitos_em` e
`termos_versao`. Gupy e LinkedIn usam aceite implícito ("ao clicar você concorda"). O do ACESSO é
mais defensável e mais acessível.

**Acessibilidade.** O painel do ACESSO tem alto contraste, modo escuro, fonte para dislexia, tamanho
de fonte, espaçamento de letras e linhas, cursor ampliado, redução de animações, destaque de foco,
leitura por voz com controle de velocidade e VLibras. E o cadastro tem uma etapa própria de
acessibilidade, que nenhuma das duas tem. Para o propósito da plataforma, isso é o diferencial.

---

## 4. O que precisa melhorar

Em ordem de gravidade.

### 1. Quem já tem conta com senha nunca consegue vincular o Google — beco sem saída

**Isto é um defeito, não uma diferença.** A tela de conflito diz:

> "Entre com ela — depois você pode vincular o Google nas configurações."

**Essa tela não existe.** O backend tem o endpoint (`POST /auth/google/vincular`), o frontend tem a
função (`googleService.vincular`), e **nada no site chama nenhum dos dois**. As configurações têm
três seções: trocar e-mail, sessões e zona de perigo. Google não aparece em nenhuma.

Consequência: quem criou conta com senha e depois tenta entrar com Google recebe "Esta conta já
existe", é mandado a um lugar que não existe, e **nunca mais consegue usar o Google naquela conta**.

Custo: uma seção nova em configurações que chama a função que já existe. Sem migration, sem mudança
de backend.

### 2. A conta não nasce no retorno do Google — e exige senha

É o que motivou esta comparação. O LinkedIn documenta explicitamente que *"Signing up with Google or
Apple does not require a password"*. A Gupy não pede senha na primeira etapa e ainda oferece "Entrar
sem senha" no login. O ACESSO exige senha.

O bloqueio é no banco: `usuarios.senha_hash` é `NOT NULL`. Os campos de perfil (país, cidade, estado,
data de nascimento) **já são opcionais**, e a máquina de retomada (`cadastro_concluido_em`) já
existe — ou seja, a maior parte da estrutura para criar cedo e completar depois já está pronta.

Custo: **exige migration** (tornar `senha_hash` nulo) e mexer no login por senha e no "esqueci minha
senha", que hoje assumem que toda conta tem senha.

### 3. `emailVerificado` fica `false` mesmo com o Google tendo verificado

O Google diz, na claim `email_verified` do ID token assinado, que confirmou aquele endereço. O
backend já lê esse campo — e depois cria a conta com `emailVerificado: false` de qualquer jeito.

Hoje isso não trava nada, porque candidato não precisa confirmar e-mail. Mas o banco está guardando
uma informação falsa, e no dia em que alguma regra depender desse campo ela vai decidir errado.

Custo: baixo. Uma linha, nenhuma migration.

### 4. Pede 10 campos antes de a conta existir

| Plataforma | Para a conta existir |
|---|---|
| LinkedIn | nome + e-mail |
| Gupy | país + CPF + e-mail |
| ACESSO | país, e-mail, CPF, senha, termos, nome, telefone, nascimento, cidade, estado |

A Gupy também pede CPF — faz sentido no contexto brasileiro, e o ACESSO acerta em pedir. A diferença
é **quando**: a Gupy cria a conta com três campos e pede o resto depois; o ACESSO pede dez antes.
Quem desiste na etapa 2 não deixa rastro, e não há como convidá-lo a voltar.

Custo: depende do item 2. Resolvido aquele, este cai junto.

### 5. Não existe entrada sem senha

A Gupy oferece "Entrar sem senha" (código por e-mail). O ACESSO já tem o componente de código OTP no
projeto — é usado na troca de e-mail (`SecaoTrocarEmail.tsx`). A peça de interface existe; falta o
fluxo de login.

Custo: médio, e só faz sentido depois do item 2.

### 6. Idioma só no cadastro, e não é salvo

Gupy e LinkedIn trocam o idioma da plataforma inteira. O ACESSO tem o seletor PT/EN/ES **só** na tela
de cadastro de candidato, e a escolha some ao recarregar. O resto do site é só português, com
`lang="pt-BR"` fixo no `index.html`.

Custo: alto, porque é i18n de verdade. É um recurso novo, não um conserto.

---

## 5. Ordem sugerida

1. **Item 1** — é um defeito que prende o usuário num beco. Barato e sem migration.
2. **Item 3** — uma linha, e para de gravar informação falsa.
3. **Item 2** — o pedido original. Precisa da sua autorização para a migration.
4. **Item 4** — sai de graça junto com o 2.
5. **Itens 5 e 6** — recursos novos, para depois do TCC entregue.

---

## Fontes

- [Sign up to join LinkedIn — LinkedIn Help](https://www.linkedin.com/help/linkedin/answer/a1338223)
- [Experiências encantadoras para pessoas candidatas — Gupy](https://www.gupy.io/experiencias-encantadoras-para-pessoas-candidatas)
- [Como atualizar o seu cadastro na Gupy](https://www.gupy.io/blog/atualizar-cadastro-gupy)
- Telas observadas em 13/10/2026: `porto.gupy.io/candidates/signin`, `porto.gupy.io/candidates/signup`,
  `linkedin.com/signup`.
