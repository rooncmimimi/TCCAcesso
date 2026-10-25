## Administrador

O administrador é a conta de moderação e supervisão do ACESSO. Ele entra pelo mesmo login das outras contas, é levado ao painel `/admin` e trabalha ali em oito áreas (abas): **Relatórios, Denúncias, Empresas, Usuários, Postagens, Comentários, Vagas e Logs**. Fora do painel, usa as funções comuns da plataforma. Algumas ações administrativas existem só na API, sem tela (UC-A33 a UC-A39). O aplicativo Android (`App/AcessoApk`) é um projeto separado e não faz parte desta descrição. A base é o código atual da branch `claude/zealous-pasteur-2cu3a1` (frontend em `Site/Frontend`, backend em `Site/Backend`).

Também pode usar as funções comuns UC-G (feed, mensagens, notificações, seguir, denunciar, bloquear, configurações, acessibilidade, idioma, busca e perfil público). O que muda para o administrador está em "Funções comuns e diferenças do administrador", no fim desta seção.

### Tabela-resumo

| ID | Caso de uso | Resumo |
|---|---|---|
| UC-A01 | Criar conta de administrador | Um responsável técnico cria a conta pelo terminal (`npm run criar-admin`), pois não há cadastro público. |
| UC-A02 | Acessar o painel administrativo | Entrar com a conta de administrador e cair em `/admin`, com as oito abas de gestão. |
| UC-A03 | Consultar relatórios e indicadores | Ver nove contadores, dois gráficos e as deficiências mais declaradas. |
| UC-A04 | Listar e filtrar usuários | Tabela de contas com busca por nome ou e-mail e filtro por tipo. |
| UC-A05 | Consultar detalhe de um usuário | Dados básicos, denúncias recebidas e histórico administrativo de uma conta. |
| UC-A06 | Bloquear usuário | Tira o acesso da conta, avisa por notificação e por e-mail e registra no log. |
| UC-A07 | Desbloquear usuário | Devolve o acesso a uma conta bloqueada e notifica a pessoa. |
| UC-A08 | Excluir conta de usuário definitivamente | Apaga a conta e seus dados (irreversível), com motivo opcional no log. |
| UC-A09 | Listar empresas e consultar a situação do cadastro | Tabela de todas as empresas com status de aprovação e selo de verificada. |
| UC-A10 | Aprovar cadastro de empresa | Libera a empresa para operar (publicar vagas etc.) e a notifica. |
| UC-A11 | Reprovar cadastro de empresa | Recusa o cadastro com motivo opcional, mostrado à empresa. |
| UC-A12 | Suspender empresa | Suspende uma empresa aprovada, com motivo opcional, notificação e e-mail. |
| UC-A13 | Reativar empresa suspensa | Devolve a empresa suspensa ao status aprovada e a notifica. |
| UC-A14 | Conceder ou remover o selo "Empresa verificada" | Selo de confiança, independente da aprovação cadastral. |
| UC-A15 | Listar e filtrar denúncias | Fila de denúncias com filtro por status e por tipo de conteúdo. |
| UC-A16 | Consultar detalhe da denúncia e o conteúdo denunciado | Dados da denúncia e prévia mínima do item denunciado. |
| UC-A17 | Consultar contexto de mensagem denunciada | Lê a mensagem denunciada com até 3 antes e 3 depois, sempre com registro em log. |
| UC-A18 | Assumir denúncia ("Atribuir a mim") | Marca a denúncia como "Em análise" e define o responsável. |
| UC-A19 | Resolver denúncia | Encerra como resolvida, com observação e, se quiser, a ação de moderação do tipo. |
| UC-A20 | Rejeitar denúncia | Encerra sem violação e avisa o denunciante. |
| UC-A21 | Arquivar denúncia | Encerra sem avisar o denunciante. |
| UC-A22 | Buscar publicações e consultar detalhe | Lista as publicações ativas, busca por texto e abre o detalhe com mídia e histórico. |
| UC-A23 | Remover publicação | Exclusão lógica da publicação, com log detalhado e aviso ao autor. |
| UC-A24 | Buscar comentários e consultar detalhe | Lista os comentários ativos, busca por texto e abre o detalhe. |
| UC-A25 | Remover comentário | Exclusão lógica do comentário, com log e aviso ao autor. |
| UC-A26 | Listar vagas para moderação | Tabela com todas as vagas da plataforma. |
| UC-A27 | Alterar status de vaga | Troca a vaga entre Aberta, Arquivada e Encerrada, sem confirmação. |
| UC-A28 | Remover vaga | Apaga a vaga e suas candidaturas (irreversível). |
| UC-A29 | Ocultar e reexibir vaga | Tira a vaga das buscas sem apagá-la; no Site só pela resolução de denúncia. |
| UC-A30 | Consultar logs de auditoria | Tabela somente leitura das ações administrativas, com filtro por ação. |
| UC-A31 | Consultar detalhe de um registro de auditoria | Painel lateral com descrição, retrato do conteúdo, IP, dispositivo e dados brutos. |
| UC-A32 | Consultar o currículo de um candidato | Abre o perfil de um candidato e visualiza ou baixa o currículo enviado por ele. |
| UC-A33 | Consultar contas e ativar ou desativar uma conta pela API | Lista e consulta contas e muda só o campo `ativo`, sem tela no painel. |
| UC-A34 | Gerenciar o catálogo de deficiências pela API | Cria, edita e apaga itens do catálogo, sem tela no painel. |
| UC-A35 | Remover só o perfil de candidato ou de empresa pela API | Apaga o perfil e deixa a conta de usuário existindo, sem tela no painel. |
| UC-A36 | Editar dados de outras contas e de conteúdos pela API | Altera conta, empresa, candidato, publicação e vaga de terceiros, sem tela e sem log. |
| UC-A37 | Consultar talentos, candidaturas e estatísticas de vaga pela API | Leituras que a API libera ao administrador, sem tela no painel. |
| UC-A38 | Alterar ou cancelar candidaturas pela API | Muda o status de uma candidatura (com aviso ao candidato) ou a cancela, sem tela. |
| UC-A39 | Consultar métricas resumidas pela API | Endpoint de totais que o Site não usa (a tela usa `/api/admin/relatorios`). |

### Convenções do painel (valem para todos os casos abaixo)

- Toda rota `/api/admin/*` exige token válido e conta do tipo administrador (`adminRoutes.js`: `autenticacaoMiddleware` e `exigirTipoUsuarioMiddleware("administrador")`). Sem token: 401 "Token não informado." (ou "Token inválido ou expirado."). Conta de outro tipo: 403 "Você não possui permissão para esta ação.".
- No Site, `/admin` e todas as suas páginas ficam atrás de `GuardaAcesso` para administrador: sem sessão vai para `/entrar`; candidato ou empresa vai para `/feed`.
- Listas mostram 10 itens por página (a tela fixa `limit: 10`; a API aceita até 100), do mais recente para o mais antigo, com rodapé "Página X de Y · N registros" e botões Anterior e Próxima. Cada lista tem estado de carregamento, estado vazio e estado de erro com botão "Tentar novamente".
- Identificador que não é UUID e campos que violam regra de validação voltam como 422 "Erro de validação." (ou "Identificador inválido."). Falha genérica de uma ação aparece como aviso "Não foi possível concluir a ação.". Quando a API devolve uma mensagem específica, a tela mostra essa mensagem.
- Toda ação do painel que altera dados pede confirmação em diálogo. As exceções são alterar o status de uma vaga (UC-A27) e assumir uma denúncia (UC-A18).
- Toda ação de moderação feita pelo painel grava um registro em `registros_auditoria` com o administrador (tirado do token, nunca do corpo da requisição), o IP e o navegador (UC-A30); a leitura de contexto de mensagem denunciada também (UC-A17). Listagens e detalhes não gravam nada. As edições feitas só pela API em dados de terceiros (UC-A36, UC-A38) e a consulta de currículo (UC-A32) não geram registro. A API tem ainda um limite geral de 300 requisições por 15 minutos por IP.
- Campos booleanos enviados à API como texto (por exemplo `"false"` ou `"0"`) passam na validação, mas são lidos como verdadeiros; o Site sempre envia o valor booleano de verdade.
- O painel existe em português, inglês e espanhol. As descrições de logs e de notificações ficam gravadas em português e são traduzidas na leitura. Textos digitados pelo administrador (motivo, observação) não são traduzidos.

## Administrador — Acesso e conta

### UC-A01 — Criar conta de administrador

- **Ator:** Responsável técnico (pessoa com acesso ao terminal do servidor e ao banco de dados). Ator secundário: banco de dados.
- **Descrição:** Cria uma conta de administrador, ou transforma uma conta existente de candidato ou empresa em administradora. Não existe cadastro público de administrador.
- **Pré-condições:** Acesso ao terminal na pasta `Site/Backend`, com as dependências instaladas e o arquivo `.env` apontando para o banco que receberá a conta.
- **Fluxo principal:**
  1. O responsável executa `npm run criar-admin` (aceita `-- --email pessoa@exemplo.com --nome "Nome"`).
  2. O script mostra o nome e o servidor do banco em uso.
  3. Pede o e-mail (sem espaços nas pontas e convertido para minúsculas) e confere o formato.
  4. Pede o nome (Enter assume "Administrador").
  5. Pede a senha e a confirmação, sem exibir o que é digitado. A senha precisa ter de 8 a 72 caracteres, uma letra minúscula, uma maiúscula, um número e um caractere especial (as mesmas regras do cadastro).
  6. Pergunta "Criar o administrador ... neste banco? (s/N)".
  7. Com "s", grava a conta com tipo `administrador`, senha em hash e e-mail já marcado como verificado, e informa que a pessoa "já pode entrar pelo Site".
- **Fluxos alternativos e exceções:**
  - E-mail inválido, e-mail que já é de administrador, senha fora das regras ou confirmação diferente: o script termina com a mensagem e nada é alterado.
  - Já existe conta de candidato ou empresa com o e-mail: sem a opção `--promover`, o script recusa. Com `-- --email x --promover`, a conta vira administradora após a pergunta "Continuar? (s/N)". Nesse caso o nome não é perguntado (a conta mantém o nome que já tinha). O perfil de candidato ou de empresa é apagado (com as candidaturas, ou com as vagas e candidaturas da empresa; a mensagem de confirmação mostra a contagem), a senha passa a ser a digitada, as sessões abertas são encerradas e os tokens de notificação push são removidos.
  - `--promover` sem conta existente: o script recusa.
  - Qualquer resposta diferente de "s" na confirmação cancela, sem alterar nada.
- **Pós-condições:** Nova linha em `usuarios` com `tipo_usuario = administrador` (ou conta promovida). Nenhuma notificação, e-mail ou registro de auditoria é gerado.
- **Regras de negócio:** A API pública só cadastra candidato e empresa (`/auth/register/candidato` e `/auth/register/empresa`); entrar com Google cria sempre conta de candidato (`GoogleAuthService`: "nenhum parâmetro de URL promove ninguém a empresa ou administrador"). O papel vive só em `usuarios.tipo_usuario` (a tabela `administradores` foi removida na migração `0003`). A senha nunca é aceita por argumento de linha de comando. Na promoção, o script não altera os campos de bloqueio, de desativação, de pausa nem o vínculo com o Google da conta antiga, e não apaga do armazenamento os arquivos do perfil removido (currículo, logo). Uma conta bloqueada ou desativada que for promovida continua sem conseguir entrar.
- **Telas e endpoints:** Terminal: `npm run criar-admin` (`Site/Backend/scripts/criarAdministrador.js`). Não há tela nem endpoint.

### UC-A02 — Acessar o painel administrativo

- **Ator:** Administrador.
- **Descrição:** O administrador entra no Site e chega ao painel `/admin`, onde navega pelas oito abas de gestão. O login em si é o mesmo das demais contas (UC-V23); aqui ficam só as diferenças do administrador.
- **Pré-condições:** Conta de administrador existente (UC-A01), ativa, não bloqueada e com e-mail verificado.
- **Fluxo principal:**
  1. Abre `/entrar` e entra com e-mail e senha (UC-V23) ou, se a conta já tiver o Google vinculado, com "Continuar com Google" (UC-V20).
  2. O sistema confere as credenciais e os portões da conta (ativa, não bloqueada, e-mail verificado, não pausada), registra `ultimoLogin` e abre a sessão.
  3. Como o tipo da conta é administrador, o Site leva direto a `/admin` (candidato e empresa vão para `/feed`).
  4. O painel mostra a barra de navegação "Navegação administrativa" com: Relatórios, Denúncias, Empresas, Usuários, Postagens, Comentários, Vagas e Logs. A página inicial é Relatórios.
  5. Depois, o administrador volta ao painel pelo menu do perfil ("Painel administrativo") ou por `/dashboard`, que encaminha administrador para `/admin`.
- **Fluxos alternativos e exceções:**
  - Erros de credencial, limite de tentativas (10 falhas por IP em 15 minutos) e e-mail não confirmado: como em UC-V23.
  - Conta bloqueada pela moderação ou desativada: 403 "Usuário desativado." (no login a checagem de `ativo` vem antes da de `bloqueado`).
  - Conta pausada pelo próprio administrador: o login pede a confirmação de reativação (UC-V24) e, depois dela, leva a `/feed`, não a `/admin`; o painel é alcançado pelo menu do perfil.
  - Candidato ou empresa que abre `/admin` é redirecionado para `/feed`; quem não tem sessão vai para `/entrar`.
  - Sessão em uso, com conta bloqueada depois: toda requisição passa a responder 403 "Sua conta foi bloqueada pela moderação do ACESSO." (com "Motivo: ...", se houver); o Site encerra a sessão local e mostra a mensagem.
  - Troca ou redefinição de senha invalida os tokens anteriores: 401 "Sua senha foi alterada. Entre novamente.".
- **Pós-condições:** `ultimoLogin` atualizado e sessão (token de acesso e de renovação) criada. Nada é gravado em auditoria.
- **Regras de negócio:** O tipo da conta é relido do banco a cada requisição (`autenticacaoMiddleware`), então o token sozinho não concede permissão se a conta foi bloqueada, desativada ou perdeu o tipo. O administrador não passa pelo cadastro público.
- **Telas e endpoints:** `/entrar`, `/retorno-google`, `/admin`, `/dashboard` (apenas redireciona); `POST /api/auth/login`; `GET /api/auth/me`; todas as rotas `/api/admin/*`.

## Administrador — Relatórios

### UC-A03 — Consultar relatórios e indicadores da plataforma

- **Ator:** Administrador.
- **Descrição:** Mostra uma visão geral da plataforma com contadores, gráficos e as deficiências mais declaradas pelos candidatos.
- **Pré-condições:** Administrador autenticado.
- **Fluxo principal:**
  1. Abre `/admin` (aba "Relatórios").
  2. O sistema consulta `GET /api/admin/relatorios` (as contagens são feitas em paralelo).
  3. A tela mostra o título "Relatórios" e "Atualizado em" com a data e a hora do servidor.
  4. Nove cartões numéricos: Usuários, Candidatos, Empresas, Empresas pendentes, Vagas, Vagas abertas, Candidaturas, Publicações e Usuários bloqueados.
  5. Gráfico de barras "Visão geral da plataforma", com cinco barras: Candidatos, Empresas, Vagas, Candidaturas e Publicações.
  6. Gráfico de rosca "Candidaturas por status", com legenda em texto (a leitura não depende só da cor).
  7. Lista "Deficiências mais declaradas", com até 10 itens em ordem decrescente (nome e total).
- **Fluxos alternativos e exceções:**
  - Falha ao carregar: "Não foi possível carregar os relatórios." e botão "Tentar novamente".
  - Sem candidaturas: o gráfico de rosca mostra "Ainda não há candidaturas registradas.".
  - Sem deficiências declaradas: o bloco da lista não aparece. Deficiência sem nome aparece como "Não informada".
- **Pós-condições:** Nada é gravado (somente leitura, sem log).
- **Regras de negócio:** `AdminRelatorioService`. Usuários conta todas as contas (inclusive administradores e bloqueadas). Candidatos e Empresas contam contas por tipo. Empresas pendentes conta empresas com status "pendente". Vagas conta todas, de qualquer status. Vagas abertas conta status "aberta". Publicações conta só as ativas (não removidas). Usuários bloqueados conta `bloqueado = verdadeiro`. Não há filtro por período nem exportação. A API também devolve cadastros por mês (12 meses) e "contratações" (candidaturas aprovadas), mas a tela não os exibe; o indicador de contratações foi retirado de propósito, porque o ACESSO não confirma contratação (comentário em `routes/admin/index.tsx`). Os dados de deficiência são agregados (nome e total).
- **Telas e endpoints:** `/admin` (tela); `GET /api/admin/relatorios` (API).

## Administrador — Usuários

### UC-A04 — Listar e filtrar usuários

- **Ator:** Administrador.
- **Descrição:** Mostra as contas da plataforma em tabela, com busca e filtro por tipo.
- **Pré-condições:** Administrador autenticado.
- **Fluxo principal:**
  1. Abre `/admin/usuarios`.
  2. O sistema lista as contas, da mais nova para a mais antiga, com as colunas Nome (link para o detalhe), E-mail, Tipo (Candidato, Empresa ou Administrador), Situação (Ativo ou Bloqueado) e Ações.
  3. O administrador digita no campo "Buscar por nome" (placeholder "Nome do usuário") e/ou escolhe o tipo em "Tipo" (Todos, Candidato, Empresa, Administrador). A lista se atualiza enquanto ele digita ou escolhe; o botão "Filtrar" só volta para a página 1.
  4. Navega pelas páginas (10 por página).
- **Fluxos alternativos e exceções:**
  - Nenhum resultado: "Nenhum usuário encontrado com esses filtros.".
  - Falha: "Não foi possível carregar os usuários." e "Tentar novamente".
- **Pós-condições:** Nenhuma alteração (somente leitura).
- **Regras de negócio:** `AdminUsuarioService.listarUsuarios`. O texto de busca procura o trecho (sem diferenciar maiúsculas, até 120 caracteres) no nome **ou** no e-mail, embora o rótulo diga só "nome". Digitar na busca não volta para a página 1; só a troca do tipo e o botão "Filtrar" fazem isso. A API aceita também `bloqueado=true|false`, que a tela não usa. A coluna Situação vem de `ativo`: conta pausada pelo próprio usuário continua aparecendo como "Ativo", e conta desativada pela API (UC-A33) aparece como "Bloqueado". A senha nunca sai na resposta.
- **Telas e endpoints:** `/admin/usuarios` (tela); `GET /api/admin/usuarios?page&limit&q&tipo` (API).

### UC-A05 — Consultar detalhe de um usuário

- **Ator:** Administrador.
- **Descrição:** Abre a ficha de uma conta, com denúncias recebidas e o histórico de ações administrativas sobre ela.
- **Pré-condições:** Administrador autenticado; usuário existente.
- **Fluxo principal:**
  1. Na lista (UC-A04), clica no nome do usuário.
  2. O sistema carrega `GET /api/admin/usuarios/:id`.
  3. A tela mostra o nome, o selo Ativo ou Bloqueado, o link "Ver perfil público" (abre `/perfil/$usuarioId`, UC-G14) e, quando permitido, o botão "Excluir conta" (UC-A08).
  4. Cartão de dados: E-mail, Tipo, Cadastrado em e Última atividade ("Nunca acessou", se vazio).
  5. Cartão "Denúncias recebidas": até 5 denúncias contra o usuário, cada uma com o motivo (link para `/admin/denuncias/$denunciaId`) e o status; ou "Nenhuma denúncia contra este usuário.".
  6. Cartão "Histórico administrativo": tabela de logs (UC-A30) filtrada para esse usuário.
- **Fluxos alternativos e exceções:**
  - Usuário inexistente (404) ou falha: "Não foi possível carregar este usuário." e "Tentar novamente". O link "Voltar para usuários" leva à lista.
  - Identificador que não é UUID: 422 "Identificador inválido.".
- **Pós-condições:** Nenhuma alteração.
- **Regras de negócio:** A API devolve o registro do usuário sem a senha (inclui telefone e motivo do bloqueio), mas a tela exibe só os campos acima. O motivo do bloqueio não aparece em nenhuma tela do painel (fica no log, em "Dados brutos"). A tela de detalhe não tem botão de bloquear ou desbloquear (só a lista tem). O histórico filtra só pelo identificador (`entidadeId`) e mostra os registros cuja entidade é o próprio usuário: bloqueio e desbloqueio e, só pela API, ativação, desativação e remoção do perfil de candidato. Ações sobre uma empresa (aprovar, suspender, selo) são gravadas com o id da empresa e não aparecem nesse histórico; a exclusão da conta apaga a própria ficha. As denúncias listadas são só as de tipo "Usuário": denúncias do tipo "Empresa" feitas contra a empresa dessa conta não entram.
- **Telas e endpoints:** `/admin/usuarios/$usuarioId` (tela); `GET /api/admin/usuarios/:id`, `GET /api/admin/denuncias?entidadeTipo=usuario&entidadeId=<id>&limit=5`, `GET /api/admin/logs?entidadeId=<id>` (API).

### UC-A06 — Bloquear usuário

- **Ator:** Administrador. Ator secundário: usuário bloqueado (recebe aviso).
- **Descrição:** Impede o acesso de uma conta à plataforma, sem apagar dados.
- **Pré-condições:** Administrador autenticado; conta-alvo com situação "Ativo" que não seja a do próprio administrador nem de outro administrador.
- **Fluxo principal:**
  1. Em `/admin/usuarios`, clica em "Bloquear" na linha da conta.
  2. O diálogo "Bloquear usuário" pergunta: Confirma bloquear o acesso de "Nome"?
  3. O administrador confirma ("Bloquear").
  4. O sistema grava `bloqueado = verdadeiro`, `bloqueadoEm` com a data atual e `ativo = falso`. A tela não pede motivo, então o motivo fica vazio.
  5. O sistema cria a notificação interna "Conta bloqueada" ("Sua conta foi bloqueada. Motivo: não informado."), grava o log `bloquear_usuario` e envia o e-mail "Sua conta foi bloqueada — ACESSO", no idioma da conta bloqueada (sem a linha de motivo, quando não há motivo).
  6. A tela mostra "Usuário bloqueado." e atualiza a lista.
- **Fluxos alternativos e exceções:**
  - Bloqueio com motivo: pela tela só é possível ao resolver uma denúncia de usuário (UC-A19), em que a observação vira o motivo. Pela API, o campo `motivo` aceita até 1000 caracteres (422 "Motivo deve ter no máximo 1000 caracteres.").
  - O botão "Bloquear" aparece também nas linhas de administradores e na própria linha, mas o servidor recusa: própria conta, 400 "Você não pode bloquear a própria conta."; outro administrador, 403 "Contas administrativas não podem ser bloqueadas por aqui.". A tela mostra a mensagem do servidor.
  - Usuário inexistente: 404 "Usuário não encontrado.".
  - O e-mail só sai se o provedor de e-mail estiver configurado. Uma falha no envio nunca desfaz nem atrasa o bloqueio (é só registrada em log do servidor).
- **Pós-condições:** Conta com `bloqueado`, `bloqueadoEm`, `motivoBloqueio` e `ativo = falso`. A pessoa perde o acesso na hora: toda requisição autenticada passa a responder 403 `CONTA_BLOQUEADA`, o Site encerra a sessão local e a conexão em tempo real também é recusada. Para entrar de novo, o login responde "Usuário desativado.". A notificação interna fica gravada, mas a pessoa só a verá se for desbloqueada; por isso existe o e-mail.
- **Regras de negócio:** `AdminUsuarioService.alternarBloqueio` e `garantirAlvoDeAcaoAdministrativa` (nunca contra a própria conta nem contra outra conta administrativa). Bloquear de novo uma conta já bloqueada (possível pela resolução de denúncia) repete notificação, e-mail e log. Bloquear a conta de uma empresa não altera o `statusAprovacao` dela (para tirar a empresa do ar sem impedir o login, use UC-A12).
- **Telas e endpoints:** `/admin/usuarios` (tela); `POST /api/admin/usuarios/:id/bloquear` com `{ bloqueado: true, motivo }` (API).

### UC-A07 — Desbloquear usuário

- **Ator:** Administrador. Ator secundário: usuário desbloqueado (recebe aviso).
- **Descrição:** Devolve o acesso a uma conta que estava bloqueada.
- **Pré-condições:** Administrador autenticado; conta com situação "Bloqueado" (isto é, `ativo = falso`).
- **Fluxo principal:**
  1. Em `/admin/usuarios`, clica em "Desbloquear" na linha da conta.
  2. O diálogo "Desbloquear usuário" pergunta: Confirma desbloquear o acesso de "Nome"?
  3. O administrador confirma.
  4. O sistema grava `bloqueado = falso`, apaga `bloqueadoEm` e `motivoBloqueio` e define `ativo = verdadeiro`.
  5. Cria a notificação "Conta reativada" ("Sua conta foi reativada pela moderação.") e grava o log `reativar_usuario`.
  6. A tela mostra "Usuário desbloqueado." e atualiza a lista.
- **Fluxos alternativos e exceções:** As mesmas proteções do UC-A06: o servidor recusa a própria conta (400 "Você não pode bloquear a própria conta.") e contas administrativas (403 "Contas administrativas não podem ser bloqueadas por aqui."); as mensagens falam em "bloquear" mesmo ao desbloquear, porque o desbloqueio usa o mesmo método. Usuário inexistente: 404.
- **Pós-condições:** A pessoa volta a conseguir entrar. Não é enviado e-mail de desbloqueio (só a notificação interna).
- **Regras de negócio:** O botão aparece para qualquer conta com `ativo = falso`, e desbloquear sempre religa `ativo`, mesmo que a conta tenha sido desativada por outro caminho (rota `PATCH /api/usuarios/:id/desativar`, só pela API, UC-A33).
- **Telas e endpoints:** `/admin/usuarios` (tela); `POST /api/admin/usuarios/:id/bloquear` com `{ bloqueado: false }` (API).

### UC-A08 — Excluir conta de usuário definitivamente

- **Ator:** Administrador. Ator secundário: usuário excluído (não é avisado).
- **Descrição:** Apaga permanentemente uma conta e os dados ligados a ela. É irreversível.
- **Pré-condições:** Administrador autenticado; conta-alvo que não seja administradora nem a do próprio administrador.
- **Fluxo principal:**
  1. Clica em "Excluir conta" na linha da lista (`/admin/usuarios`) ou no topo do detalhe (`/admin/usuarios/$usuarioId`). O botão só aparece para contas que não são de administrador nem a própria.
  2. O diálogo "Excluir conta definitivamente" mostra o nome e o e-mail, o aviso em vermelho "Esta ação é irreversível. ..." e o campo "Motivo (opcional)" (placeholder "Registrado no log de auditoria administrativa").
  3. O administrador confirma em "Excluir definitivamente".
  4. O sistema reúne e tenta apagar os arquivos da conta no armazenamento (foto, capa, logo e capa da empresa, currículo e anexos das publicações).
  5. Em uma única transação: trava a linha do usuário, arquiva as denúncias pendentes ou em análise contra essa conta, apaga o usuário e grava o log `excluir_usuario`.
  6. A tela mostra "Usuário excluído definitivamente."; na lista atualiza a tabela, no detalhe volta a `/admin/usuarios`.
- **Fluxos alternativos e exceções:**
  - Própria conta: 400 "Você não pode excluir a própria conta."; conta administrativa: 403 "Contas administrativas não podem ser excluídas por aqui." (a tela já esconde o botão nesses casos).
  - Usuário inexistente, ou segunda exclusão simultânea da mesma conta: 404 "Usuário não encontrado.".
  - Falha ao gravar o log: a exclusão do banco é desfeita (a conta nunca é apagada sem log). Os arquivos do armazenamento, porém, são apagados antes da transação e não voltam.
  - Falha ao apagar arquivos do armazenamento: não impede a exclusão; o resultado fica em log do servidor e em `storage.falhas` no registro de auditoria.
  - Erro geral: "Não foi possível excluir esta conta.".
- **Pós-condições:** Conta e dados dependentes apagados. As denúncias pendentes ou em análise **sobre a própria conta** passam a "arquivada" com a observação "Encerrada automaticamente: a conta denunciada foi excluída.": para conta de candidato, as de tipo "Usuário"; para conta de empresa, só as de tipo "Empresa" (as de tipo "Usuário" contra o usuário da empresa continuam abertas, apontando para uma conta que não existe mais). O log `excluir_usuario` guarda nome, e-mail e tipo da conta, o motivo, o número de denúncias arquivadas e o resumo do armazenamento. Não há e-mail nem notificação para a pessoa excluída.
- **Regras de negócio:** `AdminUsuarioService.removerUsuario` e `excluirContaDefinitivamente`, o mesmo núcleo usado quando o próprio usuário exclui a conta pelas Configurações (UC-G42, que não grava log). Pelas chaves estrangeiras do banco (`0001_esquema_inicial.sql`): apagam em cascata o perfil de candidato ou de empresa, as vagas e candidaturas da empresa, publicações (com seus comentários e curtidas), comentários, curtidas, compartilhamentos, vínculos de seguir e de bloqueio, notificações e sessões. Permanecem: os logs de auditoria (o administrador autor passa a "Conta removida"); as denúncias feitas pela conta (o denunciante passa a "Usuário removido"); denúncias sobre conteúdo da conta (publicação, comentário, vaga, mensagem), que ficam abertas e sem conteúdo ("Este conteúdo não existe mais ou já foi removido."); as mensagens e conversas, cujo remetente vira nulo e o histórico fica para o outro participante (o aviso da tela diz que as mensagens serão apagadas, o que não corresponde ao banco); e a empresa cadastrada por uma conta de candidato excluída, que continua existindo (`usuario_candidato_id` vira nulo). O motivo é opcional e não tem limite de tamanho validado. Excluir pela API em `DELETE /api/usuarios/:id` tem o mesmo efeito, sem motivo.
- **Telas e endpoints:** `/admin/usuarios` e `/admin/usuarios/$usuarioId` (telas); `DELETE /api/admin/usuarios/:id` com `{ motivo }` (API).

## Administrador — Empresas

### UC-A09 — Listar empresas e consultar a situação do cadastro

- **Ator:** Administrador.
- **Descrição:** Mostra todas as empresas cadastradas, com o status de aprovação e o selo de verificada, e é o ponto de partida das ações de UC-A10 a UC-A14.
- **Pré-condições:** Administrador autenticado.
- **Fluxo principal:**
  1. Abre `/admin/empresas`.
  2. O sistema lista as empresas, da mais nova para a mais antiga, com as colunas Empresa (nome fantasia ou razão social), CNPJ, Cidade/UF, Status (Aprovada, Pendente, Reprovada ou Suspensa), Verificada ("Verificada" ou "Não verificada") e Ações.
  3. Por linha, as ações disponíveis: "Verificar" ou "Remover selo" (sempre); se a empresa está Suspensa, "Reativar"; caso contrário, "Aprovar" (desabilitado se já aprovada), "Reprovar" (desabilitado se já reprovada) e "Suspender" (só se aprovada).
- **Fluxos alternativos e exceções:**
  - Sem empresas: "Nenhuma empresa cadastrada até o momento.".
  - Falha: "Não foi possível carregar as empresas." e "Tentar novamente".
- **Pós-condições:** Nenhuma alteração.
- **Regras de negócio:** A tela lista todas as empresas, sem campo de busca nem de filtro: pendentes não ficam separadas nem em primeiro lugar (a contagem de pendentes está nos Relatórios, UC-A03). A API aceita `?status=` e devolve o usuário vinculado (nome, e-mail, `ativo`, `bloqueado`), que a tela não mostra. O nome do componente no código (`EmpresasPendentesTabela`) sugere só pendentes, mas a tabela traz todas.
- **Telas e endpoints:** `/admin/empresas` (tela); `GET /api/admin/empresas?page&limit` (API).

### UC-A10 — Aprovar cadastro de empresa

- **Ator:** Administrador. Ator secundário: empresa (recebe notificação).
- **Descrição:** Libera a empresa para usar os recursos empresariais.
- **Pré-condições:** Administrador autenticado; empresa que não esteja Aprovada nem Suspensa (para suspensa, use UC-A13).
- **Fluxo principal:**
  1. Em `/admin/empresas`, clica em "Aprovar".
  2. O diálogo "Aprovar empresa" pergunta: Confirma aprovar o cadastro de "Nome"?
  3. O administrador confirma.
  4. O sistema grava `statusAprovacao = aprovada`, limpa o motivo de reprovação e registra quem avaliou e quando.
  5. Cria a notificação "Cadastro aprovado" ("Sua empresa foi aprovada e já pode publicar vagas.") e grava o log `aprovar_empresa`.
  6. A tela mostra "Empresa aprovada." e atualiza a lista.
- **Fluxos alternativos e exceções:**
  - Empresa inexistente: 404 "Empresa não encontrada.".
  - O botão fica desabilitado para empresa já aprovada. O servidor não confere o status anterior: a API aprova qualquer empresa, inclusive suspensa (os dados da suspensão ficam guardados).
- **Pós-condições:** A empresa passa a operar: publicar e gerenciar vagas, ver candidaturas, editar o perfil, usar feed e mensagens. Não é enviado e-mail de aprovação (só a notificação interna). Aprovar não concede o selo de verificada (UC-A14).
- **Regras de negócio:** `AdminEmpresaService.avaliarEmpresa`. Enquanto o status não é "aprovada", o Site troca o app inteiro da empresa por uma tela de status (Pendente, Reprovada ou Suspensa) e a API recusa os recursos empresariais (`garantirEmpresaAprovada`); as vagas dessa empresa também saem da listagem pública, da busca e da vitrine, e candidatos recebem "Esta vaga não está disponível para candidaturas no momento.". Administradores passam por todas essas checagens.
- **Telas e endpoints:** `/admin/empresas` (tela); `POST /api/admin/empresas/:id/aprovar` (API).

### UC-A11 — Reprovar cadastro de empresa

- **Ator:** Administrador. Ator secundário: empresa (recebe notificação e vê o motivo).
- **Descrição:** Recusa o cadastro da empresa, com motivo opcional.
- **Pré-condições:** Administrador autenticado; empresa que não esteja Reprovada nem Suspensa.
- **Fluxo principal:**
  1. Em `/admin/empresas`, clica em "Reprovar".
  2. O diálogo "Reprovar empresa" pergunta: Confirma reprovar o cadastro de "Nome"? e mostra o campo "Motivo (opcional)".
  3. O administrador escreve o motivo (ou deixa em branco) e confirma.
  4. O sistema grava `statusAprovacao = reprovada` e o motivo, e registra quem avaliou e quando.
  5. Cria a notificação "Cadastro reprovado" ("Seu cadastro foi reprovado. Motivo: ..."; sem motivo, "não informado") e grava o log `reprovar_empresa`.
  6. A tela mostra "Empresa reprovada." e atualiza a lista.
- **Fluxos alternativos e exceções:**
  - Empresa inexistente: 404.
  - O botão também está ativo para uma empresa já Aprovada, que passa a Reprovada.
  - Diferente da suspensão, a reprovação não valida o tamanho do motivo.
- **Pós-condições:** A empresa vê a tela "Seu cadastro empresarial não foi aprovado" com o motivo em destaque; os recursos empresariais ficam bloqueados. Sem e-mail.
- **Regras de negócio:** As mesmas de UC-A10 sobre o efeito de não estar aprovada. O motivo digitado é mostrado à empresa.
- **Telas e endpoints:** `/admin/empresas` (tela); `POST /api/admin/empresas/:id/reprovar` com `{ motivo }` (API).

### UC-A12 — Suspender empresa

- **Ator:** Administrador. Ator secundário: empresa (recebe notificação e e-mail).
- **Descrição:** Suspende uma empresa já aprovada, por moderação, sem apagar vagas nem candidaturas.
- **Pré-condições:** Administrador autenticado; empresa com status Aprovada.
- **Fluxo principal:**
  1. Em `/admin/empresas`, clica em "Suspender" (visível só para empresas Aprovadas).
  2. O diálogo "Suspender empresa" pergunta: Confirma suspender o cadastro de "Nome"? e mostra "Motivo (opcional)".
  3. O administrador informa o motivo e confirma.
  4. O sistema grava `statusAprovacao = suspensa`, quem suspendeu, quando e o motivo.
  5. Cria a notificação "Empresa suspensa" ("Sua empresa foi suspensa pela moderação. Motivo: ..."), grava o log `suspender_empresa` e envia ao usuário da empresa o e-mail "Sua empresa foi suspensa — ACESSO" com o motivo, no idioma da conta.
  6. A tela mostra "Empresa suspensa." e atualiza a lista.
- **Fluxos alternativos e exceções:**
  - Empresa que não está aprovada: 409 "Só é possível suspender uma empresa que esteja aprovada.".
  - Motivo com mais de 1000 caracteres: 422 "Motivo deve ter no máximo 1000 caracteres." (a caixa de texto da tela não limita; o erro aparece como aviso).
  - Empresa inexistente: 404.
  - O e-mail só sai com o provedor configurado e nunca desfaz a suspensão.
- **Pós-condições:** A empresa continua conseguindo entrar (a conta não é bloqueada), mas o Site mostra só a tela "Conta empresarial suspensa", com o motivo e o botão de sair, e a API recusa feed, publicações, mensagens, painel, vagas, candidaturas e edição do perfil (403 "Sua empresa está suspensa pela moderação do ACESSO. Motivo: ..."). As vagas e candidaturas existentes não são alteradas, mas deixam de aparecer ao público e não recebem novas candidaturas.
- **Regras de negócio:** `AdminEmpresaService.suspenderEmpresa`. Usa campos próprios (`suspensoPorId`, `suspensoEm`, `motivoSuspensao`), separados da avaliação cadastral. Suspender empresa é diferente de bloquear a conta (UC-A06), que impede até o login.
- **Telas e endpoints:** `/admin/empresas` (tela); `POST /api/admin/empresas/:id/suspender` com `{ motivo }` (API).

### UC-A13 — Reativar empresa suspensa

- **Ator:** Administrador. Ator secundário: empresa (recebe notificação).
- **Descrição:** Devolve a uma empresa suspensa o status de aprovada.
- **Pré-condições:** Administrador autenticado; empresa com status Suspensa.
- **Fluxo principal:**
  1. Em `/admin/empresas`, clica em "Reativar" (única ação de cadastro oferecida a uma empresa suspensa).
  2. O diálogo "Reativar empresa" pergunta: Confirma reativar o cadastro de "Nome"?
  3. O administrador confirma.
  4. O sistema volta o status para `aprovada`.
  5. Cria a notificação "Empresa reativada" ("Sua empresa foi reativada pela moderação e voltou a operar normalmente.") e grava o log `reativar_empresa`.
  6. A tela mostra "Empresa reativada." e atualiza a lista.
- **Fluxos alternativos e exceções:** Empresa que não está suspensa: 409 "Só é possível reativar uma empresa que esteja suspensa."; empresa inexistente: 404.
- **Pós-condições:** A empresa volta a operar. Os dados da suspensão (quem, quando, motivo) são mantidos como histórico. Sem e-mail.
- **Regras de negócio:** `AdminEmpresaService.reativarEmpresa`.
- **Telas e endpoints:** `/admin/empresas` (tela); `POST /api/admin/empresas/:id/reativar` (API).

### UC-A14 — Conceder ou remover o selo "Empresa verificada"

- **Ator:** Administrador.
- **Descrição:** Dá ou tira o selo de confiança "Empresa verificada", independente da aprovação cadastral.
- **Pré-condições:** Administrador autenticado.
- **Fluxo principal:**
  1. Em `/admin/empresas`, clica em "Verificar" (empresa sem selo) ou "Remover selo" (empresa com selo).
  2. O diálogo pergunta: Confirma conceder o selo "Empresa verificada" a "Nome"? (ou remover o selo), com o aviso de que isso é independente do status de aprovação, que não muda.
  3. O administrador confirma.
  4. O sistema grava `empresaVerificada` e o log `verificar_empresa` ou `remover_verificacao_empresa`.
  5. A tela mostra "Empresa verificada." ou "Selo de verificada removido." e atualiza a lista.
- **Fluxos alternativos e exceções:** Empresa inexistente: 404; valor que não seja booleano: 422 "Informe verificada como true ou false.".
- **Pós-condições:** Campo `empresaVerificada` alterado. Não há notificação nem e-mail para a empresa.
- **Regras de negócio:** O selo pode ser dado ou tirado em qualquer status (uma empresa reprovada ou suspensa pode tê-lo) e só o administrador altera esse campo (`EmpresaService.filtrarCampos`). O campo acompanha as respostas de vagas, busca e vitrine pública.
- **Telas e endpoints:** `/admin/empresas` (tela); `POST /api/admin/empresas/:id/verificar` com `{ verificada }` (API).

## Administrador — Denúncias

### UC-A15 — Listar e filtrar denúncias

- **Ator:** Administrador.
- **Descrição:** Mostra a fila de denúncias enviadas pelos usuários.
- **Pré-condições:** Administrador autenticado.
- **Fluxo principal:**
  1. Abre `/admin/denuncias`.
  2. O sistema lista as denúncias, da mais nova para a mais antiga, com as colunas Tipo, Motivo, Denunciante, Status, Data e o botão "Ver detalhes".
  3. O administrador filtra por Status (Todos os status, Pendente, Em análise, Resolvida, Rejeitada, Arquivada) e por Tipo (Todos os tipos, Postagem, Comentário, Usuário, Mensagem, Vaga, Empresa). Os filtros valem na hora, sem botão.
  4. Clica em "Ver detalhes" para abrir UC-A16.
- **Fluxos alternativos e exceções:**
  - Nenhum resultado: "Nenhuma denúncia encontrada com esses filtros.".
  - Falha: "Não foi possível carregar as denúncias." e "Tentar novamente".
  - Denunciante que excluiu a conta aparece como "Usuário removido".
- **Pós-condições:** Nenhuma alteração.
- **Regras de negócio:** `DenunciaService.listar`. Os motivos possíveis são Spam, Conteúdo ofensivo, Discurso de ódio, Assédio, Fraude, Informação falsa, Conteúdo inadequado e Outro. A API aceita também filtro por motivo e por `entidadeId`, que esta tela não usa, e não valida os valores de filtro. A lista não coloca as pendentes na frente (só ordena por data). As denúncias nascem de qualquer usuário autenticado (função comum UC-G29): até 1000 caracteres de descrição, 10 denúncias por hora por usuário, uma denúncia aberta por denunciante e item, nunca contra o próprio conteúdo, e mensagem só por quem participa da conversa. O administrador não recebe aviso de denúncia nova (ver "Alertas" no fim da seção).
- **Telas e endpoints:** `/admin/denuncias` (tela); `GET /api/admin/denuncias?page&limit&status&entidadeTipo` (API).

### UC-A16 — Consultar detalhe da denúncia e o conteúdo denunciado

- **Ator:** Administrador.
- **Descrição:** Mostra os dados completos de uma denúncia e uma prévia mínima do item denunciado.
- **Pré-condições:** Administrador autenticado; denúncia existente.
- **Fluxo principal:**
  1. Em `/admin/denuncias`, clica em "Ver detalhes" (ou no motivo, a partir do detalhe de um usuário).
  2. O sistema carrega `GET /api/admin/denuncias/:id`.
  3. A tela mostra o título "Denúncia: <Tipo>", o selo de status, Motivo, Denunciante (nome e e-mail, ou "Usuário removido"), Registrada em, Responsável ("Ninguém atribuído", se vazio), a "Descrição do denunciante" e a "Observação da moderação" (quando existem).
  4. O cartão "Conteúdo denunciado" mostra a prévia do item. Para mensagens, mostra só o aviso "O conteúdo de mensagens só pode ser consultado através do contexto da conversa." e o botão "Ver contexto da mensagem" (UC-A17).
  5. Se a denúncia ainda está Pendente ou Em análise, aparece o cartão de ações (UC-A18 a UC-A21).
- **Fluxos alternativos e exceções:**
  - Denúncia inexistente: 404 "Denúncia não encontrada.", e a tela mostra "Não foi possível carregar esta denúncia." com "Tentar novamente".
  - Item denunciado que já não existe: "Este conteúdo não existe mais ou já foi removido.".
  - Link "Voltar para denúncias" leva à fila.
- **Pós-condições:** Nenhuma alteração.
- **Regras de negócio:** A prévia é o JSON bruto, mostrado como texto, com poucos campos por tipo, com os nomes do banco: usuário (`id`, `nome`, `email`, `tipoUsuario`, `bloqueado`), publicação (`id`, `conteudo`, `ativo`, `usuarioId`), comentário (`id`, `comentario`, `ativo`, `usuarioId`), vaga (`id`, `titulo`, `status`, `oculta`, `empresaId`) e empresa (`id`, `razaoSocial`, `nomeFantasia`, `statusAprovacao`). O autor e a empresa aparecem só pelo identificador, não pelo nome. A prévia não mostra anexos de publicação nem tem link direto para o conteúdo. Ao abrir o detalhe de uma denúncia de publicação ou comentário já removido, a prévia mostra `"ativo": false`.
- **Telas e endpoints:** `/admin/denuncias/$denunciaId` (tela); `GET /api/admin/denuncias/:id` (API).

### UC-A17 — Consultar contexto de mensagem denunciada

- **Ator:** Administrador.
- **Descrição:** Lê a mensagem denunciada e as mensagens vizinhas da mesma conversa, para entender o caso.
- **Pré-condições:** Administrador autenticado; denúncia de tipo "Mensagem" (em qualquer status).
- **Fluxo principal:**
  1. No detalhe da denúncia (UC-A16), clica em "Ver contexto da mensagem".
  2. O sistema confere que a denúncia é de mensagem, carrega a mensagem e busca até 3 mensagens anteriores e até 3 posteriores da mesma conversa.
  3. Grava o log `visualizar_mensagem_denunciada` (com os ids da mensagem e da conversa).
  4. Abre o diálogo "Contexto da mensagem denunciada": lista em ordem cronológica, cada mensagem com o texto e a data e hora; a denunciada fica destacada e marcada "mensagem denunciada".
- **Fluxos alternativos e exceções:**
  - Denúncia que não é de mensagem: 400 "Esta denúncia não é sobre uma mensagem.".
  - Mensagem já inexistente: 404 "Mensagem denunciada não encontrada." e a tela mostra "Não foi possível carregar o contexto.".
- **Pós-condições:** Um log de auditoria a cada consulta ao servidor, mesmo que nenhuma ação seja tomada depois. O Site guarda o resultado em memória por 30 segundos: fechar e reabrir o diálogo nesse intervalo, na mesma página, não pede de novo e, portanto, não gera outro log.
- **Regras de negócio:** `DenunciaService.obterContextoMensagem`. É o único caminho do painel para ler conteúdo de conversa privada; não existe busca livre de mensagens ou conversas, e ser administrador não dá acesso a conversas das quais não participa (`ConversaService`). O contexto usa a data de criação: mensagens com a mesma data e hora da denunciada não entram como vizinhas. A API devolve também o identificador do remetente, mas a tela não mostra quem enviou cada mensagem. Para denúncia de mensagem não existe ação automática (não há remoção de mensagem individual): só se resolve, rejeita ou arquiva, com observação.
- **Telas e endpoints:** `/admin/denuncias/$denunciaId` (tela, diálogo); `GET /api/admin/denuncias/:id/contexto-mensagem` (API).

### UC-A18 — Assumir denúncia ("Atribuir a mim")

- **Ator:** Administrador.
- **Descrição:** Marca a denúncia como "Em análise" e define o administrador responsável.
- **Pré-condições:** Administrador autenticado; denúncia com status Pendente (o botão só aparece nesse caso).
- **Fluxo principal:**
  1. No detalhe da denúncia, clica em "Atribuir a mim" (sem diálogo de confirmação).
  2. O sistema grava `status = em_analise` e o administrador como responsável.
  3. Grava o log `atribuir_denuncia` ("Denúncia atribuída a <nome>.").
  4. A tela mostra "Denúncia atribuída a você." e passa a exibir o nome em "Responsável".
- **Fluxos alternativos e exceções:**
  - Denúncia já encerrada: 409 "Esta denúncia já foi encerrada e não pode ser alterada.".
  - Denúncia inexistente: 404.
- **Pós-condições:** Ninguém é notificado.
- **Regras de negócio:** Assumir não tranca a denúncia: qualquer administrador pode resolvê-la, rejeitá-la ou arquivá-la mesmo que outro a tenha assumido. Ao encerrar, se não há responsável, quem encerrou passa a constar como responsável. Pela API, atribuir de novo uma denúncia em análise troca o responsável; a tela esconde o botão nesse caso.
- **Telas e endpoints:** `/admin/denuncias/$denunciaId` (tela); `PATCH /api/admin/denuncias/:id/atribuir` (API).

### UC-A19 — Resolver denúncia (com ou sem ação de moderação)

- **Ator:** Administrador. Atores secundários: autor do conteúdo (sofre a ação), denunciante (é avisado).
- **Descrição:** Encerra a denúncia como "Resolvida", com observação e, opcionalmente, a ação de moderação correspondente ao tipo do item.
- **Pré-condições:** Administrador autenticado; denúncia Pendente ou Em análise.
- **Fluxo principal:**
  1. No detalhe da denúncia, clica em "Resolver".
  2. O diálogo "Resolver denúncia" mostra "Observação (opcional)" (até 1000 caracteres) e, para os tipos que têm ação, uma caixa marcada por padrão: "Também <ação> ao resolver". As ações são: usuário, "bloquear este usuário"; publicação e comentário, "remover este conteúdo"; vaga, "ocultar esta vaga"; empresa, "suspender esta empresa". Denúncia de mensagem não tem a caixa.
  3. O administrador confirma.
  4. Se a caixa está marcada, o sistema executa primeiro a moderação, com as mesmas regras, avisos e logs de UC-A06, UC-A23, UC-A25, UC-A29 e UC-A12 (bloquear conta, remover publicação, remover comentário, ocultar vaga, suspender empresa). Se a ação falhar, a denúncia fica intocada.
  5. O sistema marca a denúncia como "Resolvida", grava a observação e a data de encerramento (e o responsável, se estava vazio) e registra o log `resolver_denuncia`, com a ação tomada.
  6. Notifica o denunciante: "Denúncia analisada" ("Sua denúncia foi analisada e uma ação foi tomada pela nossa equipe.").
  7. A tela mostra "Denúncia atualizada." e os botões de ação somem.
- **Fluxos alternativos e exceções:**
  - Caixa desmarcada: resolve sem tocar no conteúdo. O denunciante recebe o mesmo aviso de "ação tomada".
  - A ação pode falhar, e a tela mostra a mensagem do servidor: alvo é a própria conta do administrador (400 "Você não pode bloquear a própria conta.") ou outra conta de administrador (403 "Contas administrativas não podem ser bloqueadas por aqui."); publicação ou comentário já removido (409); empresa que não está aprovada (409 "Só é possível suspender uma empresa que esteja aprovada."); item inexistente (404). Para encerrar mesmo assim, o administrador desmarca a caixa.
  - Usuário já bloqueado: a ação não falha; refaz o bloqueio, reenviando notificação e e-mail e gerando novo log.
  - Pela API, ação inválida para o tipo: 400 `Ação "X" não é válida para denúncias do tipo "Y".`; ação fora de bloquear, remover, ocultar, suspender: 422 "Ação de moderação inválida.".
  - Observação com mais de 1000 caracteres: 422 "Observação deve ter no máximo 1000 caracteres.".
  - Denúncia já encerrada: 409 "Esta denúncia já foi encerrada e não pode ser alterada."; inexistente: 404.
  - Se o denunciante excluiu a conta, a denúncia é resolvida normalmente, mas não há quem avisar.
- **Pós-condições:** Denúncia com `status = resolvida`, `observacaoAdministrador`, `resolvidoEm` e responsável. Quando há ação: efeitos do caso correspondente (por exemplo, conta bloqueada e e-mail ao bloqueado).
- **Regras de negócio:** `DenunciaService.resolver` e `ACAO_MODERACAO_POR_TIPO`; a ação reaproveita os métodos dos serviços administrativos. A proteção contra agir sobre contas administrativas existe no bloqueio de usuário; remover publicação ou comentário, ocultar vaga e suspender empresa não consultam o tipo do autor (a empresa suspensa é sempre uma conta de empresa), de modo que uma publicação de outro administrador pode ser removida por esse caminho. Na ação de bloquear ou suspender, a observação digitada vira o motivo mostrado à pessoa ou empresa (notificação, e-mail e tela de status), então deve ser escrita pensando nisso. Quem sofre a ação nunca é avisado da denúncia em si. Denúncia encerrada não pode ser reaberta. A ação e o encerramento não ocorrem numa única transação.
- **Telas e endpoints:** `/admin/denuncias/$denunciaId` (tela); `PATCH /api/admin/denuncias/:id/resolver` com `{ observacao, acao }` (API).

### UC-A20 — Rejeitar denúncia

- **Ator:** Administrador. Ator secundário: denunciante (é avisado).
- **Descrição:** Encerra a denúncia por não ter encontrado violação das diretrizes.
- **Pré-condições:** Administrador autenticado; denúncia Pendente ou Em análise.
- **Fluxo principal:**
  1. No detalhe da denúncia, clica em "Rejeitar".
  2. O diálogo "Rejeitar denúncia" mostra "Observação (opcional)" (até 1000 caracteres).
  3. O administrador confirma.
  4. O sistema marca a denúncia como "Rejeitada", grava a observação, a data de encerramento e o responsável, e registra o log `rejeitar_denuncia`.
  5. Notifica o denunciante: "Denúncia analisada" ("Sua denúncia foi analisada e não identificamos violação das diretrizes da comunidade.").
  6. A tela mostra "Denúncia atualizada.".
- **Fluxos alternativos e exceções:** Observação com mais de 1000 caracteres: 422; denúncia já encerrada: 409; inexistente: 404; denunciante que excluiu a conta: sem aviso.
- **Pós-condições:** Nenhuma ação sobre o conteúdo denunciado.
- **Regras de negócio:** `DenunciaService.rejeitar`. A observação fica só para a moderação: o denunciante recebe apenas o texto fixo.
- **Telas e endpoints:** `/admin/denuncias/$denunciaId` (tela); `PATCH /api/admin/denuncias/:id/rejeitar` com `{ observacao }` (API).

### UC-A21 — Arquivar denúncia

- **Ator:** Administrador.
- **Descrição:** Encerra a denúncia como "Arquivada", sem avisar o denunciante.
- **Pré-condições:** Administrador autenticado; denúncia Pendente ou Em análise.
- **Fluxo principal:**
  1. No detalhe da denúncia, clica em "Arquivar".
  2. O diálogo "Arquivar denúncia" mostra "Observação (opcional)" (até 1000 caracteres).
  3. O administrador confirma.
  4. O sistema marca a denúncia como "Arquivada", grava observação, data e responsável e registra o log `arquivar_denuncia`.
  5. A tela mostra "Denúncia atualizada.".
- **Fluxos alternativos e exceções:** As mesmas de UC-A20 (observação longa, denúncia já encerrada ou inexistente).
- **Pós-condições:** Nenhuma notificação ao denunciante; nenhuma ação sobre o conteúdo.
- **Regras de negócio:** Só "Resolvida" e "Rejeitada" avisam o denunciante. O mesmo status "arquivada" é usado, de forma automática, quando a conta denunciada é excluída (UC-A08).
- **Telas e endpoints:** `/admin/denuncias/$denunciaId` (tela); `PATCH /api/admin/denuncias/:id/arquivar` com `{ observacao }` (API).

## Administrador — Moderação direta de conteúdo

### UC-A22 — Buscar publicações e consultar detalhe

- **Ator:** Administrador.
- **Descrição:** Lista as publicações ativas do feed, permite buscar por texto e abre o detalhe de cada uma.
- **Pré-condições:** Administrador autenticado.
- **Fluxo principal:**
  1. Abre `/admin/postagens` ("Publicações").
  2. O sistema lista as publicações ativas, da mais nova para a mais antiga, com Autor, Conteúdo (duas linhas), Publicada em e as ações "Ver detalhes" e "Remover".
  3. Para buscar, digita em "Buscar por conteúdo" (placeholder "Ex.: palavra na publicação") e clica em "Buscar" (a busca só roda ao enviar).
  4. Em "Ver detalhes", abre um painel lateral com: título "Publicação de <nome>", data de publicação e e-mail do autor, selo "Visível a visitantes anônimos" ou "Não visível a visitantes anônimos", o texto completo, a galeria de anexos (imagens, vídeos e documentos, com ampliar e baixar), as contagens de curtidas, comentários e anexos e o "Histórico de moderação desta publicação" (logs desse item).
- **Fluxos alternativos e exceções:**
  - Sem resultados: "Nenhuma publicação encontrada.".
  - Falha: "Não foi possível carregar as publicações." e "Tentar novamente".
- **Pós-condições:** Nenhuma alteração.
- **Regras de negócio:** `AdminConteudoService.listarPostagens`. Só lista publicações ativas (as removidas somem da lista), de todas as contas, inclusive de perfis privados: o administrador não é limitado por privacidade nem por bloqueios. A busca olha só o texto (sem diferenciar maiúsculas, até 120 caracteres). A mídia usa as mesmas URLs assinadas e temporárias do feed.
- **Telas e endpoints:** `/admin/postagens` (tela); `GET /api/admin/postagens?page&limit&q` (API); ao baixar um arquivo na galeria, `GET /api/postagens/:id/anexos/:anexoId/download` (UC-G08).

### UC-A23 — Remover publicação

- **Ator:** Administrador. Ator secundário: autor da publicação (é avisado).
- **Descrição:** Retira uma publicação do feed por moderação.
- **Pré-condições:** Administrador autenticado; publicação ativa.
- **Fluxo principal:**
  1. Em `/admin/postagens`, clica em "Remover" na linha da publicação.
  2. O diálogo "Remover publicação" pergunta: "Esta ação remove a publicação do feed. Deseja continuar?".
  3. O administrador confirma.
  4. A tela tira a linha na hora (remoção otimista) e mostra "Publicação removida.".
  5. No servidor, em transação: trava a publicação, confirma que ainda está ativa, tira um retrato (id, autor, texto, anexos por tipo, total de anexos, curtidas, comentários, se é visível a anônimos e a data), marca `ativo = falso` e grava o log `remover_postagem` com esse retrato.
  6. Depois de confirmar, notifica o autor: "Publicação removida" ("Sua publicação foi removida pela moderação por violar as diretrizes da comunidade.").
- **Fluxos alternativos e exceções:**
  - Já removida (409 "Esta publicação já foi removida."): aviso neutro "Esta publicação já havia sido removida." e a linha continua fora da lista. Inexistente (404): "Esta publicação não existe mais.".
  - Erro de rede ou do servidor: a linha volta e aparece "Não foi possível remover a publicação.".
  - Se a remoção esvazia a página atual, a tela volta uma página.
- **Pós-condições:** Publicação some do feed e da busca. É exclusão lógica: o registro, os arquivos anexados no armazenamento, as curtidas e os comentários continuam no banco. O log descreve, por exemplo: "<Admin> removeu uma publicação de <Autor>. A publicação continha: texto; 1 imagem; 12 curtidas; 3 comentários.".
- **Regras de negócio:** A remoção é idempotente (segunda tentativa recebe 409, sem duplicar notificação nem log). O formulário não pede motivo e o texto do aviso ao autor é fixo. Não existe restauração (nem tela, nem rota). A remoção pelo painel não dispara a atualização em tempo real do feed: quem está com o feed aberto só deixa de ver a publicação quando a lista é recarregada. Não há proteção contra remover a publicação de outro administrador.
- **Telas e endpoints:** `/admin/postagens` (tela); `DELETE /api/admin/postagens/:id` (API). A rota comum `DELETE /api/postagens/:id` também aceita o administrador, mas grava um log mais curto e sem o retrato (ver "Ações administrativas só pela API").

### UC-A24 — Buscar comentários e consultar detalhe

- **Ator:** Administrador.
- **Descrição:** Lista os comentários ativos, permite buscar por texto e abre o detalhe.
- **Pré-condições:** Administrador autenticado.
- **Fluxo principal:**
  1. Abre `/admin/comentarios`.
  2. O sistema lista os comentários ativos (inclusive respostas), do mais novo ao mais antigo, com Autor, Comentário (truncado) e as ações "Ver detalhes" e "Remover".
  3. Para buscar, digita em "Buscar por conteúdo" (placeholder "Ex.: palavra no comentário") e clica em "Buscar".
  4. Em "Ver detalhes", abre um painel lateral com: "Comentário de <nome>", "Comentado em <data>" (ou "Data não registrada") e o e-mail do autor, o texto do comentário, a "Publicação relacionada" (três linhas, ou "Publicação não disponível.") e o "Histórico de moderação deste comentário".
- **Fluxos alternativos e exceções:** Sem resultados: "Nenhum comentário encontrado."; falha: "Não foi possível carregar os comentários." e "Tentar novamente".
- **Pós-condições:** Nenhuma alteração.
- **Regras de negócio:** `AdminConteudoService.listarComentarios`. Só lista comentários ativos; a busca olha o texto (sem diferenciar maiúsculas, até 120 caracteres). A API aceita também `postagemId`, que a tela não usa.
- **Telas e endpoints:** `/admin/comentarios` (tela); `GET /api/admin/comentarios?page&limit&q` (API).

### UC-A25 — Remover comentário

- **Ator:** Administrador. Ator secundário: autor do comentário (é avisado).
- **Descrição:** Retira um comentário por moderação.
- **Pré-condições:** Administrador autenticado; comentário ativo.
- **Fluxo principal:**
  1. Em `/admin/comentarios`, clica em "Remover".
  2. O diálogo "Remover comentário" avisa: "Esta ação não pode ser desfeita. O comentário será removido permanentemente.".
  3. O administrador confirma.
  4. A tela tira a linha na hora e mostra "Comentário removido.".
  5. No servidor, em transação: trava o comentário, confirma que está ativo, tira um retrato (id, autor, texto, publicação e seu autor, data), marca `ativo = falso` e grava o log `remover_comentario`.
  6. Notifica o autor: "Comentário removido" ("Seu comentário foi removido pela moderação por violar as diretrizes da comunidade.").
- **Fluxos alternativos e exceções:** Já removido (409 "Este comentário já foi removido."): aviso neutro "Este comentário já havia sido removido."; inexistente (404): "Este comentário não existe mais."; erro geral: a linha volta e aparece "Não foi possível remover o comentário.".
- **Pós-condições:** O log descreve: "<Admin> removeu um comentário de <Autor> em uma publicação de <Autor da publicação>.".
- **Regras de negócio:** Apesar do texto "removido permanentemente", é exclusão lógica (`ativo = falso`), sem restauração pela tela ou por rota. Não há campo de motivo; o texto do aviso é fixo. Assim como na publicação, a remoção pelo painel não dispara a atualização em tempo real do feed.
- **Telas e endpoints:** `/admin/comentarios` (tela); `DELETE /api/admin/comentarios/:id` (API). A rota comum `DELETE /api/comentarios/:id` também aceita o administrador, com log mais curto.

### UC-A26 — Listar vagas para moderação

- **Ator:** Administrador.
- **Descrição:** Mostra todas as vagas da plataforma, ponto de partida de UC-A27 e UC-A28.
- **Pré-condições:** Administrador autenticado.
- **Fluxo principal:**
  1. Abre `/admin/vagas`.
  2. O sistema lista as vagas, da mais nova para a mais antiga, com as colunas Vaga (título), Local (cidade/UF, ou a modalidade se não houver local), Situação (Aberta, Arquivada ou Encerrada), Alterar status e Ações.
- **Fluxos alternativos e exceções:** Sem vagas: "Nenhuma vaga publicada até o momento."; falha: "Não foi possível carregar as vagas." e "Tentar novamente".
- **Pós-condições:** Nenhuma alteração.
- **Regras de negócio:** `AdminConteudoService.listarVagas`. A lista traz vagas de qualquer status, inclusive de empresas não aprovadas e vagas ocultas, mas a tela não mostra a empresa, nem se a vaga está oculta, nem tem busca ou filtro, nem link para a página da vaga. A situação "Arquivada" corresponde ao valor interno `pausada`.
- **Telas e endpoints:** `/admin/vagas` (tela); `GET /api/admin/vagas?page&limit` (API).

### UC-A27 — Alterar status de vaga

- **Ator:** Administrador.
- **Descrição:** Muda a situação de uma vaga entre Aberta, Arquivada e Encerrada.
- **Pré-condições:** Administrador autenticado.
- **Fluxo principal:**
  1. Em `/admin/vagas`, abre o seletor "Alterar status da vaga <título>" e escolhe Aberta, Arquivada ou Encerrada.
  2. A mudança é enviada na hora, sem diálogo de confirmação.
  3. O sistema grava o novo status e o log `alterar_status_vaga` ("Status da vaga "X" alterado para <status> pela moderação."), com o status antes e depois. Na descrição e nos dados, o status aparece pelo valor interno (`aberta`, `pausada` ou `encerrada`), não pelo rótulo da tela.
  4. A tela mostra "Status da vaga atualizado." e atualiza a lista.
- **Fluxos alternativos e exceções:** Vaga inexistente: 404 "Vaga não encontrada."; status inválido: 422 "Status inválido."; falha: "Não foi possível atualizar o status.".
- **Pós-condições:** A empresa dona não é notificada. A vaga só aparece nas listagens públicas quando está "Aberta" (e a empresa aprovada).
- **Regras de negócio:** A rota é compartilhada com as empresas; o administrador passa pelas checagens de dono e de aprovação da empresa (`VagaService.alterarStatus`). O log só é gravado quando quem altera é administrador e não o dono da vaga, o que vale para toda mudança feita no painel.
- **Telas e endpoints:** `/admin/vagas` (tela); `PATCH /api/vagas/:id/status` com `{ status }` (API).

### UC-A28 — Remover vaga

- **Ator:** Administrador.
- **Descrição:** Apaga uma vaga da plataforma por moderação. É irreversível.
- **Pré-condições:** Administrador autenticado.
- **Fluxo principal:**
  1. Em `/admin/vagas`, clica em "Remover" na linha da vaga.
  2. O diálogo "Remover vaga" avisa: A vaga "X" será removida da plataforma. Deseja continuar?
  3. O administrador confirma.
  4. O sistema apaga a vaga e, depois de apagar, grava o log `excluir_vaga` ("Vaga "X" removida pela moderação.", com id, título e empresa).
  5. A tela mostra "Vaga removida." e atualiza a lista.
- **Fluxos alternativos e exceções:** Vaga inexistente: 404; falha: "Não foi possível remover a vaga.".
- **Pós-condições:** É exclusão definitiva (`destroy`): as candidaturas e os favoritos da vaga são apagados em cascata. Nem a empresa nem os candidatos são notificados. A tela não pede motivo. O log é gravado depois da exclusão, fora da transação dela.
- **Regras de negócio:** `VagaService.excluir` (rota compartilhada com as empresas; o administrador passa pelas checagens de dono e de aprovação). Para esconder sem apagar, veja UC-A29.
- **Telas e endpoints:** `/admin/vagas` (tela); `DELETE /api/vagas/:id` (API).

### UC-A29 — Ocultar e reexibir vaga

- **Ator:** Administrador. Ator secundário: empresa dona da vaga (é avisada).
- **Descrição:** Tira uma vaga das buscas sem apagá-la, e a devolve depois. No Site, só é possível ocultar, pela resolução de uma denúncia de vaga.
- **Pré-condições:** Administrador autenticado; vaga existente.
- **Fluxo principal (ocultar, pelo Site):**
  1. Em uma denúncia de vaga (UC-A16), o administrador clica em "Resolver" e mantém marcada a caixa "Também ocultar esta vaga ao resolver" (UC-A19).
  2. O sistema marca `oculta = verdadeiro`.
  3. Cria a notificação "Vaga ocultada pela moderação" ("Sua vaga "X" foi ocultada pela moderação e não aparece mais nas buscas.") e grava o log `ocultar_vaga`.
- **Fluxos alternativos e exceções:**
  - Reexibir (só pela API, sem tela): `POST /api/admin/vagas/:id/ocultar` com `{ "oculta": false }` marca `oculta = falso`, notifica "Vaga voltou a ficar visível" ("Sua vaga "X" voltou a ficar visível para candidatos.") e grava o log `reexibir_vaga`. Sem o campo `oculta` no corpo, o resultado também é reexibir.
  - O corpo não é validado: qualquer valor de `oculta` que o JavaScript leia como verdadeiro (inclusive o texto "false") oculta a vaga.
  - Vaga inexistente: 404 "Vaga não encontrada.". Se isso ocorrer ao resolver uma denúncia com a caixa marcada, a denúncia não é encerrada.
- **Pós-condições:** `oculta` alterado; a vaga e as candidaturas continuam no banco.
- **Regras de negócio:** `AdminConteudoService.alternarVisibilidadeVaga`. O sinalizador `oculta` só é respeitado na busca global (`/api/busca`, vagas) e nas partes públicas (`/api/publico`: contagem de vagas abertas, destaques, vagas públicas e total de vagas por empresa). A listagem `/vagas`, a página da própria vaga e o envio de candidaturas não consultam `oculta`; na prática, uma vaga oculta continua aparecendo e aceitando candidatura por `/vagas`. A tela de vagas do painel (UC-A26) não tem botão de ocultar.
- **Telas e endpoints:** `/admin/denuncias/$denunciaId` (tela, pela caixa de ação); `PATCH /api/admin/denuncias/:id/resolver` com `{ acao: "ocultar" }` e `POST /api/admin/vagas/:id/ocultar` (API).

## Administrador — Auditoria

### UC-A30 — Consultar logs de auditoria

- **Ator:** Administrador.
- **Descrição:** Mostra o histórico, somente leitura, das ações administrativas.
- **Pré-condições:** Administrador autenticado.
- **Fluxo principal:**
  1. Abre `/admin/logs` ("Logs de auditoria"). O texto da página lembra que o registro é somente leitura e que não é possível editar nem excluir itens.
  2. O sistema lista os registros, do mais novo para o mais antigo, com as colunas Ação (código, como `bloquear_usuario`), Entidade (Publicação, Comentário, Usuário, Empresa, Vaga ou Denúncia), Admin (nome de quem agiu), Descrição (truncada) e Data.
  3. Para filtrar, digita o código no campo "Ação"; a lista se atualiza enquanto ele digita (o botão "Filtrar" só volta para a página 1).
  4. Clica em um registro para abrir o detalhe (UC-A31).
- **Fluxos alternativos e exceções:**
  - Sem registros: "Nenhum registro de auditoria encontrado."; falha: "Não foi possível carregar os logs." e "Tentar novamente".
  - Se a conta do administrador que agiu foi excluída, a coluna Admin mostra "Conta removida" e o registro permanece.
- **Pós-condições:** Nenhuma alteração; os registros não podem ser editados nem apagados.
- **Regras de negócio:** `AdminAuditoriaService`. O filtro de ação é igualdade exata e diferencia maiúsculas, com o código gravado em minúsculas (por exemplo `bloquear_usuario`): o texto parcial não encontra nada, e o exemplo do placeholder, em maiúsculas ("BLOQUEAR_USUARIO"), também não. A API aceita também `entidadeTipo`, `entidadeId` e `administradorId`. A mesma tabela aparece, embutida e sem o campo de filtro, filtrada pelo item, nos detalhes de usuário, de publicação e de comentário. Qualquer administrador vê os registros de todos. A descrição é gravada em português e traduzida na leitura. Cada registro guarda também IP e navegador (campos `ip` e `user_agent`). Ações registradas: ver o quadro "Ações registradas na auditoria" no fim desta seção.
- **Telas e endpoints:** `/admin/logs` (tela); `GET /api/admin/logs?page&limit&acao&entidadeTipo&entidadeId&administradorId` (API, somente `GET`; não existe rota de escrita).

### UC-A31 — Consultar detalhe de um registro de auditoria

- **Ator:** Administrador.
- **Descrição:** Abre um painel lateral com todos os dados guardados sobre uma ação administrativa.
- **Pré-condições:** Administrador autenticado; lista de logs aberta (UC-A30), na aba Logs ou nos históricos embutidos.
- **Fluxo principal:**
  1. Clica na linha (ou no código da ação) de um registro.
  2. O painel mostra o código da ação, a data e hora, um selo com a entidade e outro "Admin: <nome>", e a descrição.
  3. Se o registro tem retrato do conteúdo (remoção de publicação ou de comentário pelo painel), mostra "Registro no momento da ação" com campos como Autor, Anexos por tipo, Total de anexos, Curtidas, Comentários, "Visível a visitantes anônimos" e Criado em, e o texto removido em citação.
  4. Mostra o IP e o dispositivo (navegador) de quem agiu.
  5. Se há metadados, oferece "Dados brutos registrados" (JSON recolhível, com itens como antes e depois, motivo e observação).
- **Fluxos alternativos e exceções:** Registro sem descrição mostra "Sem descrição registrada."; sem metadados, os blocos de retrato e dados brutos não aparecem.
- **Pós-condições:** Nenhuma alteração.
- **Regras de negócio:** O detalhe usa os dados que a lista já trouxe (a API envia os metadados inteiros), sem rota própria. O retrato guarda o nome do autor, nunca e-mail, CPF ou CNPJ. Os "Dados brutos" de outras ações podem conter dados pessoais (por exemplo, nome e e-mail da conta no log `excluir_usuario`).
- **Telas e endpoints:** `/admin/logs`, `/admin/usuarios/$usuarioId`, `/admin/postagens` e `/admin/comentarios` (telas); `GET /api/admin/logs` (API).

## Administrador — Dados privados de candidatos

### UC-A32 — Consultar o currículo de um candidato

- **Ator:** Administrador.
- **Descrição:** Abre o perfil de um candidato e visualiza ou baixa o currículo que ele enviou. A plataforma libera esse arquivo ao próprio candidato, a empresa que tenha candidatura dele em vaga sua e ao administrador.
- **Pré-condições:** Administrador autenticado; candidato com currículo enviado.
- **Fluxo principal:**
  1. Abre o perfil do candidato em `/perfil/$usuarioId` (pelo link "Ver perfil público" do detalhe do usuário, UC-A05, ou por busca, publicação ou conversa, UC-G14).
  2. O Site carrega o perfil (`GET /api/perfil/candidatos/usuario/:usuarioId`). Como o solicitante é administrador, a API devolve também os campos privados do candidato.
  3. A tela mostra a seção "Currículo" com o nome do arquivo e os botões "Visualizar currículo" e "Baixar currículo".
  4. "Visualizar currículo" abre uma nova aba com uma URL assinada e temporária (`GET /api/candidatos/:id/curriculo`); "Baixar currículo" pede outra URL, com download forçado (`GET /api/candidatos/:id/curriculo/download`).
- **Fluxos alternativos e exceções:**
  - Candidato sem currículo: a seção não aparece (a API responde 404 "Este candidato ainda não enviou um currículo.").
  - Falha ao gerar a URL: "Não foi possível abrir o currículo." ou "Não foi possível baixar o currículo.".
- **Pós-condições:** Nenhuma alteração. O acesso ao currículo não grava registro de auditoria.
- **Regras de negócio:** `podeVerDadosPrivados` (`candidatoPrivacidade.js`) autoriza sempre o administrador, sem exigir candidatura e sem ser barrado por bloqueio. Para os demais usuários, os campos fora da lista pública (CPF, data de nascimento, gênero, endereço, CEP, pretensão salarial, necessidades de acessibilidade, e-mail e telefone) não são devolvidos; ao administrador a API devolve tudo, mas a tela do perfil exibe apenas o conteúdo público mais a seção do currículo. Cada clique gera uma URL nova, autorizada de novo.
- **Telas e endpoints:** `/perfil/$usuarioId` (tela); `GET /api/perfil/candidatos/usuario/:usuarioId`, `GET /api/candidatos/:id` (API, com dados privados), `GET /api/candidatos/:id/curriculo`, `GET /api/candidatos/:id/curriculo/download`.

## Administrador — Ações disponíveis só pela API

Os casos desta seção não têm tela no painel `/admin`: existem como rotas da API que aceitam o administrador. Servem a quem usa a API diretamente (por exemplo, um cliente HTTP).

### UC-A33 — Consultar contas e ativar ou desativar uma conta pela API

- **Ator:** Administrador (via API). Ator secundário: usuário cuja conta é alterada.
- **Descrição:** Lista e consulta contas com mais filtros que a tela e muda só o campo `ativo` de uma conta.
- **Pré-condições:** Administrador autenticado; para ativar ou desativar, conta-alvo que não seja a do próprio administrador nem de outro administrador.
- **Fluxo principal:**
  1. `GET /api/usuarios?page&limit&nome&email&tipoUsuario&ativo` lista as contas (só administrador), da mais nova para a mais antiga; `GET /api/usuarios/:id` devolve o registro completo, com o perfil de candidato e o de empresa.
  2. `PATCH /api/usuarios/:id/desativar` grava `ativo = falso`; `PATCH /api/usuarios/:id/ativar` grava `ativo = verdadeiro`.
  3. O sistema grava o log `desativar_usuario` ou `ativar_usuario`, com o estado antes e depois, e devolve a conta.
- **Fluxos alternativos e exceções:**
  - Própria conta: 400 "Você não pode desativar a própria conta por aqui." (ou "...reativar..."); conta administrativa: 403 "Contas administrativas não podem ser desativadas por aqui." (ou "...reativadas...").
  - Usuário inexistente: 404 "Usuário não encontrado.". Identificador inválido: 422.
- **Pós-condições:** Conta desativada deixa de entrar na hora ("Usuário desativado."). Não há notificação nem e-mail.
- **Regras de negócio:** `UsuarioService.definirAtivo` reaproveita `garantirAlvoDeAcaoAdministrativa`. Mexe só em `ativo`: ativar uma conta bloqueada (`bloqueado = verdadeiro`) não desfaz o bloqueio, e a pessoa continua barrada (403 `CONTA_BLOQUEADA` nas requisições; no login, "Conta bloqueada: <motivo>" ou "Conta bloqueada pela moderação."). O Site mostra conta desativada como "Bloqueado" e o botão "Desbloquear" (UC-A07) a reativa e limpa também o bloqueio.
- **Telas e endpoints:** Sem tela. `GET /api/usuarios`, `GET /api/usuarios/:id`, `PATCH /api/usuarios/:id/ativar`, `PATCH /api/usuarios/:id/desativar`.

### UC-A34 — Gerenciar o catálogo de deficiências pela API

- **Ator:** Administrador (via API).
- **Descrição:** Cria, edita e apaga itens do catálogo de deficiências que o candidato usa para se declarar PCD.
- **Pré-condições:** Administrador autenticado.
- **Fluxo principal:**
  1. `POST /api/deficiencias` com `nome` (3 a 100 caracteres) e `descricao` opcional (até 1000) cria o item.
  2. `PUT /api/deficiencias/:id` altera nome e descrição.
  3. `DELETE /api/deficiencias/:id` apaga o item.
- **Fluxos alternativos e exceções:** Nome já existente na criação: 409 "Esta deficiência já está cadastrada."; nome fora de 3 a 100 caracteres: 422 "Informe um nome entre 3 e 100 caracteres."; item inexistente: 404 "Deficiência não encontrada.". Nome repetido na edição é barrado pela restrição única do banco, sem mensagem própria.
- **Pós-condições:** Catálogo alterado. Ao apagar um item, a declaração dele some do perfil de todos os candidatos que o tinham (exclusão em cascata). Não há confirmação, notificação nem registro de auditoria. A leitura do catálogo (`GET /api/deficiencias`) é pública.
- **Regras de negócio:** Escrita restrita ao administrador na rota (`exigirTipoUsuarioMiddleware`). `DeficienciaService`.
- **Telas e endpoints:** Sem tela. `POST`, `PUT /:id` e `DELETE /:id` em `/api/deficiencias`.

### UC-A35 — Remover só o perfil de candidato ou de empresa pela API

- **Ator:** Administrador (via API).
- **Descrição:** Apaga o perfil profissional de um candidato ou o cadastro de uma empresa, sem apagar a conta de usuário.
- **Pré-condições:** Administrador autenticado; identificador do candidato (`candidatos.id`) ou da empresa (`empresas.id`), e não o da conta.
- **Fluxo principal:**
  1. `DELETE /api/candidatos/:id` apaga o perfil do candidato (com experiências, formações, certificados, habilidades, deficiências declaradas, candidaturas e favoritos, por cascata) e grava o log `excluir_candidato`.
  2. `DELETE /api/empresas/:id` apaga a empresa (com as vagas e candidaturas dela, por cascata) e grava o log `excluir_empresa`, com razão social e id da conta.
- **Fluxos alternativos e exceções:** Candidato inexistente: 404 "Candidato não encontrado."; empresa inexistente: 404 "Empresa não encontrada."; identificador inválido: 422.
- **Pós-condições:** A conta em `usuarios` continua existindo. Os arquivos do armazenamento (currículo, logo, capa) não são apagados. Ninguém é notificado.
- **Regras de negócio:** Rotas restritas ao administrador; o log é gravado depois da exclusão, fora da transação dela. Para apagar a conta inteira, com arquivos, use UC-A08. Nenhuma tela do painel trata uma conta que ficou sem perfil.
- **Telas e endpoints:** Sem tela. `DELETE /api/candidatos/:id`, `DELETE /api/empresas/:id`.

### UC-A36 — Editar dados de outras contas e de conteúdos pela API

- **Ator:** Administrador (via API). Ator secundário: dono do dado alterado (não é avisado).
- **Descrição:** Várias rotas de edição aceitam "o dono ou um administrador". O administrador pode, portanto, alterar dados de terceiros.
- **Pré-condições:** Administrador autenticado; recurso existente.
- **Fluxo principal:**
  1. Conta: `PUT /api/usuarios/:id` (nome, telefone, foto e capa); `PATCH /api/usuarios/:id/foto` e `/capa` (upload de imagem).
  2. Empresa: `PUT /api/empresas/:id` (os campos que a empresa edita e, só para o administrador, `cnpj` e `empresaVerificada`); `PATCH /api/empresas/:id/logo` e `/capa`.
  3. Candidato: `PUT /api/candidatos/:id`; `PATCH /api/candidatos/:id/curriculo` (upload); `POST` e `DELETE /api/candidatos/:id/deficiencias`; `PUT` e `DELETE /api/perfil/:recurso/:id` (experiências, formações, certificados e habilidades). Criar itens de perfil (`POST /api/perfil/:recurso`) é só do candidato.
  4. Conteúdo: `PUT /api/postagens/:id` (texto e visibilidade da publicação de outra pessoa) e `PATCH /api/postagens/:id/anexos/:anexoId` (descrição de um anexo); `PUT /api/vagas/:id`.
  5. O sistema grava a alteração e devolve o recurso atualizado.
- **Fluxos alternativos e exceções:** Recurso inexistente: 404; dados fora das regras de validação do recurso: 422. Nas rotas de empresa e de vaga, o administrador passa pela checagem de aprovação da empresa.
- **Pós-condições:** Dado alterado. Nenhuma dessas ações grava registro de auditoria nem notifica o dono. Editar uma publicação marca a data de edição e dispara a atualização em tempo real do feed.
- **Regras de negócio:** `garantirDono` libera o administrador em todos os serviços citados. Campos sensíveis da conta (e-mail, senha, tipo, `ativo`) não são editáveis por `PUT /api/usuarios/:id`. O administrador não tem tela para nenhuma dessas edições.
- **Telas e endpoints:** Sem tela. Rotas listadas no fluxo.

### UC-A37 — Consultar talentos, candidaturas e estatísticas de vaga pela API

- **Ator:** Administrador (via API).
- **Descrição:** Leituras que a API libera ao administrador além das telas do painel.
- **Pré-condições:** Administrador autenticado.
- **Fluxo principal:**
  1. `GET /api/candidatos?page&limit&nome&cidade&estado&deficienciaId` faz a busca de talentos: candidatos de contas ativas, com as deficiências declaradas.
  2. `GET /api/vagas/:vagaId/candidaturas` lista as candidaturas de uma vaga, com nome, e-mail e foto do candidato.
  3. `GET /api/candidaturas/:id` devolve uma candidatura, com a vaga, a empresa e o candidato.
  4. `GET /api/vagas/:id/estatisticas` devolve o total de candidaturas da vaga e a contagem por status.
- **Fluxos alternativos e exceções:** Recurso inexistente: 404 ("Vaga não encontrada.", "Candidatura não encontrada."); identificador inválido: 422.
- **Pós-condições:** Nenhuma alteração e nenhum registro de auditoria.
- **Regras de negócio:** Nas rotas de vaga, o administrador passa pelas checagens de dono e de aprovação da empresa. `GET /api/candidatos/:id` devolve ao administrador também os campos privados do candidato (UC-A32).
- **Telas e endpoints:** Sem tela. Rotas listadas no fluxo.

### UC-A38 — Alterar ou cancelar candidaturas pela API

- **Ator:** Administrador (via API). Ator secundário: candidato (recebe aviso na mudança de status).
- **Descrição:** Muda o status de qualquer candidatura ou a cancela, no lugar da empresa dona da vaga ou do candidato.
- **Pré-condições:** Administrador autenticado; candidatura existente.
- **Fluxo principal:**
  1. `PATCH /api/candidaturas/:id/status` com `{ status }` (pendente, visualizada, em_analise, aprovada, rejeitada ou cancelada) grava o novo status.
  2. O sistema cria para o candidato a notificação "Sua candidatura foi atualizada" ("Sua candidatura para a vaga "X" foi atualizada para <status>."), com o administrador como autor.
  3. `PATCH /api/candidaturas/:id/cancelar` grava o status "cancelada" na candidatura de outra pessoa, sem notificação.
- **Fluxos alternativos e exceções:** Status inválido: 422 "Status de candidatura inválido."; candidatura inexistente: 404 "Candidatura não encontrada.".
- **Pós-condições:** Status alterado. Não há registro de auditoria.
- **Regras de negócio:** `CandidaturaService.atualizarStatus` e `cancelar`. A empresa só pode aplicar visualizada, em análise, aprovada e rejeitada; o administrador pode aplicar também pendente e cancelada.
- **Telas e endpoints:** Sem tela. `PATCH /api/candidaturas/:id/status`, `PATCH /api/candidaturas/:id/cancelar`.

### UC-A39 — Consultar métricas resumidas pela API

- **Ator:** Administrador (via API).
- **Descrição:** Devolve totais gerais da plataforma em um formato mais simples que o dos Relatórios.
- **Pré-condições:** Administrador autenticado.
- **Fluxo principal:**
  1. `GET /api/dashboard/admin` retorna total de usuários, candidatos, empresas, vagas, vagas abertas, candidaturas, publicações ativas e a contagem de candidaturas por status.
- **Fluxos alternativos e exceções:** Conta que não é administradora: 403 "Você não possui permissão para esta ação.".
- **Pós-condições:** Nenhuma alteração.
- **Regras de negócio:** `DashboardService.administrador`. O Site não usa esta rota: a aba Relatórios (UC-A03) usa `/api/admin/relatorios`, que traz mais indicadores. Aqui "candidatos" e "empresas" contam os perfis, enquanto nos Relatórios contam contas por tipo.
- **Telas e endpoints:** Sem tela. `GET /api/dashboard/admin`.

## Administrador — Funções comuns e limites

### Funções comuns e diferenças do administrador

O administrador também pode usar as funções comuns UC-G. As diferenças verificadas no código são:

- **Páginas que abre:** além do painel, `/feed`, `/perfil` e `/perfil/$usuarioId`, `/postagem/$postagemId`, `/mensagens`, `/notificacoes`, `/descobrir`, `/minha-atividade`, `/configuracoes/*`, `/vagas` e `/vaga/$vagaId`. `/dashboard/candidato` e `/dashboard/empresa` são restritos aos seus tipos.
- **Feed e publicações:** pode publicar, curtir, comentar e compartilhar como qualquer conta. Vê publicações de perfis privados sem ser seguidor, e bloqueios entre usuários não limitam o que ele enxerga. Em publicação ou comentário alheio, o menu do feed oferece apenas "Denunciar"; não há atalho de moderação no feed (remover é feito no painel, UC-A23 e UC-A25).
- **Perfil:** o perfil do administrador é a versão pessoal sem seções profissionais (subtítulo "Administrador do ACESSO"); ele edita nome, telefone, foto e capa. Não tem currículo, experiências nem formações. Ao abrir o perfil de um candidato, vê também o currículo (UC-A32).
- **Busca e sugestões:** contas de administrador não aparecem nos resultados de busca de pessoas nem nas sugestões de quem seguir; só se chega a elas por link direto.
- **Mensagens:** pode iniciar e receber conversas como as demais contas (respeitando bloqueios e a preferência de mensagens do destinatário). Ser administrador não dá acesso a conversas alheias; o único acesso é o contexto de mensagem denunciada (UC-A17).
- **Indicadores e vagas:** o menu do perfil não mostra "Painel de indicadores" (só candidato e empresa); `/dashboard` encaminha o administrador para `/admin`. Pode abrir `/vagas` e a página de qualquer vaga, inclusive de empresa não aprovada (que o público não vê), mas não publica vaga, não se candidata nem favorita e não tem o botão de conversar (rotas só de empresa ou candidato).
- **Conta:** em Configurações, o administrador pode pausar (UC-G41) ou excluir (UC-G42) a própria conta com a senha atual, sem proteção específica (inclusive sendo o último administrador). A proteção contra autoexclusão vale só para as ações feitas em `/admin/usuarios` (UC-A06 e UC-A08).
- **Alertas:** o administrador não recebe notificação nem e-mail de nova denúncia ou de nova empresa pendente. Precisa abrir o painel: a lista de denúncias (UC-A15) e o cartão "Empresas pendentes" dos Relatórios (UC-A03).

### O que a conta de administrador não consegue

- Criar outras contas de administrador pelo Site ou pela API pública (só o script de UC-A01).
- Bloquear ou excluir a própria conta, ou outra conta administrativa, pelo painel (400 e 403, UC-A06 e UC-A08), nem desativá-las pela API (UC-A33). Pelas Configurações, porém, pode excluir a própria conta.
- Redefinir a senha de outra conta, enviar comunicado ou e-mail avulso a usuários, ou agir em lote: não existe tela nem rota para isso.
- Ler conversas privadas, exceto as até 7 mensagens do contexto de uma mensagem denunciada (UC-A17), sempre registradas em log; remover uma mensagem individual.
- Editar, apagar ou desfazer registros de auditoria (só existe `GET`).
- Restaurar uma publicação ou um comentário removido (nem tela, nem rota), desfazer uma exclusão de conta ou de vaga, nem reabrir uma denúncia encerrada.
- Ocultar ou reexibir vaga diretamente pelo painel, ou reexibir pela tela (só pela API, UC-A29).
- Ver, em qualquer tela do painel, o motivo de um bloqueio feito antes, ou quem enviou cada mensagem no contexto denunciado.
- Dar motivo ao bloquear pela lista de usuários, ou ao remover publicação, comentário ou vaga (a tela não oferece o campo).
- Buscar ou filtrar empresas e vagas no painel, filtrar logs por entidade, administrador ou período, filtrar usuários por situação de bloqueio, ou filtrar relatórios por período; não há exportação.
- Gerenciar o catálogo de deficiências, ou editar dados de terceiros, em qualquer tela (só pela API, UC-A34 e UC-A36).

### Ações administrativas disponíveis só pela API (sem tela no painel `/admin`)

Resumo, com remissão aos casos que as descrevem:

- `POST /api/admin/vagas/:id/ocultar` (ocultar ou reexibir vaga, UC-A29).
- `GET /api/dashboard/admin` (UC-A39).
- `GET /api/usuarios`, `GET /api/usuarios/:id`, `PATCH /api/usuarios/:id/ativar` e `/desativar` (UC-A33) e `DELETE /api/usuarios/:id` (mesmo efeito de UC-A08, sem motivo).
- `DELETE /api/empresas/:id` e `DELETE /api/candidatos/:id` (UC-A35).
- `POST`, `PUT` e `DELETE /api/deficiencias` (UC-A34).
- Edições de terceiros: `PUT /api/usuarios/:id`, fotos e capas, `PUT /api/empresas/:id` (inclui CNPJ e selo), `PUT /api/candidatos/:id`, perfil profissional, `PUT /api/postagens/:id`, descrição de anexo e `PUT /api/vagas/:id` (UC-A36).
- Remoção de publicação e de comentário pelas rotas comuns `DELETE /api/postagens/:id` e `DELETE /api/comentarios/:id`: gravam `remover_postagem` e `remover_comentario` com descrição mais curta ("Postagem removida pela moderação.", "Comentário removido pela moderação.") e sem o retrato do conteúdo; diferente do painel, a remoção de publicação por essa rota atualiza o feed em tempo real e avisa o autor com o subtipo `postagem_removida_moderacao`.
- Leituras e candidaturas: `GET /api/candidatos`, `GET /api/vagas/:vagaId/candidaturas`, `GET /api/vagas/:id/estatisticas`, `GET /api/candidaturas/:id` (UC-A37), `PATCH /api/candidaturas/:id/status` e `/cancelar` (UC-A38).

### Ações registradas na auditoria

| Ação (código gravado) | Entidade | Gerada por |
|---|---|---|
| `bloquear_usuario`, `reativar_usuario` | usuário | UC-A06, UC-A07 e UC-A19 (com ação "bloquear") |
| `excluir_usuario` | usuário | UC-A08 |
| `aprovar_empresa`, `reprovar_empresa` | empresa | UC-A10, UC-A11 |
| `suspender_empresa`, `reativar_empresa` | empresa | UC-A12, UC-A13 e UC-A19 (com ação "suspender") |
| `verificar_empresa`, `remover_verificacao_empresa` | empresa | UC-A14 |
| `remover_postagem` | publicação | UC-A23 e UC-A19 (com ação "remover"); também pela rota comum (UC-A23) |
| `remover_comentario` | comentário | UC-A25 e UC-A19 (com ação "remover"); também pela rota comum (UC-A25) |
| `alterar_status_vaga`, `excluir_vaga` | vaga | UC-A27, UC-A28 |
| `ocultar_vaga`, `reexibir_vaga` | vaga | UC-A29 e UC-A19 (com ação "ocultar") |
| `atribuir_denuncia`, `resolver_denuncia`, `rejeitar_denuncia`, `arquivar_denuncia` | denúncia | UC-A18, UC-A19, UC-A20, UC-A21 |
| `visualizar_mensagem_denunciada` | denúncia | UC-A17 |
| `ativar_usuario`, `desativar_usuario` | usuário | UC-A33 (somente pela API) |
| `excluir_candidato` (entidade usuário), `excluir_empresa` (entidade empresa) | usuário ou empresa | UC-A35 (somente pela API) |

Não geram registro: a criação da conta de administrador (UC-A01), o login, a consulta de currículo (UC-A32), as edições de terceiros (UC-A36), a mudança de candidaturas (UC-A38), a gestão do catálogo de deficiências (UC-A34) e a exclusão da própria conta pelo usuário.

### Limitações atuais observadas no código

- A lista de usuários bloqueia sem pedir motivo, então o e-mail e a notificação saem sem motivo; só a resolução de denúncia permite informar um (UC-A06).
- No login, uma conta bloqueada recebe "Usuário desativado."; a mensagem com o motivo só aparece quando uma sessão aberta é derrubada (UC-A02, UC-A06).
- "Ocultar vaga" tira a vaga apenas da busca global e das áreas públicas; `/vagas`, a página da vaga e as candidaturas ignoram o sinalizador, e a tela de vagas não tem botão de ocultar nem de reexibir (UC-A29).
- O aviso do diálogo de exclusão de conta diz que as mensagens serão apagadas, mas o banco preserva as mensagens com o remetente nulo (UC-A08).
- Ao excluir uma conta de empresa, as denúncias de tipo "Usuário" contra o usuário dela não são arquivadas automaticamente (UC-A08).
- O filtro de logs é exato e diferencia maiúsculas; o placeholder "BLOQUEAR_USUARIO" está em maiúsculas, mas os códigos são gravados em minúsculas (UC-A30).
- O histórico do detalhe de um usuário não mostra as ações sobre a empresa dele, que usam o id da empresa (UC-A05).
- Aprovar e reprovar empresa não conferem o status anterior no servidor; a tela é que desabilita as combinações redundantes (UC-A10, UC-A11).
- Remover publicação ou comentário é exclusão lógica sem restauração, e o texto do aviso de comentário diz "permanentemente" (UC-A23, UC-A25).
- Alterar status e remover vaga, e remover publicação e comentário, não pedem motivo; remover vaga não avisa a empresa nem os candidatos (UC-A23, UC-A25, UC-A27, UC-A28).
- Várias edições e consultas feitas pela API em dados de terceiros, incluindo o currículo de candidatos, não deixam rastro na auditoria (UC-A32, UC-A36, UC-A38).
