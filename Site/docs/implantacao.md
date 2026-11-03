# Implantação: migrations, chaves e ordem

Este arquivo reúne o que antes estava espalhado. **Antes de qualquer deploy, rode a conferência:**

```bash
npm run implantacao:verificar
```

Ela é **somente leitura** (só consulta `migracoes_aplicadas`), usa o banco e as variáveis do ambiente em que roda (o `.env` local, ou o Shell do Render) e sai com código 1 se alguma chave estiver ligada sem a migration dela. Nunca imprime valor de variável.

## Estado da produção (conferido em 2026-11-03, só leitura)

| Migration | Aplicada? | Recurso |
| --- | --- | --- |
| 0001 a 0006 | sim | baseline, catálogo, país do candidato, Google/termos, empresa ligada ao candidato |
| **0007** conta sem senha | **não** | `GOOGLE_CONTA_SEM_SENHA` |
| **0008** TOTP | **não** | `MFA_TOTP_HABILITADO` |
| **0009** sessões e dispositivos | **não** | `SESSOES_DISPOSITIVOS_HABILITADO` |

Correção: antes eu citava só a 0008 e a 0009 como pendentes. **A 0007 também está pendente.** Ela só relaxa `senha_hash` para aceitar nulo e cria uma regra que as contas existentes já cumprem (todas têm senha).

## As migrations rodam sozinhas no deploy?

Depende do **Build Command do serviço no Render**, que o projeto não consegue ver (o acesso ao Render pede que você escolha o workspace, e eu não escolho por você).

- O `render.yaml` declara `npm install && npm run migrate`. Se o serviço foi criado a partir desse arquivo e segue sincronizado, **o próprio deploy aplica as migrations pendentes**, cada uma numa transação, antes de o servidor novo subir; se uma falhar, o build falha e a versão anterior continua no ar.
- Se o serviço foi criado à mão no painel, o Build Command pode ser só `npm install`, e então as migrations **não** rodam sozinhas. Para saber: Render → o serviço `acesso-backend` → Settings → Build Command.

**O código está seguro nos dois casos.** Todas as colunas e tabelas novas só entram no model com a chave do recurso ligada, e as chaves vêm desligadas. Logo o código novo funciona num banco sem as migrations (foi provado: cadastro, login e renovação com banco só até a 0007).

## Ordem recomendada

1. `npm run implantacao:verificar` no Shell do Render (ou local, com o `.env` do banco certo).
2. Aplicar as migrations pendentes: pelo deploy (se o Build Command tem `npm run migrate`) ou à mão (`npm run migrate`). **Faça backup/snapshot do banco antes**, por ser produção. São aditivas e cada uma traz o rollback no cabeçalho.
3. `npm run implantacao:verificar` de novo: deve dizer "sem bloqueios" e "migration já aplicada, recurso desligado".
4. Gerar a chave do TOTP: `npm run mfa:gerar-chave` e colar no Render como `MFA_CHAVE_CIFRA` (não a guarde em arquivo nem em chat).
5. Ligar as chaves **uma por vez**, conferindo o log de inicialização (o servidor avisa se algo faltar):
   - `SESSOES_DISPOSITIVOS_HABILITADO=true`
   - `MFA_TOTP_HABILITADO=true` (opcional para administrador; veja `verificacao-em-duas-etapas.md`)
6. Testar no Site: entrar, abrir Configurações → Sessões, e, para o TOTP, ativar com o administrador.

Se algo der errado, **desligar a chave** devolve o comportamento anterior sem reverter nada no banco.

## O que o conjunto não cobre (e por quê)

- **Nome do dispositivo:** vem do `user-agent`, que o próprio navegador informa e qualquer cliente pode falsificar. Serve para a pessoa reconhecer o aparelho; não prova identidade. É uma limitação do que o cliente informa, não de implementação.
- **Localização por IP:** não existe. Exigiria um serviço externo (pago) ou um banco de geolocalização que pede cadastro e licença, e o projeto não contrata serviços. O IP aparece como está; a lista também mostra quando o dispositivo entrou e a última atividade, que ajudam a identificar um acesso estranho.
- **App Android:** é Java e fala **direto com o Supabase Auth**, sem passar pelo backend Express (conferido: nenhuma chamada à nossa API no código do app). Portanto TOTP, sessões e dispositivos **não o afetam**, e ele também não ganha esses recursos: é outra autenticação, com outros usuários. Levar isso ao app é um projeto à parte.
