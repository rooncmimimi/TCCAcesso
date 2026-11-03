# Verificação em duas etapas (TOTP)

Aplicativo autenticador (Google Authenticator, Microsoft Authenticator, Authy...), padrão RFC 6238. **Sem SMS, WhatsApp nem serviço pago.**

## Escopo de hoje

- **Só administrador** pode ter a verificação (`MFA_TOTP_TIPOS=administrador`). Candidato e empresa **não a têm**: o servidor recusa (403 `MFA_INDISPONIVEL_PARA_CONTA`) e o Site esconde a seção.
- É **opcional** (`MFA_TOTP_OBRIGATORIO_ADMIN=false`). Administrador sem ela entra e usa o painel como sempre. **Quem a ativa passa a ser cobrado**: o login pede o código e o servidor nega o painel a uma sessão que não passou pelo segundo fator. Pode desativar, mas só com senha e código.
- Vale também para quem entra pelo Google: o Google prova quem é, mas o segundo fator do ACESSO continua sendo pedido.

**Para mudar depois, sem alterar código:**

| Quero | Variável |
| --- | --- |
| Tornar obrigatória para administradores (sem ela entra, mas o servidor nega o painel e o Site leva à configuração; não pode desativar) | `MFA_TOTP_OBRIGATORIO_ADMIN=true` |
| Abrir para candidato e empresa | `MFA_TOTP_TIPOS=administrador,candidato,empresa` |

Os dois modos têm testes e foram exercitados contra banco real (ver o fim deste arquivo).

## Como ligar (nada muda até ligar)

1. Aplicar a migration `0008_totp_e_mfa_na_sessao.sql` (`npm run migrate`). O deploy só as aplica se o Build Command do Render tiver `npm run migrate` (veja `implantacao.md`); confira com `npm run implantacao:verificar`. Ela só cria 2 tabelas e 1 coluna; não altera dados.
2. No Render, definir `MFA_CHAVE_CIFRA` (32+ caracteres aleatórios). Sem ela usa-se o `JWT_SECRET`, e trocá-lo deixaria todos os TOTP ilegíveis. O servidor avisa no log.
3. Definir `MFA_TOTP_HABILITADO=true` (opcional para administrador, como descrito acima). Ao iniciar, o servidor confere (sem alterar nada) se a migration existe e avisa se faltar.
4. Deploy do Site e da API juntos.

**Interruptor de emergência:** `MFA_TOTP_HABILITADO=false` desliga tudo (login volta a ser só senha e o painel abre sem exigência, mesmo para quem já tem TOTP). Use só em emergência.

**Administrador que já existe** (hoje há um): ao ligar, **nada muda para ele** enquanto não ativar. Para ativar: Configurações → Sessões e contas conectadas → Verificação em duas etapas, escanear o QR code, digitar o código e guardar os 10 códigos de recuperação. Com a obrigatoriedade ligada, ele é levado a `/configurar-verificacao` ao entrar; mesmo assim nunca há trava permanente, porque configurar só exige estar logado.

## Perdi o aplicativo

1. Entrar com um **código de recuperação** (cada um vale uma vez; o Site avisa quando restam poucos).
2. Sem os códigos, **outro administrador** reinicia (painel, `POST /admin/usuarios/:id/totp/reiniciar`, com motivo; nunca a própria conta, nunca a de candidato ou empresa, e **só quem tem a própria verificação ativa** pode fazê-lo).
3. Administrador **único**: o script de emergência abaixo. **Não existe reinício por e-mail**, nem rota HTTP do script.

## Script de emergência (administrador único)

Só roda por quem tem acesso ao servidor (Shell do Render) ou uma máquina com o `.env` do banco certo.

```bash
npm run admin:resetar-totp -- pessoa@exemplo.com
```

Pergunta o motivo (10 a 300 caracteres) e pede para **digitar o e-mail da conta de novo** (responder "sim" não basta). Sem terminal: `--motivo "texto" --confirmar pessoa@exemplo.com`.

Recusa, sem alterar nada, se a conta não existe, não é de administrador, está desativada/bloqueada ou não tem TOTP. Faz tudo numa transação: apaga segredo e códigos, **encerra todas as sessões**, grava na auditoria (`totp_reiniciado_por_script`, com motivo, data e quem executou; sem segredo nem código).

**Permissões:** acesso ao Shell/serviço do Render (ou às variáveis do banco). Nenhum perfil do ACESSO executa isto.

**Como confirmar que deu certo:**
1. O administrador entra com a senha: não é pedido código (o TOTP dele foi apagado). Com a obrigatoriedade ligada, o painel **não** abre, só a tela de configuração.
2. Ele configura o TOTP novo (obrigatório só se a obrigatoriedade estiver ligada).
3. Em Auditoria aparece `totp_reiniciado_por_script`.

## Regras de segurança implementadas

| Regra | Onde |
| --- | --- |
| Segredo cifrado (AES-256-GCM, conta no contexto da cifra, chave `MFA_CHAVE_CIFRA`) | `utils/segredosMfa.js` |
| Segredo só é gravado depois de o código ser confirmado (configuração selada, sem estado no banco) | `TotpService.ativar` |
| Códigos de recuperação: 10, uso único, só HMAC guardado, mostrados uma vez | `TotpService`, `CodigosDeRecuperacao.tsx` |
| Código usado não vale de novo (último intervalo aceito) | `conferirSegundoFator` |
| Espera depois de erros seguidos: 5ª = 1 min, 6ª = 5, 7ª = 15, 8ª+ = 60 | `TotpService` |
| Exigência no servidor: `/admin` inteiro e todas as rotas protegidas cobram a sessão verificada de quem tem TOTP (e, com a obrigatoriedade, também de quem não configurou); token anterior ao reinício perde o acesso na hora | `autenticacaoMiddleware`, `TotpService.estadoDoAcesso` |
| Desafio de 5 min (audience própria) não abre sessão | `utils/jwt.js` |
| Ativar encerra as outras sessões; trocar de aparelho exige senha + código | `TotpService` |
| Ações do TOTP auditadas, sem segredo nem código | `registros_auditoria` |

## Testes (Bloco 1)

Backend: 1045 testes na entrega do Bloco 1 (hoje 1101, com o Bloco 2), com unitários, mutação das proteções e inventário de rotas. **Duas rodadas funcionais** com o Backend completo contra um Postgres descartável (PGlite, migrations 0001 a 0008): **38 verificações no modo padrão** (só administrador, opcional) e **101 no modo ampliado** (obrigatório e todos os tipos), incluindo 4 logins simultâneos com o mesmo código (só 1 entra), reinício por outro administrador, script de emergência de ponta a ponta, rollback da migration e comportamento com a chave desligada.
Site: 574 testes de componente. **Navegador real (Chrome embutido, contra a API e um banco descartáveis):** login do administrador, ativar o TOTP pela interface (QR code e chave exibidos, link `otpauth://` com o mesmo segredo), código calculado de forma **independente** pelo próprio navegador (WebCrypto, não o código do servidor) e aceito, os 10 códigos de recuperação com o botão "Concluir" travado até marcar que guardou, sair e entrar de novo com o código (erro exibido e foco de volta no campo quando o código está errado), o modo obrigatório (redirecionamento a `/configurar-verificacao`, `/admin` devolvido à configuração e 403 da API) e o layout em celular de 375 px (sem rolagem horizontal).

**Não verificado:** um aplicativo autenticador físico (Google/Microsoft Authenticator; o algoritmo segue os vetores oficiais da RFC 6238 e foi conferido contra uma segunda implementação), leitor de tela real (há rótulos, foco e erros ligados aos campos, mas ninguém ouviu), a câmera lendo o QR code, e o login com Google real.
