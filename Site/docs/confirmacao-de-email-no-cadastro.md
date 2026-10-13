# Confirmação de e-mail no cadastro

Este documento registrava uma limitação do fluxo de candidato: a confirmação de e-mail cortava o
cadastro em dois, e as duas últimas etapas só aconteciam depois do login.

**Isso não vale mais para candidato.** O cadastro de candidato deixou de exigir confirmação de
e-mail; a conta é criada e a sessão sai na hora, no fim da etapa 2.

## Como está hoje

| | Candidato | Empresa |
| --- | --- | --- |
| Confirmação de e-mail no cadastro | não exigida | exigida |
| Resposta de `POST /auth/register/*` | sessão | `{ pendenteVerificacaoEmail }`, sem sessão |
| Login sem o e-mail confirmado | permitido | bloqueado (`emailNaoVerificado`) |
| `usuarios.email_verificado` ao criar | `false` | `false` |

O ponto importante: **o e-mail não é marcado como verificado**. `email_verificado` continua `false`
até alguém de fato confirmar o endereço — o que mudou foi só o que esse campo bloqueia. O e-mail de
confirmação continua sendo enviado no cadastro de candidato (best-effort, fora da transação), e
quem confirmar passa a ter o endereço verificado como antes.

Onde isso está no código:

- `AutenticacaoService.cadastrarCandidato` — cria conta e perfil numa transação e devolve sessão;
- `AutenticacaoService.entrar` — o bloqueio por e-mail não confirmado pula `tipoUsuario === "candidato"`;
- `AutenticacaoService.finalizarCadastro` — ficou só para empresa.

Os mecanismos de verificação continuam intactos para troca de endereço
(`/auth/email/solicitar` e `/auth/email/confirmar`) e para o cadastro de empresa.

## O que sobrou de "em dois tempos"

O cadastro tem quatro etapas e só as duas primeiras criam a conta. Quem fechar a aba depois disso
tem `usuarios.cadastro_concluido_em` nula, e o login manda para `/cadastro?retomar=true`, que reabre
na etapa 3 sem pedir de novo o que já foi preenchido. Isso é retomada, não limitação: nenhuma tela
afirma que o cadastro terminou enquanto `cadastro_concluido_em` for nula, e o backend recusa concluir
com campo obrigatório do perfil em branco.
