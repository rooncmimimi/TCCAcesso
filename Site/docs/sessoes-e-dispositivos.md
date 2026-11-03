# Sessões e dispositivos (Bloco 2)

Configurações → Sessões e contas conectadas → **Dispositivos e sessões**. Cada dispositivo conectado à conta aparece com navegador e sistema, IP, quando entrou e a última atividade, e a pessoa pode encerrar um ou todos os outros.

## O que a auditoria encontrou e como ficou

| # | Problema | Correção | Precisa de migration? |
| --- | --- | --- | --- |
| 1 | "Encerrar as outras" sem o refresh token no corpo encerrava **todas** as sessões, inclusive a de quem pediu, sem avisar | Recusa (400 `SESSAO_ATUAL_NAO_IDENTIFICADA`) quando não consegue identificar a sessão atual; nada é encerrado | não |
| 2 | `limparExpirados()` nunca era chamada: cada renovação cria uma linha, e a tabela `sessoes` crescia sem limite | Limpeza ao iniciar e a cada 6 h: apaga vencidas há mais de 1 dia e revogadas há mais de 7 (a detecção de reuso de token segue valendo por uma semana) | não |
| 3 | Encerrar uma sessão (ou sair) **não cortava o access token**: ele valia até 30 minutos | O access token leva `sid` (o login) e o servidor confere que o login segue ativo, a cada requisição; vale também para rotas públicas e tempo real | **sim, 0009** |
| 4 | "Ativa desde" mostrava a data da última renovação, não a do login | `iniciada_em` (login) e `ultimo_uso_em` (última renovação) | **sim, 0009** |
| 5 | Sem teto de sessões por conta | `SESSOES_MAXIMO_POR_CONTA` (padrão 20): ao passar, o dispositivo menos recente é encerrado. Conta **dispositivos**, não linhas (achado na rodada funcional: duas abas renovando juntas davam duas linhas e o teto encerrava o dispositivo em uso) | não |
| 6 | `<Badge>` (div) dentro de `<p>`: HTML inválido no console | A seção usa `div` | não |

Também: o Site mostra o tipo do aparelho (celular, tablet, computador, aplicativo), o selo "Verificada em duas etapas", a atual sempre primeiro e sem botão de encerrar, e a confirmação das "outras" diz quantos dispositivos perdem o acesso. Quando o servidor encerra a sessão, o Site mostra "Esta sessão foi encerrada. Entre novamente." em vez de tentar renovar e cair mudo.

## Como ligar

Os itens 1, 2, 5 e 6 funcionam **sem** nenhuma configuração nova. Os itens 3 e 4 ficam atrás de uma chave, porque o código precisa funcionar antes de a migration existir no banco (veja `implantacao.md`: ela só roda no deploy se o Build Command do Render tiver `npm run migrate`):

1. Aplicar `0009_sessoes_e_dispositivos.sql` (`npm run migrate`). Só **acrescenta** 3 colunas e 2 índices à tabela `sessoes` e preenche as colunas novas das linhas existentes (cada uma vira a sua família). Nenhum dado é alterado ou apagado.
2. Definir `SESSOES_DISPOSITIVOS_HABILITADO=true` no Render. Ao iniciar, o servidor confere (sem alterar nada) se a migration existe e **avisa no log** se faltar.
3. Deploy do Site e da API.

Quem já está logado **não é derrubado**: o access token emitido antes (sem `sid`) vale até expirar, e a primeira renovação já devolve um com `sid`.

**Voltar atrás:** desligar a chave volta ao comportamento anterior; o rollback do SQL está no cabeçalho da migration.

### Por que a chave

O Sequelize seleciona e insere todas as colunas do model. Se o código subir antes da migration, declarar as colunas sempre derrubaria **todo** login, cadastro e renovação com `column ... does not exist`. Foi o que a rodada funcional mostrou no Bloco 1 (a coluna da 0008): corrigido, e o mesmo cuidado vale aqui. As colunas das migrations 0008 e 0009 só existem no model com a respectiva chave ligada.

## Variáveis

| Variável | Padrão | O que faz |
| --- | --- | --- |
| `SESSOES_DISPOSITIVOS_HABILITADO` | `false` | Liga o encerramento imediato e as datas verdadeiras (exige a 0009) |
| `SESSOES_MAXIMO_POR_CONTA` | `20` | Teto de dispositivos conectados por conta (mínimo 2) |

## Testes

- **Backend:** 1101 testes (serviço, middleware com `sid`, migration, avisos, model condicionado às chaves e mutação das proteções).
- **Rodada funcional contra Postgres descartável** (PGlite):
  - 46 verificações com as migrations 0001 a 0009: três dispositivos reais, renovações sequenciais e **simultâneas**, encerramento imediato, sessão de outra pessoa (404), "encerrar as outras" sem derrubar quem pediu, logout só com o access token, troca de senha, teto, limpeza e junto do TOTP;
  - **implantação:** banco só até a 0008 e chave desligada (8/8, com login, renovação, lista e "encerrar outras" funcionando); depois a 0009 aplicada sobre sessões existentes com a chave ligada (10/10: nenhuma linha antiga perdida, token antigo segue valendo e entra no sistema novo); e chave ligada **sem** a migration (o aviso aparece no log, 2/2).
- **Site:** 574 testes de componente, `tsc` limpo, build ok.
- **Navegador real (Chrome embutido):** lista com 4 dispositivos de verdade (notebook, Android, iPhone e o próprio navegador), encerrar o iPhone pela interface derrubou o token dele na hora (401 `SESSAO_ENCERRADA`) sem afetar os outros, e encerrar o próprio navegador a partir do Android mostrou a mensagem e voltou ao estado de visitante.

**Não verificado:** aparelhos físicos, leitor de tela real, e o aplicativo Android do ACESSO (outro código e outro banco; não foi tocado). O nome do dispositivo vem do `user-agent` que o próprio cliente informa, então é uma ajuda para reconhecer o aparelho, não uma identificação confiável. Não há localização por IP (exigiria serviço externo).
