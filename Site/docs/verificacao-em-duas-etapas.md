# Verificação em duas etapas (TOTP)

Aplicativo autenticador (Google Authenticator, Microsoft Authenticator, Authy...), padrão RFC 6238. **Sem SMS, WhatsApp nem serviço pago.**

- **Administrador**: obrigatória. Sem ela entra, mas o servidor nega todo o painel (403 `MFA_NAO_CONFIGURADO`) e o Site leva direto à configuração. Não há como desativar pela interface.
- **Candidato e empresa**: opcional, em Configurações → Sessões e contas conectadas.
- Vale também para quem entra pelo Google: o Google prova quem é, mas o segundo fator do ACESSO continua sendo pedido.

## Como ligar (nada muda até ligar)

1. Aplicar a migration `0008_totp_e_mfa_na_sessao.sql` (`npm run migrate`). **O deploy não aplica migrations.** Ela só cria 2 tabelas e 1 coluna; não altera dados.
2. No Render, definir `MFA_CHAVE_CIFRA` (32+ caracteres aleatórios). Sem ela usa-se o `JWT_SECRET`, e trocá-lo deixaria todos os TOTP ilegíveis. O servidor avisa no log.
3. Definir `MFA_TOTP_HABILITADO=true`. Ao iniciar, o servidor confere (sem alterar nada) se a migration existe e avisa se faltar.
4. Deploy do Site e da API juntos.

**Interruptor de emergência:** `MFA_TOTP_HABILITADO=false` desliga tudo (login volta a ser só senha e o painel abre sem exigência, mesmo para quem já tem TOTP). Use só em emergência.

**Administrador que já existe** (hoje há um): ao ligar, ele entra normalmente com a senha, cai em `/configurar-verificacao`, escaneia o QR code, digita o código e guarda os 10 códigos de recuperação. Nunca há trava permanente: configurar só exige estar logado.

## Perdi o aplicativo

1. Entrar com um **código de recuperação** (cada um vale uma vez; o Site avisa quando restam poucos).
2. Sem os códigos, **outro administrador** reinicia (painel, `POST /admin/usuarios/:id/totp/reiniciar`, com motivo; nunca a própria conta).
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
1. O administrador entra com a senha: o painel **não** abre, só a tela de configuração.
2. Ele configura o TOTP novo.
3. Em Auditoria aparece `totp_reiniciado_por_script`.

## Regras de segurança implementadas

| Regra | Onde |
| --- | --- |
| Segredo cifrado (AES-256-GCM, conta no contexto da cifra, chave `MFA_CHAVE_CIFRA`) | `utils/segredosMfa.js` |
| Segredo só é gravado depois de o código ser confirmado (configuração selada, sem estado no banco) | `TotpService.ativar` |
| Códigos de recuperação: 10, uso único, só HMAC guardado, mostrados uma vez | `TotpService`, `CodigosDeRecuperacao.tsx` |
| Código usado não vale de novo (último intervalo aceito) | `conferirSegundoFator` |
| Espera depois de erros seguidos: 5ª = 1 min, 6ª = 5, 7ª = 15, 8ª+ = 60 | `TotpService` |
| Exigência no servidor: `/admin` inteiro e todas as rotas protegidas; token anterior ao reinício perde o acesso na hora | `autenticacaoMiddleware`, `TotpService.estadoDoAcesso` |
| Desafio de 5 min (audience própria) não abre sessão | `utils/jwt.js` |
| Ativar encerra as outras sessões; trocar de aparelho exige senha + código | `TotpService` |
| Ações do TOTP auditadas, sem segredo nem código | `registros_auditoria` |

## Testes (Bloco 1)

Backend: 1029 testes (unitários, mutação das proteções e inventário de rotas). **Rodada funcional** com o Backend completo contra um Postgres descartável (PGlite, migrations 0001 a 0008): 101 verificações, incluindo 4 logins simultâneos com o mesmo código (só 1 entra), reinício por outro administrador, script de emergência de ponta a ponta, rollback da migration e comportamento com a chave desligada.
Site: 518 testes de componente (jsdom). **Não verificado:** o Site num navegador real contra a API, leitura por leitor de tela real, aplicativos autenticadores reais (a geração do código segue os vetores oficiais da RFC 6238), login com Google real.
