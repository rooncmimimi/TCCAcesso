# Dispositivo novo por e-mail e conta comprometida (Bloco 3)

A senha (ou o Google) sozinha não basta mais para entrar num aparelho que o ACESSO ainda não reconhece: chega um código de 6 números ao e-mail da conta. E quem desconfia de uma invasão tem um caminho para encerrar tudo e recomeçar com uma senha nova. Tudo nasce **desligado** (`DISPOSITIVOS_CONFIAVEIS_HABILITADO=false`) e **não muda o login de ninguém** até você ligar.

## O que existe

| Parte | O que faz |
| --- | --- |
| **Código por e-mail** | Depois da senha (ou do retorno do Google), um aparelho desconhecido recebe um **desafio** em vez da sessão e um código de 6 números por e-mail. Só com o código a sessão abre. |
| **Lembrar este dispositivo** | Caixa **desmarcada por padrão** na tela do código. Marcada, o Site guarda um token do aparelho (90 dias, configurável) e o login seguinte não pede o código. |
| **Dispositivos de confiança** | Em Configurações → Segurança: lista, remover um ou todos. |
| **Aviso de novo acesso** | Depois de entrar com o código, um e-mail avisa do acesso, com o botão **"Não fui eu"**. |
| **Acho que invadiram minha conta** | Pelo login (sem sessão, por e-mail) ou em Segurança (logado, com a senha atual). Encerra as sessões, remove a confiança nos dispositivos e leva à nova senha. |
| **Atividade de segurança** | O histórico recente da própria conta, sem código nem token. |

Quem tem **verificação em duas etapas (TOTP)** segue o TOTP e **nunca** o código do e-mail: o segundo fator já existe. Um administrador que ainda não configurou o TOTP passa pelo código do e-mail como qualquer um.

## Regras que o servidor impõe

**Código e desafio**

- O código vale **15 minutos**, o desafio assinado **20**; ambos de **uso único**. O desafio tem audiência própria: não serve como access token nem como desafio do TOTP.
- No banco fica só o **HMAC do código**, preso ao id do desafio (o mesmo número não vale em outro desafio). Comparação em tempo constante.
- **5 tentativas** erradas por código; depois, nem o certo vale (é preciso pedir outro).
- **Reenvio:** espera de **60 s**, no máximo **3** reenvios por desafio, e no máximo **6 códigos por hora** por conta. Um código novo **invalida o anterior**.
- A conferência roda numa **transação com a linha trancada**: três confirmações simultâneas com o mesmo código abrem **uma** sessão só.
- Conta bloqueada ou desativada é recusada **antes** de qualquer código ser enviado, e conta pausada não revela o estado antes do código.

**Aparelho de confiança**

- O token é aleatório; só o **hash** fica no banco; a resposta o entrega **uma única vez**.
- Vale para **uma conta** (o token da Ana não serve para o Beto), tem prazo e pode ser revogado. Trocar a senha, redefini-la ou proteger a conta **remove a confiança em todos**.
- O Site manda o token no cabeçalho `X-Dispositivo`; sair da conta **não** o apaga (é do aparelho, não da sessão).

**Conta comprometida**

- O pedido público responde **sempre igual**, exista a conta ou não, esteja ela bloqueada ou não. O link só chega ao e-mail da conta, vale **60 minutos**, é de **uso único**, e há **5 minutos** entre dois pedidos para a mesma conta.
- Proteger encerra **todas** as sessões, invalida na hora os access tokens já emitidos (`senhaAlteradaEm`), remove a confiança nos dispositivos, avisa por e-mail e manda o link de nova senha.
- **Nunca desliga a verificação em duas etapas.** Quem tomasse a caixa de e-mail não pode usar este caminho para tirar a segunda camada de um administrador.
- A página do link só protege **no clique** (um programa que pré-visualiza links não gasta o link nem protege a conta sem a pessoa).
- "Proteger agora" (logado) pede a senha atual (conta sem senha, só Google, não pede), encerra as **outras** sessões e preserva a atual.

## Quando o e-mail não está disponível

- **Chave ligada, sem Brevo configurado:** o recurso fica **inativo** (ninguém é trancado para fora) e o servidor avisa no log: *"a verificação de dispositivo novo está INATIVA"*. O Site mostra "temporariamente inativa".
- **Brevo configurado, mas o envio falha na hora:** o login é **recusado com 503** e o desafio é inutilizado. É melhor a pessoa tentar de novo do que entrar sem a verificação.
- **E-mail de aviso ("novo acesso", "conta protegida") que falha:** só vai para o log; nunca desfaz a ação já concluída.

## Como ligar

1. **Backup do banco** (é produção) e aplicar a migration `0010_dispositivos_confiaveis_e_eventos_de_seguranca.sql` (`npm run migrate`, ou pelo deploy, se o Build Command do Render roda `npm run migrate`). Só **cria** quatro tabelas novas; não toca em nada existente. O rollback está no cabeçalho do arquivo.
2. `npm run implantacao:verificar` deve dizer "migration já aplicada, recurso desligado".
3. Conferir que o e-mail (`BREVO_API_KEY` e `BREVO_REMETENTE_EMAIL`) está configurado.
4. Ligar `DISPOSITIVOS_CONFIAVEIS_HABILITADO=true` e conferir o log de inicialização: não deve haver nenhum aviso `[ENV]` sobre a migration 0010 nem sobre o e-mail.
5. Testar: entrar num navegador novo, receber o código, marcar "Lembrar" e entrar de novo sem código; abrir Configurações → Segurança.

Sem a migration e com a chave ligada o login falha (como em qualquer recurso deste projeto); por isso o servidor confere ao iniciar e avisa. **Desligar a chave** devolve o comportamento anterior sem reverter nada no banco.

## Variáveis

| Variável | Padrão | Para quê |
| --- | --- | --- |
| `DISPOSITIVOS_CONFIAVEIS_HABILITADO` | `false` | Liga tudo isto. |
| `DISPOSITIVOS_CONFIAVEIS_DIAS` | `90` | Quantos dias um aparelho de confiança dispensa o código (1 a 365). |
| `EMAIL_DRIVER` | `brevo` | **Só para desenvolvimento e teste:** `console` grava os e-mails em arquivo. **O servidor se recusa a subir em produção com `console`.** |
| `EMAIL_CONSOLE_ARQUIVO` | vazio | Arquivo (uma linha JSON por e-mail) do driver de console. |

### O driver de e-mail de console

Existe para testar os fluxos de ponta a ponta sem enviar nada: o e-mail inteiro (inclusive o código) vai para o arquivo; o terminal mostra só o endereço mascarado e o assunto. Em produção ele não existe: `env.js` encerra o processo e o `EmailService` o ignora se alguém contornar.

## Testes

- **Backend:** 1244 testes (serviços, portão de login, rotas e limitadores, validadores, migration, avisos, driver de console em produção). **33 mutações** nas proteções (código reutilizável, sem limite de tentativas, HMAC sem o id, sem espera de reenvio, sem teto por hora, dispositivo revogado reconhecido, link reutilizável, proteger sem revogar/encerrar, TOTP desligado pelo caminho, resposta que revela a conta, driver de console em produção...), todas pegas.
  - Um teste **achou um defeito real** na primeira versão: a mensagem de tentativas restantes contava a tentativa errada duas vezes. Corrigido.
- **Rodada funcional contra Postgres descartável** (PGlite, migrations 0001 a 0010, Backend completo, e-mail no arquivo): **93/93** verificações: código errado/vencido/inventado, 5 tentativas, reenvio e tetos, três confirmações simultâneas (uma sessão), aparelho de confiança (hash só no banco, outra conta não o usa, token gigante, expiração, revogar), TOTP sem passar pelo e-mail, e-mail que falha (503, desafio inutilizado), conta comprometida (resposta idêntica, links simultâneos, sessões e access tokens derrubados na hora, **TOTP intacto**), "Não fui eu", proteger agora, troca e redefinição de senha, histórico sem segredo, exclusão da conta apagando o rastro.
  - **Estados:** chave desligada (login igual ao de antes, rotas novas 503), ligada sem e-mail (inativa, login direto, aviso no log), ligada sem a migration (aviso no log, como previsto) e produção com `EMAIL_DRIVER=console` (o processo encerra com a mensagem).
- **Site:** 646 testes, `tsc` e `eslint` sem erros, build ok.
- **Navegador real (Chrome embutido, Site em modo de teste apontando para o Backend descartável):** login em aparelho novo → tela do código → código errado (erro, foco volta ao campo, relógio do reenvio) → código certo com "Lembrar" → sessão aberta; segundo login sem código; seções de Segurança com os dados reais; pedido público de proteção, página do link (nada acontece antes do clique) e a conta protegida de verdade.

**Não verificado:** e-mail real (Brevo) e caixas de entrada reais, leitor de tela real, aparelhos físicos, login com Google real (o retorno do Google com aparelho novo foi coberto por teste de componente, não pelo Google de verdade) e o aplicativo Android (outra autenticação, outro banco; não foi tocado). O nome do aparelho vem do `user-agent` informado pelo cliente: serve para reconhecer, não para provar. Não há localização por IP.

## Limites que continuam

- **O e-mail é o elo:** quem controla a caixa de entrada controla este caminho para contas **sem** TOTP. Por isso o TOTP é a camada forte, e a proteção da conta nunca o desliga.
- **Aparelho de confiança roubado vale até o prazo** ou até ser removido. Trocar a senha ou "proteger a conta" remove todos.
- **Conta sem e-mail funcional** não consegue receber o código (e, com o envio falhando, o login é recusado em vez de liberado).
