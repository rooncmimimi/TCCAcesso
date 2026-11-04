# Conta sem senha: criar a conta no retorno do Google (etapa 6)

Quem entra com o Google e ainda não tem conta passa a ganhar a conta **na hora**, sem inventar senha e sem
preencher o formulário inteiro antes. A senha, o CPF e o resto dos dados vêm depois, com a conta já aberta.

**Está desligado por padrão.** O código já está pronto e testado, mas nada muda para ninguém até a chave
`GOOGLE_CONTA_SEM_SENHA` ser ligada, e ela só deve ser ligada depois da migration `0007` (ver a seção 4).

## 1. O caminho da pessoa

| Passo | Tela | O que acontece |
| --- | --- | --- |
| 1 | Google | A pessoa escolhe a conta Google. |
| 2 | `/retorno-google` | O servidor devolve `cadastrar` com `contaSemSenha: true` (a chave ligada). |
| 3 | `/retorno-google` | Sem tela nenhuma: o Site chama `POST /auth/google/cadastrar` com a prova e a versão dos documentos, a conta nasce e a sessão abre. O aceite dos **Termos e da Política de Privacidade** é o aviso com os dois links logo abaixo do botão "Continuar com Google" (`BotaoGoogle`). |
| 3b | `/cadastro/google` | Só aparece se a criação do passo 3 falhar (servidor acordando, por exemplo): mostra a conta Google, pede o aceite com caixa de seleção e tenta de novo. |
| 4 | `/cadastro/dados` | País, CPF, telefone, nascimento, cidade e estado (as mesmas regras do cadastro). Grava pelos endpoints de perfil que já existiam. |
| 5 | `/cadastro/candidato?retomar=true` | As etapas de perfil e de acessibilidade que já existiam. |

Quem preferir definir uma senha e preencher tudo de uma vez tem o link "Cadastro completo" no passo 3, que leva
ao cadastro de sempre (aceita a mesma prova do Google). Com a chave desligada, o passo 2 já segue por esse
cadastro de sempre.

Consequência do passo 3: o aceite deixou de ser uma caixa marcada e passou a ser o aviso ao clicar no botão. Se o jurídico
preferir o aceite explícito, basta o `retorno-google` voltar a navegar para `/cadastro/google` quando `contaSemSenha`.

Se a pessoa fechar a aba depois do passo 3, no próximo login `destinoAposEntrar` a leva de volta aos dados
(`dadosPessoaisPendentes`), e nunca a quem já terminou o cadastro.

## 2. O que a conta sem senha pode e não pode

- **Entra** pelo Google. O login por senha responde "E-mail ou senha inválidos", igual a um e-mail que não existe,
  e com o mesmo tempo de resposta.
- **Define uma senha** quando quiser, em Configurações → Alterar senha. A prova de que a conta é dela é o e-mail:
  recebe o link da recuperação de senha. Ao definir, as sessões se encerram e ela entra de novo.
- **Não consegue**, enquanto não tiver senha: alterar a senha, pausar ou excluir a conta, trocar o e-mail e
  **desvincular o Google** (o servidor responde 409 `SEM_SENHA`, e as telas mostram o aviso e o caminho em vez de
  um campo "senha atual" sem sentido). Excluir a conta é um direito, e continua a dois passos de distância (definir
  a senha, depois excluir).
- **Nunca fica sem jeito de entrar:** o banco recusa uma conta sem senha **e** sem Google
  (`ck_usuarios_senha_ou_google`).

## 3. O que foi verificado

- Backend e Site com a suíte inteira passando; a regra do banco foi coberta pelo texto da migration e pelo modelo.
- O fluxo das telas foi visto num navegador real, com a API simulada: aceite dos termos → conta criada → dados →
  etapa de perfil do cadastro existente, sem laço entre as telas.
- **Não foi verificado:** a migration contra um banco de verdade, e o caminho completo com um Google real.

## 4. Como ligar (cada passo é seu)

1. **Aplicar a migration `0007`** no banco de produção: `npm run migrate` em `Site/Backend`. Cada migration roda
   numa transação e só é registrada se der certo. Ela só relaxa uma coluna e cria uma regra que as contas atuais
   já cumprem (todas têm senha). Como o `.env` local aponta para o banco real, **isto altera produção**.
2. No Render, definir `GOOGLE_CONTA_SEM_SENHA=true`. Ao iniciar, o servidor confere se a migration foi aplicada e
   avisa no log se não foi (`[ENV] GOOGLE_CONTA_SEM_SENHA está ligada, mas a migration 0007 … NÃO foi aplicada`).
3. Publicar o Site e a API (a ordem não importa: o Site aceita as duas respostas do servidor).
4. Testar uma vez com uma conta Google que **não** tenha conta no ACESSO e depois entrar de novo com ela.
   Conferir no banco que a conta nasceu com `senha_hash` nulo, `google_id` preenchido, `email_verificado` verdadeiro
   e `termos_aceitos_em` preenchido.

## 5. Como desligar

- **Parar de criar contas assim:** `GOOGLE_CONTA_SEM_SENHA=false` no Render. As contas já criadas continuam
  entrando normalmente, e o cadastro volta a ser o formulário com senha.
- **Voltar o banco ao que era** (só enquanto não houver conta sem senha; o comando está no cabeçalho da migration):
  `DROP CONSTRAINT ck_usuarios_senha_ou_google` e `SET NOT NULL` em `senha_hash`. Se já existir conta sem senha, o
  `SET NOT NULL` falha: é preciso que cada uma defina uma senha (ou seja excluída) antes.

## 6. Riscos que continuam

- **Contas incompletas.** Quem aceita os termos e desiste antes dos dados deixa uma conta sem CPF no banco. Não há
  limpeza automática; vale uma consulta periódica (`candidatos` sem `cpf_hash` e `usuarios.cadastro_concluido_em`
  nulo) antes de decidir um prazo.
- **Sessão roubada vale mais.** Sem senha não há segredo para pedir antes de ações sensíveis, e é por isso que as
  ações perigosas exigem definir uma senha primeiro.
- **Perder o Google, sem senha definida.** Se o Google mudar a conta ou o segredo do cliente falhar, a saída é a
  recuperação de senha por e-mail (que também define a primeira senha). Por isso o aviso de "Defina uma senha"
  aparece nas telas da conta.
