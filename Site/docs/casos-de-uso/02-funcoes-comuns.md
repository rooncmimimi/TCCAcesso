## Funções comuns a contas autenticadas

Casos de uso que candidato, empresa e administrador executam da mesma forma no Site (frontend React em `Site/Frontend`, API Express em `Site/Backend`). Onde o comportamento muda conforme o tipo de conta, a diferença aparece dentro do próprio caso, e a tabela "Quem pode cada função" (em "Regras gerais") resume quem pode o quê, conferido nas rotas do backend e no `GuardaAcesso` do frontend. O app Android (`App/AcessoApk`) é um projeto separado e não faz parte desta seção.

| ID | Caso de uso | Resumo |
|---|---|---|
| UC-G01 | Navegar pelo cabeçalho, menu do perfil e rodapé | Usar cabeçalho, menu do perfil, contadores de não lidas e rodapé de suporte. |
| UC-G02 | Pesquisar pessoas, empresas, vagas e publicações | Busca global do cabeçalho, com resultados agrupados e buscas recentes. |
| UC-G03 | Ver o feed | Ler as publicações visíveis, em páginas de 10, com atualização em tempo real de curtidas e comentários. |
| UC-G04 | Publicar texto, imagem ou vídeo | Criar publicação com até 3000 caracteres e até 4 anexos (imagem até 5 MB, vídeo até 50 MB). |
| UC-G05 | Descrever um anexo (manual ou com IA) | Escrever a descrição acessível de uma imagem ou vídeo, ou pedir uma sugestão de IA. |
| UC-G06 | Editar a própria publicação | Alterar o texto e as descrições dos anexos de uma publicação já feita. |
| UC-G07 | Excluir a própria publicação | Remover uma publicação própria do Site. |
| UC-G08 | Abrir uma publicação e ampliar ou baixar anexos | Ver o detalhe com comentários abertos, ampliar mídia e baixar arquivos. |
| UC-G09 | Curtir e descurtir uma publicação | Alternar a curtida; o autor é notificado na curtida. |
| UC-G10 | Comentar e responder comentários | Escrever comentários (1 a 1000 caracteres) e respostas de um nível. |
| UC-G11 | Excluir o próprio comentário | Remover um comentário próprio. |
| UC-G12 | Compartilhar uma publicação | Recompartilhar no ACESSO, copiar o link ou usar o compartilhamento do sistema. |
| UC-G13 | Desfazer um compartilhamento | Botão "Desfazer compartilhamento" (hoje falha na prática). |
| UC-G14 | Ver o perfil de outra pessoa ou empresa | Abrir perfil de terceiro, público ou privado, com ações de mensagem, seguir e bloquear. |
| UC-G15 | Ver listas de seguidores e de quem a pessoa segue | Abrir os diálogos "Seguidores" e "Seguindo" de um perfil. |
| UC-G16 | Seguir e deixar de seguir uma pessoa | Seguir perfil público, "Seguir de volta" e deixar de seguir. |
| UC-G17 | Pedir para seguir um perfil privado e cancelar o pedido | Enviar e cancelar solicitação de seguimento. |
| UC-G18 | Aceitar ou recusar pedido para seguir | Decidir os pedidos recebidos, pela tela de notificações. |
| UC-G19 | Seguir e deixar de seguir uma empresa | Seguimento de empresa (só candidato consegue). |
| UC-G20 | Descobrir pessoas e empresas para seguir | Tela de sugestões com motivo explicado. |
| UC-G21 | Consultar minha atividade | Resumo privado de seguidos e interações no feed. |
| UC-G22 | Iniciar uma conversa | Abrir chat 1:1 a partir de um perfil ou de uma vaga, respeitando as regras do destinatário. |
| UC-G23 | Consultar conversas e mensagens não lidas | Lista de conversas, busca por nome e selos de não lidas. |
| UC-G24 | Enviar e receber mensagens em tempo real | Trocar mensagens de texto com aviso "digitando…". |
| UC-G25 | Consultar notificações e abrir o conteúdo relacionado | Ler a central de notificações e seguir o link de cada item. |
| UC-G26 | Marcar notificações como lidas e removê-las | Marcar uma ou todas como lidas e excluir itens. |
| UC-G27 | Receber notificações em tempo real | Selos e lista atualizados por Socket.IO. |
| UC-G28 | Definir preferências de notificação | Três interruptores salvos na conta (sem efeito real hoje). |
| UC-G29 | Denunciar conteúdo ou conta | Denunciar postagem, comentário, mensagem, vaga, usuário ou empresa. |
| UC-G30 | Bloquear uma pessoa ou empresa | Bloquear a partir do perfil ou logo após denunciar. |
| UC-G31 | Consultar bloqueados e desbloquear | Gerenciar a lista de bloqueados. |
| UC-G32 | Consultar e editar os dados da conta | Ver nome, tipo, datas e editar nome, telefone, foto e banner. |
| UC-G33 | Trocar o e-mail | Trocar o e-mail de acesso com código enviado ao novo endereço. |
| UC-G34 | Alterar a senha | Trocar a senha e ser desconectado de todos os aparelhos. |
| UC-G35 | Definir se o perfil é público ou privado | Interruptor "Perfil público" e seus efeitos reais. |
| UC-G36 | Definir quem pode iniciar conversa comigo | Escolher entre seis opções de privacidade de mensagens. |
| UC-G37 | Consultar sessões ativas e encerrá-las | Ver aparelhos conectados e encerrar uma ou todas as outras. |
| UC-G38 | Ajustar e salvar preferências de acessibilidade | Contraste, fonte, espaçamento, voz, VLibras etc., com salvamento na conta. |
| UC-G39 | Responder ao consentimento de leitura por voz | Diálogo de primeiro acesso que liga ou não a leitura por voz. |
| UC-G40 | Escolher o idioma | Trocar entre português, inglês e espanhol, com idioma salvo na conta. |
| UC-G41 | Pausar a conta | Pausar com senha; o efeito real é só exigir reativação no próximo login. |
| UC-G42 | Excluir a conta definitivamente | Apagar a conta e os dados vinculados, com senha. |
| UC-G43 | Sair da conta | Encerrar a sessão do navegador atual. |
| UC-G44 | Voltar ao início a partir de uma página de erro | Telas "Página não encontrada" e "Esta página não carregou". |
| UC-G45 | Ver o próprio perfil | Abrir `/perfil` e o que é comum aos três tipos de conta. |
| UC-G46 | Ter a conta bloqueada pela moderação | O que a pessoa vê quando o administrador bloqueia sua conta. |

## Funções comuns: regras gerais

- **Quem entra:** todas as telas desta seção usam `GuardaAcesso` com os três tipos (candidato, empresa, administrador). Sem sessão a pessoa é levada a `/entrar`; tipo sem permissão volta a `/feed` (aqui nunca acontece, porque os três são aceitos). Exceção: `/configuracoes/acessibilidade` abre sem login (e guarda as preferências só no aparelho). `/vagas`, `/vaga/:vagaId` e `/boas-vindas` também não usam o guarda, mas pertencem a outras seções.
- **Quem pode cada função** (conferido em `autenticacaoMiddleware`, nos serviços e no `GuardaAcesso`). Nenhuma rota comum usa `exigirTipoUsuarioMiddleware`; a diferença entre os tipos vem das regras dentro dos serviços:

| Casos | Candidato | Empresa | Administrador | Observação |
|---|---|---|---|---|
| UC-G01, G02, G21, G25 a G28 | Sim | Sim (aprovada) | Sim | A busca não devolve administradores. |
| UC-G03 a G13 (feed e publicações) | Sim | Sim (aprovada) | Sim | A API recusa empresa não aprovada. Pela API, o administrador também edita/exclui publicação alheia e exclui comentário alheio (`garantirDono`), mas o Site só mostra essas ações ao autor. |
| UC-G14, G15, G20 (pessoas), G45 | Sim | Sim (aprovada) | Sim | O administrador ignora bloqueio e privacidade ao ver perfis. |
| UC-G16 a G18 | Sim | Sim (aprovada) | Sim | Qualquer conta segue pessoas; quem decide o pedido é o dono do perfil privado. |
| UC-G19 e seção "Empresas" de UC-G20 | Sim | Não | Não | `alternarEmpresa` exige registro de candidato ("Apenas candidatos podem seguir empresas."); o botão aparece para todos no perfil da empresa. |
| UC-G22 a G24 | Sim | Sim (aprovada) | Sim | Regras do destinatário em UC-G22. O botão "Conversar com a empresa" da vaga é só do candidato. |
| UC-G29 a G31 | Sim | Sim | Sim | `POST /api/denuncias` e as rotas de bloqueio só exigem login. |
| UC-G32 a G37, G41 a G43 | Sim | Sim | Sim | O diálogo de edição muda por tipo (UC-G32). Trocar e-mail, trocar senha, pausar e excluir exigem a senha atual. |
| UC-G38 a G40 | Sim | Sim | Sim | Também funcionam sem login (só no aparelho). |
| UC-G44 | Sim | Sim | Sim | Também para visitantes. |
| UC-G46 | Sim | Sim | Não se aplica | Administrador não é bloqueado pelo painel (UC-A06). |

- **Empresa sem aprovação:** enquanto o cadastro está pendente, reprovado ou suspenso, o Site troca todo o app (`EstruturaApp`) por uma tela de status (`TelaStatusEmpresa`): marca, situação, seletor de idioma, "Verificar novamente" (só no caso pendente; recarrega a página), "Sair da conta" e "Fale conosco". Na API, `garantirEmpresaAprovadaSeForEmpresa` recusa a empresa não aprovada em: feed e linha do tempo, detalhe/edição/exclusão de publicação, curtidas, comentários (listar e criar), compartilhamentos e todas as rotas de conversas e mensagens (exceto `GET /api/conversas/nao-lidas` e `GET /api/conversas/pode-iniciar/:id`). Busca, notificações, seguir, bloquear, denunciar, atividade e configurações da conta respondem normalmente na API, mas o Site não as expõe a essa empresa. Por isso os casos abaixo valem para empresa **aprovada**.
- **Sessão:** o Site usa token de acesso JWT (30 minutos por padrão, `JWT_EXPIRES_IN`) e refresh token opaco (30 dias), guardados no `localStorage`. Quando a API responde 401, o Site tenta renovar o token e repete a requisição uma vez; se a renovação falha, a sessão local é encerrada e a pessoa volta ao login. Isso vale também para o 401 de "Senha atual incorreta.": a repetição falha de novo, e nas rotas com `limiteAutenticacao` as duas tentativas contam no limite.
- **Conta bloqueada pela moderação:** ver UC-G46.
- **Tempo real:** ao entrar, o Site abre uma conexão Socket.IO autenticada. Se ela falhar, tudo segue funcionando por requisições comuns, só sem atualização automática. Os eventos `mensagem:lida`, `conversa:atualizada` e `notificacao:atualizada` são emitidos pelo servidor, mas o Site não os escuta.
- **Limites da API:** `limiteApi`, 300 requisições a cada 15 minutos por IP em todas as rotas `/api`. `limiteAutenticacao`, 10 requisições **com erro** a cada 15 minutos por IP, com contador único compartilhado entre login, cadastro, redefinição de senha, trocar e-mail (solicitar e confirmar), pausar conta e excluir conta; resposta "Muitas tentativas de autenticação. Tente novamente mais tarde." A troca de senha (`PATCH /api/auth/senha`) **não** tem esse limite.
- **Avisos:** confirmações e erros aparecem como avisos na tela (toasts). Nas ações de gravação (curtir, comentar, seguir, salvar etc.) o aviso de erro mostra a mensagem devolvida pelo servidor (o primeiro erro de validação, quando há); o texto padrão de cada ação ("Não foi possível …") só aparece quando não há resposta com mensagem, por exemplo sem conexão ou após o tempo limite de 20 s. Nas telas de carregamento (feed, detalhe, listas) o texto de erro é fixo. As mensagens da API seguem o idioma escolhido (cabeçalho `Accept-Language`).
- **Endpoints sem tela:** `GET /api/postagens/:id/curtidas`, `GET /api/compartilhamentos/postagem/:id`, `GET /api/compartilhamentos/usuario/:id`, `GET /api/conversas/:id`, `GET /api/usuarios/:id` (dono ou administrador), `POST /api/auth/google/vincular` (vincular conta Google a conta com senha: o texto do Site cita "nas configurações", mas não existe tela para isso). Os endpoints de push (`/api/notificacoes/push-token`) são do app Android.

## Funções comuns: navegação e busca

### UC-G01 — Navegar pelo cabeçalho, menu do perfil e rodapé
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** usar o cabeçalho fixo, o menu do perfil e o rodapé de suporte para chegar às áreas do Site e acompanhar os contadores de não lidas.
- **Pré-condições:** sessão ativa; empresa com cadastro aprovado.
- **Fluxo principal:**
  1. Depois do login, candidato e empresa chegam em `/feed` e o administrador em `/admin` (candidato com cadastro inacabado volta ao cadastro, UC-V17). A logo e o item "Início" levam sempre a `/feed`.
  2. O cabeçalho mostra: logo, botão de busca (UC-G02), itens Início, Vagas (`/vagas`, página pública), Mensagens e Notificações, seletor de idioma (PT, EN, ES; UC-G40) e o menu com foto e primeiro nome.
  3. Mensagens e Notificações exibem um selo com a quantidade de não lidas ("9+" acima de 9).
  4. O menu do perfil mostra o nome e, abaixo, "Entre para personalizar sua experiência" (o campo de título da sessão não é preenchido pela API, então o título profissional nunca aparece ali). Itens: Ver perfil (`/perfil`, UC-G45), Minha atividade (UC-G21), Descobrir (UC-G20), um item que depende do tipo de conta (ver regras), Configurações de acessibilidade (UC-G38), Configurações e Sair (UC-G43).
  5. No fim das páginas, o rodapé de suporte oferece "Fale conosco" (link `mailto:` para a equipe), Acessibilidade (`/configuracoes/acessibilidade`), Privacidade (`/configuracoes/privacidade`) e Segurança (`/configuracoes/seguranca`). O primeiro elemento focável de cada página é o atalho "Pular para o conteúdo principal".
- **Fluxos alternativos e exceções:**
  - Enquanto a sessão é carregada aparece "Carregando sua sessão…".
  - Sem sessão a tela redireciona para `/entrar`. Quem já está logado e abre `/` é levado a `/feed`.
  - Empresa pendente, reprovada ou suspensa: nada disso aparece, só a tela de status.
  - Se a leitura dos contadores falhar, o selo simplesmente não aparece (o erro é ignorado).
- **Pós-condições:** nenhuma alteração de dados.
- **Regras de negócio:** o item do meio do menu muda conforme o tipo: candidato e empresa veem "Painel de indicadores" (`/dashboard`); administrador vê "Painel administrativo" (`/admin`) (`CabecalhoApp.tsx`). O selo de Notificações é a contagem total de não lidas, relida a cada `notificacao:nova` e depois de ações em `/notificacoes`. O selo de Mensagens soma 1 a cada evento `mensagem:nova` recebido (inclusive de conversa aberta) e é recalculado ao sair de `/mensagens`.
- **Telas e endpoints:** `/feed`, `/vagas`, `/mensagens`, `/notificacoes`, `/perfil`, `/minha-atividade`, `/descobrir`, `/configuracoes`, `/configuracoes/acessibilidade`; `GET /api/notificacoes/nao-lidas`; `GET /api/conversas/nao-lidas`.

### UC-G02 — Pesquisar pessoas, empresas, vagas e publicações
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** procurar conteúdo do ACESSO pela busca global do cabeçalho.
- **Pré-condições:** sessão ativa.
- **Fluxo principal:**
  1. A pessoa clica no botão "Pesquisar pessoas, empresas ou vagas…" no cabeçalho; abre uma caixa de busca com teclado acessível.
  2. Digita ao menos 2 caracteres; após 300 ms sem digitar o Site consulta a API.
  3. Os resultados vêm agrupados em Pessoas, Empresas, Vagas e Publicações, com até 5 itens por grupo.
  4. Ao escolher um item, o Site abre o perfil (`/perfil/:usuarioId`), a vaga (`/vaga/:vagaId`) ou a publicação (`/postagem/:postagemId`) e fecha a busca.
- **Fluxos alternativos e exceções:**
  - Com a caixa vazia aparecem até 5 buscas recentes; clicar numa delas preenche o campo.
  - Menos de 2 caracteres: "Digite ao menos 2 caracteres para pesquisar." (a API também recusa com "Informe ao menos 2 caracteres para pesquisar.").
  - Sem resultado: `Não encontramos resultados para "<termo>". Tente pesquisar por outro nome, empresa, vaga ou palavra-chave.`; erro: "Não foi possível pesquisar agora." com "Tentar novamente".
  - O termo é cortado em 120 caracteres.
- **Pós-condições:** nada é gravado no servidor. A busca escolhida é guardada só no navegador (`localStorage`, chave `acesso:buscas-recentes`, no máximo 5, gravada quando a pessoa escolhe um resultado).
- **Regras de negócio** (`BuscaService`):
  - A comparação ignora acentos e maiúsculas.
  - Pessoas: contas ativas, não bloqueadas pela moderação e que não sejam administradoras, buscadas só pelo nome da conta (contas de empresa também entram aqui, pelo nome da conta, e abrem o perfil da empresa); contas com bloqueio entre as partes (qualquer sentido) ficam de fora. Perfil privado aparece.
  - Empresas: só as aprovadas, por nome fantasia, razão social ou setor; bloqueios também as excluem. Empresa com "Perfil público" desligado aparece, mas o perfil não abre (UC-G14).
  - Vagas: abertas, não ocultas, de empresa aprovada, por título, descrição ou cidade.
  - Publicações: texto da publicação, com as mesmas regras de visibilidade do feed (UC-G03); o administrador vê tudo.
  - O Site usa só o resumo; não existe página de resultados completos (a API aceita `tipo` e paginação).
- **Telas e endpoints:** cabeçalho de qualquer tela autenticada; `GET /api/busca?q=<termo>&tipo=tudo`.

## Funções comuns: feed e publicações

### UC-G03 — Ver o feed
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** ler as publicações da comunidade na tela inicial do Site.
- **Pré-condições:** sessão ativa.
- **Fluxo principal:**
  1. A pessoa abre `/feed`.
  2. Em telas largas (a partir de 1024 px) aparece, à esquerda, um cartão com sua foto e nome, o botão "Ver meu perfil" e a prévia "Pessoas para conhecer" (3 sugestões e "Ver mais sugestões", que leva a `/descobrir`; a prévia some se não houver sugestão). Abaixo do nome o cartão mostra "Entre para personalizar", porque o título da sessão não é preenchido (ver UC-G01).
  3. No centro ficam a caixa de nova publicação (UC-G04) e a lista de publicações, 10 por vez, da mais recente para a mais antiga.
  4. Cada cartão mostra autor (link para o perfil), tempo relativo, "· editado" quando houver, menu "⋮" (autor: Editar e Excluir; outras pessoas: Denunciar), texto, anexos e os botões Curtir, Comentar, Compartilhar e "Ver publicação".
  5. "Carregar mais" traz a página seguinte.
- **Fluxos alternativos e exceções:**
  - Carregando: esqueletos; erro: "Não foi possível carregar o feed. Tente novamente mais tarde."; lista vazia: "Ainda não há publicações. Seja o primeiro a compartilhar algo com a comunidade."
  - Empresa não aprovada: a API recusa com a mensagem do status (pendente, reprovada ou suspensa).
  - Nova publicação de outra pessoa não entra sozinha na lista: o Site só marca a lista como desatualizada, e ela é refeita na próxima vez que a tela `/feed` é aberta ou a página é recarregada (o Site não refaz a lista ao voltar para a aba do navegador).
- **Pós-condições:** nenhuma alteração de dados.
- **Regras de negócio** (`PostagemService.listar`):
  - Ordem por data, da mais recente para a mais antiga. A API aceita `escopo=seguindo`, mas o Site não usa; o feed não prioriza quem a pessoa segue.
  - Publicação de autor com perfil privado só aparece para o próprio autor e para seguidores aprovados; publicações de empresa aparecem sempre; autores com bloqueio em qualquer sentido ficam de fora.
  - Administrador vê tudo, sem filtro de privacidade nem de bloqueio.
  - Publicações removidas não aparecem.
  - Tempo real (`feed:curtida`, `feed:comentario`, `feed:postagem`, enviados a todos os clientes conectados só com ids e totais): contadores de curtidas e comentários mudam na hora; publicação removida some; publicação editada é recarregada. A página de detalhe (`/postagem/:id`) não assina esses eventos.
- **Telas e endpoints:** `/feed`; `GET /api/postagens?page=&limit=10`; `GET /api/seguir/sugestoes?limit=3`; Socket.IO `feed:postagem`, `feed:curtida`, `feed:comentario`.

### UC-G04 — Publicar texto, imagem ou vídeo
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** criar uma publicação com texto e/ou anexos de imagem e vídeo.
- **Pré-condições:** sessão ativa.
- **Fluxo principal:**
  1. No `/feed`, a pessoa escreve na caixa "Compartilhe algo…" (limite de 3000 caracteres, com contador "n caracteres restantes").
  2. Opcionalmente clica em "Foto" (PNG, JPEG ou WEBP) e/ou "Vídeo" (MP4 ou WEBM) e escolhe arquivos; no total são até 4 anexos, em qualquer combinação de fotos e vídeos. Com 4 anexos os dois botões ficam desabilitados.
  3. Cada anexo mostra prévia, botão de remover e campo de descrição (UC-G05).
  4. Clica em "Publicar" (o botão fica desabilitado sem texto e sem anexo, ou durante o envio, "Publicando…").
  5. O sistema grava, mostra "Publicação criada com sucesso.", limpa o formulário e recarrega a lista.
- **Fluxos alternativos e exceções:**
  - No Site: tipo não aceito, "Apenas imagens (PNG/JPEG/WEBP) e vídeos (MP4/WEBM) são aceitos."; mais de 4 arquivos, "Você pode anexar no máximo 4 arquivos." (os excedentes são descartados); sem texto e sem anexo, "Escreva algo ou anexe um arquivo para publicar."
  - No servidor, na ordem em que são conferidos: conteúdo que não bate com o formato declarado (assinatura binária) → "O conteúdo do arquivo não corresponde a um arquivo válido do formato declarado."; imagem entre 5 MB e 50 MB → "Arquivo muito grande. Limite de 5MB para este tipo."; qualquer arquivo acima de cerca de 50 MB (teto do upload) → "Arquivo excede o tamanho máximo permitido."; mais de 4 arquivos pela API → "Falha no upload do arquivo."; texto acima de 3000 caracteres → "O conteúdo deve ter no máximo 3000 caracteres."; falha do armazenamento → "Não foi possível enviar o arquivo agora. Tente novamente em alguns instantes."
  - Se a gravação no banco falhar depois do envio, os arquivos enviados naquela requisição são apagados do armazenamento. Recusas posteriores ao envio dos arquivos (texto acima de 3000 pela API, empresa não aprovada) não acionam essa limpeza e deixam os arquivos órfãos no armazenamento; o Site limita a caixa de texto a 3000 caracteres.
- **Pós-condições:** grava `postagens` (autor, texto, `publica` = verdadeiro) e `postagem_anexos` (tipo imagem ou vídeo, caminho no bucket privado `postagens/<usuarioId>/<uuid>.ext`, nome original, tipo MIME, tamanho, ordem, descrição). Envia a todos os clientes conectados o evento `feed:postagem` só com o id da publicação. Não gera notificação para seguidores.
- **Regras de negócio:** publicação só com anexo é permitida; os limites padrão de 5 MB (imagem) e 50 MB (vídeo), em múltiplos de 1024, vêm de `MAX_UPLOAD_BYTES` e `MAX_VIDEO_UPLOAD_BYTES` e podem ser alterados no servidor; o tipo do arquivo é conferido pela assinatura binária, não só pelo nome (`uploadMiddleware.js`); o Site não valida o tamanho do arquivo antes de enviar; os anexos ficam em bucket privado e só são exibidos por URL assinada depois de checar o acesso; o campo `publica` é enviado como verdadeiro e não altera a visibilidade (quem controla é a privacidade do perfil, UC-G35). Sem Supabase configurado (desenvolvimento) os arquivos ficam em disco local.
- **Telas e endpoints:** `/feed`; `POST /api/postagens` (multipart: `conteudo`, `publica`, `arquivos` até 4, `descricoesAnexos`).

### UC-G05 — Descrever um anexo (manual ou com IA)
- **Ator:** candidato, empresa (aprovada) ou administrador (autor da publicação). Ator secundário: serviço de IA da OpenRouter.
- **Descrição:** escrever a descrição acessível de uma imagem ou vídeo, para leitores de tela, ou pedir uma sugestão de descrição de imagem.
- **Pré-condições:** ter anexado uma imagem ou vídeo em publicação nova (UC-G04) ou ser o autor de uma publicação com anexos (UC-G06).
- **Fluxo principal:**
  1. Para imagem, o Site pergunta "Como você deseja descrever esta imagem?" com duas opções: "Descrever com IA" e "Escrever minha própria descrição". Para vídeo existe só o campo "Descrição do vídeo (opcional)".
  2. Com "Descrever com IA", o Site envia a imagem naquele momento ("Gerando sugestão de descrição…") e mostra a sugestão em um campo editável com o rótulo "Sugestão da IA — revise antes de confirmar". A pessoa pode editar, "Gerar novamente" ou "Escrever minha própria". Se a leitura por voz estiver ativa, a sugestão é lida em voz alta. Na edição de um anexo já publicado, o Site baixa a imagem do endereço assinado e a reenvia para a sugestão.
  3. Com a escrita manual, digita até 500 caracteres.
  4. O texto segue junto com "Publicar" (ou "Salvar", na edição).
- **Fluxos alternativos e exceções:**
  - IA indisponível ou com erro: aparece "Não foi possível gerar a descrição automaticamente. Você pode escrever uma descrição manualmente." e, abaixo, a mensagem do servidor, com "Tentar novamente". Mensagens do servidor: "Sugestão de descrição por IA não está configurada neste momento." (sem chave), "Não foi possível gerar uma sugestão de descrição a tempo.", "Não foi possível conectar ao serviço de sugestão de descrição.", "Limite de uso do serviço de sugestão foi atingido. Tente novamente mais tarde." (429 do provedor), "O serviço de sugestão de descrição não conseguiu processar esta imagem.", "O serviço de sugestão não retornou uma descrição válida." e "O serviço de sugestão não conseguiu gerar uma descrição válida para esta imagem. Tente novamente ou escreva a descrição manualmente." (resposta que não parece descrição).
  - Limite de 30 sugestões por hora por pessoa: "Você atingiu o limite de sugestões de descrição por hora. Tente novamente mais tarde ou escreva a descrição manualmente."
  - Imagem ausente: "Envie uma imagem para gerar a sugestão."; formato fora de PNG, JPEG e WEBP: "Formato inválido. Envie uma imagem PNG, JPEG ou WEBP."; imagem acima de 5 MB: "Arquivo excede o tamanho máximo permitido." (esta rota não confere a assinatura binária).
- **Pós-condições:** a sugestão não grava nada. A descrição só passa a existir (campo `descricao` do anexo) quando a publicação é feita ou a edição é salva; texto vazio remove a descrição (o anexo passa a mostrar "Sem descrição — adicione uma para leitores de tela." ao autor).
- **Regras de negócio** (`SugestaoDescricaoService`, `OpenRouterService`): o texto vem em português, em uma ou duas frases, no máximo 500 caracteres; as instruções ao modelo proíbem inventar nomes ou locais, identificar pessoas e inferir deficiência ou condição de saúde; a imagem é enviada a um provedor externo (OpenRouter, modelos gratuitos com visão) somente depois do clique em "Descrever com IA".
- **Telas e endpoints:** `/feed` (nova publicação), `/feed`, `/postagem/:postagemId` e perfis (edição de anexo); `POST /api/postagens/anexos/sugerir-descricao` (campo `imagem`).

### UC-G06 — Editar a própria publicação
- **Ator:** candidato, empresa (aprovada) ou administrador, sobre publicação de sua autoria.
- **Descrição:** alterar o texto da publicação e a descrição dos anexos.
- **Pré-condições:** ser o autor da publicação.
- **Fluxo principal:**
  1. No menu "⋮" da publicação, escolhe "Editar".
  2. O texto vira um campo editável; altera e clica em "Salvar" (ou "Cancelar").
  3. O sistema atualiza, mostra "Publicação atualizada." e o cartão passa a exibir "· editado".
  4. Para os anexos, o autor vê "Editar" ou "Adicionar" abaixo de cada imagem ou vídeo, altera a descrição (UC-G05) e salva; aviso "Descrição da imagem atualizada."
- **Fluxos alternativos e exceções:**
  - Texto vazio: o botão "Salvar" fica desabilitado; o campo de edição não tem limite no Site, e pela API o texto fora de 1 a 3000 caracteres devolve "O conteúdo deve ter entre 1 e 3000 caracteres."
  - Descrição acima de 500 caracteres (pela API): "A descrição deve ter no máximo 500 caracteres."
  - Não é possível trocar, adicionar ou remover arquivos de uma publicação já feita.
  - Publicação removida: "Postagem não encontrada."
  - Sem resposta do servidor: "Não foi possível editar a publicação." ou "Não foi possível atualizar a descrição."
- **Pós-condições:** atualiza `conteudo` e `editado_em` (ou `descricao` do anexo); emite `feed:postagem` com `atualizada`, o que faz os outros clientes refazerem a lista.
- **Regras de negócio:** só o autor vê as opções de edição; a API também aceita administrador (`garantirDono`), mas o Site não oferece essa ação a ele em publicação alheia; empresa não aprovada é recusada.
- **Telas e endpoints:** `/feed`, `/postagem/:postagemId`, `/perfil`, `/perfil/:usuarioId`; `PUT /api/postagens/:id`; `PATCH /api/postagens/:id/anexos/:anexoId`.

### UC-G07 — Excluir a própria publicação
- **Ator:** candidato, empresa (aprovada) ou administrador, sobre publicação de sua autoria.
- **Descrição:** remover uma publicação própria.
- **Pré-condições:** ser o autor da publicação.
- **Fluxo principal:**
  1. No menu "⋮", escolhe "Excluir".
  2. O diálogo "Excluir publicação?" avisa que a ação não pode ser desfeita; confirma em "Excluir".
  3. O cartão some e aparece "Publicação excluída."
- **Fluxos alternativos e exceções:** "Cancelar" fecha o diálogo sem alterar nada; falha sem resposta do servidor: "Não foi possível excluir a publicação."
- **Pós-condições:** a publicação é marcada como inativa (`ativo = falso`) e emite `feed:postagem` com `removida`, o que a retira do feed, da busca, dos perfis e de "Minha atividade" (também dos clientes conectados, em tempo real).
- **Regras de negócio:** a exclusão é lógica: o registro, as curtidas, os comentários e os arquivos anexos continuam no banco e no armazenamento, apesar de o aviso da tela falar em remoção permanente. Só o autor vê "Excluir" no Site; a API aceita também o administrador (que, nesse caso, gera notificação ao autor e registro de auditoria; ação do painel, UC-A23).
- **Telas e endpoints:** `/feed`, `/postagem/:postagemId`, perfis; `DELETE /api/postagens/:id`.

### UC-G08 — Abrir uma publicação e ampliar ou baixar anexos
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** ver uma publicação isolada, com os comentários já abertos, ampliar imagens e vídeos e baixar os arquivos.
- **Pré-condições:** sessão ativa e acesso à publicação (UC-G03).
- **Fluxo principal:**
  1. A pessoa clica em "Ver publicação" (ou chega por busca, notificação, atividade ou link compartilhado) e abre `/postagem/:postagemId`, com o link "Voltar para o feed".
  2. Clica numa imagem para ampliá-la; no vídeo usa os controles do player ou o botão de ampliar.
  3. No modo ampliado navega entre as mídias (botões ou setas do teclado) e pode clicar em "Baixar".
  4. O Site pede uma URL de download nova e o navegador baixa o arquivo.
- **Fluxos alternativos e exceções:**
  - Erro ao abrir: "Não foi possível carregar esta publicação." com "Tentar novamente" (texto fixo, qualquer que seja a causa). A API distingue publicação inexistente ("Postagem não encontrada."), autor com perfil privado ("Este perfil é privado. Siga para ver as publicações.") e bloqueio ("Esta publicação não está disponível.").
  - Falha no download: aviso com a mensagem do servidor ou "Não foi possível baixar o arquivo."
  - Documentos anexados em publicações antigas abrem em nova aba; publicações novas não aceitam documento.
- **Pós-condições:** nenhuma alteração de dados.
- **Regras de negócio:** toda URL de anexo é assinada e gerada só depois de checar o acesso à publicação; o anexo precisa pertencer à publicação informada; as URLs de exibição valem 6 horas (autor público ou empresa) ou 5 minutos (autor privado), e a de download vale 5 minutos e é reautorizada a cada clique (`PostagemService.gerarUrlAnexo`; valores padrão, configuráveis).
- **Telas e endpoints:** `/postagem/:postagemId`; `GET /api/postagens/:id`; `GET /api/postagens/:id/anexos/:anexoId/download`.

### UC-G09 — Curtir e descurtir uma publicação
- **Ator:** candidato, empresa (aprovada) ou administrador. Ator secundário: autor da publicação.
- **Descrição:** marcar ou desmarcar uma publicação como curtida.
- **Pré-condições:** acesso à publicação.
- **Fluxo principal:**
  1. Clica em "Curtir (n)" no cartão.
  2. O botão muda na hora (atualização otimista) e o contador soma um.
  3. Clicando de novo, a curtida é desfeita.
- **Fluxos alternativos e exceções:** se a requisição falhar, o estado volta ao anterior e aparece a mensagem do servidor ou "Não foi possível curtir a publicação."; publicação inacessível devolve os erros de UC-G08.
- **Pós-condições:** cria ou remove `curtidas`; ao curtir uma publicação de outra pessoa, o autor recebe a notificação "Nova curtida na sua publicação" (a cada nova curtida, sem agrupar; descurtir não notifica; curtir a própria publicação não notifica); emite `feed:curtida` com o novo total.
- **Regras de negócio:** o mesmo endpoint alterna curtir e descurtir (`CurtidaService`); há uma única curtida por pessoa e publicação; existe `GET /api/postagens/:id/curtidas` para listar quem curtiu, mas o Site não tem tela para isso.
- **Telas e endpoints:** `/feed`, `/postagem/:postagemId`, perfis; `POST /api/postagens/:postagemId/curtidas`.

### UC-G10 — Comentar e responder comentários
- **Ator:** candidato, empresa (aprovada) ou administrador. Atores secundários: autor da publicação e autor do comentário respondido.
- **Descrição:** escrever comentários em uma publicação e responder a comentários.
- **Pré-condições:** acesso à publicação.
- **Fluxo principal:**
  1. Clica em "Comentar (n)" para abrir a área de comentários (ou entra por `/postagem/:postagemId`, onde ela já vem aberta).
  2. Os comentários principais aparecem do mais antigo ao mais novo, com as respostas logo abaixo.
  3. Escreve no campo "Escreva um comentário…" e clica em "Comentar".
  4. Para responder, clica em "Responder" sob um comentário principal; o Site mostra "Respondendo a <nome>" (com "cancelar"), o botão passa a se chamar "Responder" e a resposta é enviada.
- **Fluxos alternativos e exceções:**
  - Campo vazio: botão desabilitado; acima de 1000 caracteres (o campo não limita no Site): "O comentário deve ter entre 1 e 1000 caracteres."
  - Comentário respondido removido ou de outra publicação: "Comentário respondido não encontrado."
  - Sem resposta do servidor: "Não foi possível enviar o comentário."
  - O Site carrega só os 50 primeiros comentários principais (sem paginação) e não mostra "Responder" em respostas (um nível). A API aceita responder a uma resposta, mas essas respostas mais fundas não aparecem na lista.
- **Pós-condições:** cria `comentarios`; o autor da publicação (se for outra pessoa) recebe "Novo comentário na sua publicação" com prévia de 120 caracteres; em resposta, o autor do comentário respondido também recebe "Responderam ao seu comentário" (se não for quem responde nem o dono da publicação); emite `feed:comentario` com o novo total.
- **Regras de negócio:** `PostagemService.comentar`; comentar exige as mesmas autorizações de ver a publicação (privacidade e bloqueio); o administrador comenta como qualquer pessoa.
- **Telas e endpoints:** `/feed`, `/postagem/:postagemId`; `GET` e `POST /api/postagens/:postagemId/comentarios` (corpo `comentario`, `comentarioPaiId`).

### UC-G11 — Excluir o próprio comentário
- **Ator:** candidato, empresa (aprovada) ou administrador, sobre comentário de sua autoria.
- **Descrição:** remover um comentário próprio.
- **Pré-condições:** ser o autor do comentário.
- **Fluxo principal:**
  1. Clica em "Excluir" no comentário (o link só aparece para o autor; nos comentários alheios aparece "Denunciar", UC-G29).
  2. Confirma no diálogo "Excluir comentário?".
  3. O Site mostra "Comentário excluído." e o contador diminui.
- **Fluxos alternativos e exceções:** falha: mensagem do servidor ou "Não foi possível excluir o comentário."; comentário já removido: "Comentário não encontrado."
- **Pós-condições:** o comentário fica inativo (`ativo = falso`) e emite `feed:comentario`.
- **Regras de negócio:** exclusão lógica; as respostas de um comentário principal removido deixam de aparecer na lista, mas continuam entrando no total de comentários da publicação. A API aceita remoção por administrador (com registro de auditoria, sem notificação), mas o Site só oferece o botão ao autor.
- **Telas e endpoints:** `/feed`, `/postagem/:postagemId`; `DELETE /api/comentarios/:id`.

### UC-G12 — Compartilhar uma publicação
- **Ator:** candidato, empresa (aprovada) ou administrador. Ator secundário: autor da publicação.
- **Descrição:** recompartilhar a publicação no ACESSO, copiar o link ou usar o compartilhamento do sistema.
- **Pré-condições:** acesso à publicação.
- **Fluxo principal:**
  1. Clica em "Compartilhar (n)" e abre o diálogo "Compartilhar publicação".
  2. Escolhe uma opção: "Copiar link" ("Link copiado!"), "Compartilhar em outras redes" (menu nativo do sistema, só aparece se o navegador oferecer) ou "Compartilhar no ACESSO", com comentário opcional ("O que você achou dessa publicação? (opcional)").
  3. Em "Compartilhar no ACESSO" o sistema grava, fecha o diálogo e mostra "Publicação compartilhada."
- **Fluxos alternativos e exceções:**
  - Falha ao copiar: "Não foi possível copiar o link."
  - Comentário acima de 500 caracteres (o campo não limita no Site): "O comentário deve ter no máximo 500 caracteres."
  - Erro: mensagem do servidor ou "Não foi possível compartilhar."; publicação inacessível: erros de UC-G08.
- **Pós-condições:** cria `compartilhamentos` (publicação, pessoa, comentário). O item aparece na linha do tempo do perfil de quem compartilhou como "Compartilhou · data", com o comentário; não cria novo item no feed geral. O autor (se for outra pessoa) recebe "Sua publicação foi compartilhada".
- **Regras de negócio:** não há trava (nem índice único) para compartilhar a mesma publicação mais de uma vez; o link copiado é `/postagem/<id>` e só abre para quem está logado e tem acesso (`CompartilhamentoService`).
- **Telas e endpoints:** `/feed`, `/postagem/:postagemId`, perfis; `POST /api/compartilhamentos/postagem/:postagemId`.

### UC-G13 — Desfazer um compartilhamento
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** botão "Desfazer compartilhamento", que substitui "Compartilhar" no cartão logo depois de compartilhar.
- **Pré-condições:** ter compartilhado a publicação na mesma tela carregada.
- **Fluxo principal:**
  1. Depois de UC-G12, o cartão passa a mostrar "Desfazer compartilhamento".
  2. A pessoa clica no botão.
  3. O Site pede a remoção do compartilhamento.
- **Fluxos alternativos e exceções:** no código atual o Site envia o identificador da **publicação** em vez do identificador do compartilhamento; a API responde "Compartilhamento não encontrado." e esse é o texto mostrado no aviso (o texto "Não foi possível desfazer o compartilhamento." só aparece sem resposta do servidor). Na prática, o desfazer não funciona pela tela.
- **Pós-condições:** nenhuma (o compartilhamento continua).
- **Regras de negócio:** a API `DELETE /api/compartilhamentos/:id` remove o compartilhamento do próprio autor (ou de administrador) quando recebe o id correto; o estado "compartilhada por mim" (`compartilhadaPorMim`) não vem do servidor, só do cache da tela, então ao recarregar o botão volta a ser "Compartilhar", e enquanto o botão "Desfazer" está visível não é possível compartilhar de novo na mesma tela (`PostagemCard.tsx`, `hooks.ts`).
- **Telas e endpoints:** `/feed`, `/postagem/:postagemId`; `DELETE /api/compartilhamentos/:id`.

## Funções comuns: perfis, seguidores e descoberta

### UC-G14 — Ver o perfil de outra pessoa ou empresa
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** abrir o perfil de terceiros, de candidato, empresa ou administrador, e agir a partir dele.
- **Pré-condições:** sessão ativa.
- **Fluxo principal:**
  1. A pessoa chega por foto ou nome em publicação, comentário ou conversa, por resultado de busca, sugestão, lista de seguidores ou notificação, e abre `/perfil/:usuarioId` (o próprio id redireciona para `/perfil`, UC-G45).
  2. O Site descobre o tipo: tenta o perfil de candidato, depois o de empresa e por fim um perfil genérico (administradores).
  3. Perfil de candidato: capa, foto, nome, título profissional, cidade e UF, contadores de seguidores e seguindo (UC-G15), "Sobre mim", "Informações de acessibilidade" (na tela, só os nomes das deficiências cadastradas), experiência, formação, habilidades, certificados (sem o arquivo) e a linha do tempo com publicações e compartilhamentos (os 10 itens mais recentes, sem paginação).
  4. Perfil de empresa: capa, logo, nome (fantasia ou razão social), selo "Aprovada" e, se houver, selo de empresa verificada, razão social, setor, local, link do site, total de seguidores, descrição, cultura inclusiva, vagas abertas (links) e publicações.
  5. Perfil de administrador: nome, foto e o rótulo "Administrador do ACESSO", mais a linha do tempo.
  6. Ações disponíveis: "Enviar mensagem" (UC-G22), "Seguir" (UC-G16, UC-G17 ou UC-G19) e o menu "⋮" com "Bloquear usuário" (UC-G30) e "Denunciar usuário" ou "Denunciar empresa" (UC-G29).
- **Fluxos alternativos e exceções:**
  - "Este perfil não está disponível.": bloqueio em qualquer sentido; conta inexistente; empresa não aprovada (decisão da tela). O perfil genérico também recusa conta desativada, mas o perfil de candidato não confere se a conta está ativa.
  - Candidato com perfil privado: os dados profissionais continuam visíveis; na linha do tempo, quem não é seguidor aprovado vê "Este perfil é privado. Siga para ver as publicações."
  - O botão "Seguir" some quando há bloqueio entre as partes (só chega a aparecer para o administrador, que ainda vê o perfil, ou na notificação "Seguir de volta").
  - Falha na linha do tempo: mensagem do servidor ou "Não foi possível carregar as publicações."; sem itens: "Nenhuma publicação por aqui ainda."
  - Limitação: se uma empresa desligar "Perfil público" (UC-G35), a API recusa o perfil empresarial a terceiros e o Site cai no perfil genérico, que exibe o nome e a foto da conta com o rótulo "Administrador do ACESSO".
- **Pós-condições:** nenhuma alteração de dados.
- **Regras de negócio:** dados do candidato fora da lista pública (CPF, data de nascimento, gênero, endereço, CEP, pretensão salarial, necessidades de acessibilidade, e-mail e telefone) não são devolvidos a terceiros; o currículo e o arquivo dos certificados só aparecem para o dono, para o administrador ou para empresa que tenha candidatura desse candidato em vaga sua (`candidatoPrivacidade.js`); a resposta da API inclui, para qualquer conta autenticada, também as observações que o candidato escreveu em cada deficiência (campo do vínculo), embora a tela mostre só os nomes; perfil privado de pessoa esconde apenas as publicações (`BloqueioService.garantirNaoBloqueado`); perfil de empresa com "Perfil público" desligado fica indisponível para terceiros (`garantirVisibilidadePerfil`); administrador não é barrado por bloqueio nem por privacidade.
- **Telas e endpoints:** `/perfil/:usuarioId`; `GET /api/perfil/candidatos/usuario/:usuarioId`; `GET /api/empresas/usuario/:usuarioId`; `GET /api/perfil/usuario/:usuarioId`; `GET /api/seguir/resumo/:usuarioId`; `GET /api/seguir/resumo/empresas/:empresaId`; `GET /api/postagens/usuario/:usuarioId/linha-do-tempo`.

### UC-G15 — Ver listas de seguidores e de quem a pessoa segue
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** consultar quem segue um perfil de pessoa e quem esse perfil segue.
- **Pré-condições:** estar em um perfil de pessoa (`/perfil` ou `/perfil/:usuarioId`) ou em "Minha atividade".
- **Fluxo principal:**
  1. Clica em "N Seguidores" ou "N Seguindo".
  2. O diálogo lista até 50 pessoas com foto, nome e título.
  3. Clicar numa pessoa abre o perfil dela.
- **Fluxos alternativos e exceções:** carregando; erro "Não foi possível carregar a lista."; vazio "Ninguém segue este perfil ainda." ou "Ainda não segue ninguém."; se houver mais de 50: "Mostrando 50 de N." (não há paginação).
- **Pós-condições:** nenhuma alteração de dados.
- **Regras de negócio:** as listas contam só vínculos pessoa-pessoa; seguidores de uma empresa não têm lista, só o total; a API não aplica privacidade nem bloqueio a essas listas, então qualquer conta autenticada as lê, inclusive de perfil privado (`SeguidorService.listarSeguidores`).
- **Telas e endpoints:** `/perfil`, `/perfil/:usuarioId`, `/minha-atividade`; `GET /api/seguir/seguidores/:usuarioId`; `GET /api/seguir/seguindo/:usuarioId`.

### UC-G16 — Seguir e deixar de seguir uma pessoa
- **Ator:** candidato, empresa (aprovada) ou administrador. Ator secundário: a pessoa seguida.
- **Descrição:** seguir um perfil de pessoa público e desfazer o seguimento.
- **Pré-condições:** perfil público da pessoa-alvo (perfil privado segue o fluxo de UC-G17).
- **Fluxo principal:**
  1. No perfil, em "Descobrir" ou numa notificação de novo seguidor, clica em "Seguir" (ou "Seguir de volta", quando a pessoa já segue você).
  2. O Site responde "Agora você está seguindo." e o botão vira "Deixar de seguir".
  3. Para desfazer, clica em "Deixar de seguir"; aparece "Você deixou de seguir."
- **Fluxos alternativos e exceções:** seguir a si mesmo: "Você não pode seguir a si mesmo."; bloqueio: "Você não pode seguir este usuário."; alvo inexistente, inativo ou bloqueado pela moderação: "Usuário não encontrado."; perfil privado direto pela API: "Este perfil é privado. Envie uma solicitação para seguir."; sem resposta do servidor: "Não foi possível concluir a ação."
- **Pós-condições:** cria ou apaga `usuarios_seguidos`; ao seguir, a pessoa seguida recebe "Você tem um novo seguidor" (deixar de seguir não notifica); os totais mudam; para perfil privado, seguir passa a dar acesso às publicações. Deixar de seguir um perfil privado funciona direto, e para voltar é preciso nova solicitação.
- **Regras de negócio:** o seguidor é sempre quem está logado (`SeguidorService.alternarUsuario`); os três tipos de conta podem seguir pessoas (o alvo pode ser candidato ou administrador); contas de empresa são seguidas pelo caminho de UC-G19.
- **Telas e endpoints:** `/perfil/:usuarioId`, `/descobrir`, `/notificacoes`; `POST /api/seguir/usuarios/:usuarioId` (alterna); `GET /api/seguir/resumo/:usuarioId`.

### UC-G17 — Pedir para seguir um perfil privado e cancelar o pedido
- **Ator:** candidato, empresa (aprovada) ou administrador. Ator secundário: dono do perfil privado.
- **Descrição:** enviar solicitação para seguir uma pessoa de perfil privado e, se quiser, cancelá-la.
- **Pré-condições:** o perfil-alvo é privado (UC-G35) e não há bloqueio.
- **Fluxo principal:**
  1. No perfil, o botão aparece como "Solicitar para seguir"; a pessoa clica.
  2. O Site responde "Solicitação enviada." e o botão vira "Solicitação enviada".
  3. Para desistir, clica no mesmo botão: "Solicitação cancelada."
- **Fluxos alternativos e exceções:** já segue: "Você já segue este usuário."; já há pedido pendente: "Você já tem uma solicitação pendente para este usuário."; bloqueio: "Você não pode seguir este usuário."; se o perfil virou público no meio-tempo, o servidor segue direto, sem pedido.
- **Pós-condições:** cria `solicitacoes_seguimento` com status pendente e notifica o dono do perfil ("Nova solicitação para seguir você"). Cancelar apaga o pedido (operação repetível), mas a notificação já enviada continua na central do destinatário.
- **Regras de negócio:** só pode haver um pedido pendente por par solicitante-destinatário; o acesso às publicações só vem com a aprovação (UC-G18); bloquear alguém (UC-G30) não apaga pedidos pendentes entre as duas contas.
- **Telas e endpoints:** `/perfil/:usuarioId`, `/descobrir`; `POST /api/seguir/solicitacoes/:destinatarioId`; `DELETE /api/seguir/solicitacoes/:destinatarioId`.

### UC-G18 — Aceitar ou recusar pedido para seguir
- **Ator:** candidato, empresa ou administrador que recebeu um pedido (na prática, donos de perfil de pessoa privado). Ator secundário: solicitante.
- **Descrição:** decidir um pedido de seguimento recebido.
- **Pré-condições:** existe pedido pendente e a notificação correspondente está na central.
- **Fluxo principal:**
  1. Em `/notificacoes`, no item "Nova solicitação para seguir você", clica em "Aceitar" ou "Recusar".
  2. Aceitar: o Site mostra "Solicitação aceita."; recusar: "Solicitação recusada." Os botões dão lugar ao texto do resultado.
- **Fluxos alternativos e exceções:** pedido cancelado ou já decidido: "Solicitação não encontrada ou já processada." (a lista é recarregada, mas os botões continuam no item, porque a tela não verifica se o pedido ainda existe; depois de recarregar a página, itens já decididos voltam a mostrar "Aceitar" e "Recusar" e dão o mesmo erro); sem resposta do servidor: "Não foi possível aceitar a solicitação." / "Não foi possível recusar a solicitação."
- **Pós-condições:** aceitar cria o vínculo solicitante→destinatário em `usuarios_seguidos` (sem seguir de volta) e notifica o solicitante ("Solicitação para seguir aceita"); recusar não cria vínculo e não avisa ninguém. Nos dois casos a solicitação é apagada e a notificação original é marcada como lida.
- **Regras de negócio:** só o destinatário decide; a decisão usa trava de linha para não processar o mesmo pedido duas vezes. Limitação: não existe tela de pedidos pendentes nem endpoint de listagem; se a notificação for removida, a decisão não pode mais ser tomada, e tornar o perfil público não aprova pedidos pendentes.
- **Telas e endpoints:** `/notificacoes`; `POST /api/seguir/solicitacoes/:solicitacaoId/aceitar`; `POST /api/seguir/solicitacoes/:solicitacaoId/recusar`.

### UC-G19 — Seguir e deixar de seguir uma empresa
- **Ator:** candidato (único tipo que consegue). Empresa e administrador veem o botão, mas a API recusa. Ator secundário: empresa seguida.
- **Descrição:** seguir uma empresa e acompanhar suas publicações e vagas.
- **Pré-condições:** sessão de candidato; empresa existente sem bloqueio.
- **Fluxo principal:**
  1. No perfil da empresa, clica em "Seguir"; em "Descobrir", o cartão da empresa tem o botão "Seguir".
  2. No perfil o botão vira "Seguindo" e o total de seguidores sobe; em "Descobrir" aparece "Agora você está seguindo <nome>." e o cartão sai da lista.
  3. Para deixar de seguir, clica em "Seguindo" no perfil da empresa.
- **Fluxos alternativos e exceções:** conta que não é de candidato: "Apenas candidatos podem seguir empresas."; empresa inexistente: "Empresa não encontrada."; bloqueio: "Você não pode seguir esta empresa."; sem resposta do servidor: "Não foi possível seguir esta empresa." (em Descobrir) ou "Não foi possível concluir a ação."
- **Pós-condições:** cria ou apaga `empresas_seguidas`; ao seguir, a empresa recebe "Novo seguidor" ("<nome> começou a seguir sua empresa."); o vínculo passa a aparecer em "Minha atividade".
- **Regras de negócio:** seguir empresa não tem solicitação nem aprovação (não depende da privacidade); as publicações de empresa são sempre visíveis, então seguir não é pré-requisito para vê-las (`SeguidorService.alternarEmpresa`); a API não confere o status de aprovação da empresa ao seguir.
- **Telas e endpoints:** `/perfil/:usuarioId` (empresa), `/descobrir`; `POST /api/seguir/empresas/:empresaId` (alterna); `GET /api/seguir/resumo/empresas/:empresaId`.

### UC-G20 — Descobrir pessoas e empresas para seguir
- **Ator:** candidato, empresa (aprovada) ou administrador (a seção de empresas aparece só para candidato).
- **Descrição:** ver sugestões de pessoas e empresas com o motivo de cada uma.
- **Pré-condições:** sessão ativa.
- **Fluxo principal:**
  1. Abre `/descobrir` pelo menu do perfil ou por "Ver mais sugestões" no feed.
  2. Na seção Pessoas, vê até 12 cartões com foto, nome, título, motivo e botão para seguir ou solicitar (o cartão continua na lista depois de seguir).
  3. Candidato vê também a seção Empresas (até 12 cartões, com setor, cidade, descrição, motivo e botão "Seguir").
  4. Clica no cartão para abrir o perfil ou segue direto (UC-G16, UC-G17, UC-G19).
- **Fluxos alternativos e exceções:** carregando; "Não foi possível carregar as sugestões." com "Tentar novamente"; vazio: "Sem sugestões de pessoas no momento. Interaja mais no feed para receber sugestões melhores." e, para empresas, "Sem sugestões de empresas no momento. Favorite vagas para receber sugestões melhores."
- **Pós-condições:** nenhuma alteração de dados.
- **Regras de negócio** (`SeguidorService`): pessoas sugeridas são só candidatos ativos e não bloqueados, sem você, sem quem você já segue e sem bloqueios (perfis privados e pedidos pendentes não são excluídos). Os motivos usam sinais não sensíveis (nunca deficiência): "Também está em <cidade>", "Atua como <título>", "Interage com publicações parecidas com as suas", "Seguido por pessoas que você segue" e, sem sinais, "Novo no ACESSO". Para empresas: "Você favoritou uma vaga desta empresa", "Também atua em <setor>", "Está em <cidade>", "Empresa verificada no ACESSO" ou "Empresa parceira do ACESSO"; os critérios por vaga favoritada, setor e cidade não filtram pelo status de aprovação (só o complemento "parceira/verificada" usa empresas aprovadas). Empresa e administrador não têm registro de candidato, então não recebem sugestões por cidade ou título. O máximo é 20 sugestões por chamada.
- **Telas e endpoints:** `/descobrir`, `/feed`; `GET /api/seguir/sugestoes?limit=`; `GET /api/seguir/sugestoes/empresas?limit=` (lista vazia se a conta não for de candidato).

### UC-G21 — Consultar minha atividade
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** ver um resumo privado de quem a pessoa segue e de suas interações no feed.
- **Pré-condições:** sessão ativa.
- **Fluxo principal:**
  1. Abre `/minha-atividade` pelo menu do perfil.
  2. Candidato vê também "Candidaturas recentes" e "Vagas favoritas" (descritas na seção do candidato).
  3. Todos veem: "Pessoas que você segue" (5 mais recentes e "Ver tudo", que abre o diálogo de UC-G15), "Empresas que você segue" (5 mais recentes) e "Suas interações no feed" com Curtidas, Comentários e Compartilhamentos (até 5 de cada, com total e link para a publicação; sem texto aparece "Publicação com anexo").
- **Fluxos alternativos e exceções:** carregando; erro "Não foi possível carregar sua atividade." com "Tentar novamente"; listas vazias com mensagem e link ("Ver o feed", "Explorar vagas"). Para empresa e administrador a lista de empresas seguidas é sempre vazia, porque só candidato segue empresas.
- **Pós-condições:** nenhuma alteração de dados.
- **Regras de negócio:** o escopo é sempre o usuário autenticado (a rota não recebe id); só entram publicações ativas; não guarda histórico de visualizações nem de buscas (`AtividadeService`).
- **Telas e endpoints:** `/minha-atividade`; `GET /api/atividade/minha`.

## Funções comuns: mensagens

### UC-G22 — Iniciar uma conversa
- **Ator:** candidato, empresa (aprovada) ou administrador. Ator secundário: destinatário.
- **Descrição:** abrir (ou reabrir) o chat 1:1 com outra conta.
- **Pré-condições:** sessão ativa; destinatário ativo e sem bloqueio.
- **Fluxo principal:**
  1. No perfil de outra pessoa ou empresa, o botão "Enviar mensagem" consulta antes se é permitido.
  2. A pessoa clica; o sistema abre ou recupera a conversa e leva a `/mensagens?conversaId=<id>`.
  3. Candidato também pode usar "Conversar com a empresa" na página da vaga (`/vaga/:vagaId`), que abre o chat com a conta da empresa dona da vaga (UC-C24) sem consulta prévia: se a regra recusar, o motivo aparece como aviso.
- **Fluxos alternativos e exceções:**
  - Não permitido: o botão fica visível, porém marcado como indisponível ("Mensagens indisponíveis") com o motivo em texto ao lado. Motivos: "Este usuário desativou o recebimento de novas mensagens.", "Apenas empresas podem iniciar conversas com este usuário.", "Você não pode iniciar uma conversa com este usuário porque ele permite novas mensagens apenas de seguidores.", "Este usuário só aceita novas mensagens de pessoas que ele segue.", "Este usuário só aceita novas mensagens de seguidores mútuos.", "Não é possível iniciar esta conversa." (bloqueio, sem revelar quem bloqueou), "Usuário não encontrado." e "Você não pode iniciar uma conversa consigo mesmo."
  - Se a consulta falhar, o botão fica liberado e o servidor decide no clique; falha ao abrir: mensagem do servidor ou "Não foi possível abrir a conversa."
- **Pós-condições:** cria `conversas` entre as duas contas, se ainda não existia (uma por par); a conversa nova entra no topo da lista mesmo sem mensagens. Nenhuma notificação é enviada nessa etapa.
- **Regras de negócio** (`ConversaService.podeIniciarConversa`): a preferência do destinatário (UC-G36) vale só para conversa **nova**; conversa existente reabre sem reavaliar a preferência, mas o bloqueio vale sempre. Por opção do destinatário: "Todos" libera qualquer conta; "Ninguém" recusa todas, inclusive empresa e administrador; "Apenas empresas" exige remetente de conta de empresa (candidato e administrador são recusados); "Apenas seguidores" exige que quem inicia siga o destinatário; "Apenas pessoas que você segue" exige que o destinatário siga quem inicia; "Apenas seguidores que você também segue" exige os dois. "Seguir" entre pessoas é o vínculo de UC-G16; quando o seguido é uma empresa, é o vínculo candidato→empresa de UC-G19, que só candidato tem; assim, empresa ou administrador nunca satisfazem "seguidores" de um destinatário que é empresa. Perfil público ou privado não entra na conta (seguidor aprovado é uma linha em `usuarios_seguidos`). O administrador segue as mesmas regras. Empresa não aprovada não usa mensagens.
- **Telas e endpoints:** `/perfil/:usuarioId`, `/vaga/:vagaId`, `/mensagens`; `GET /api/conversas/pode-iniciar/:usuarioId`; `POST /api/conversas` (corpo `usuarioId`).

### UC-G23 — Consultar conversas e mensagens não lidas
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** ver a lista de conversas, abrir uma e acompanhar o que ainda não foi lido.
- **Pré-condições:** sessão ativa.
- **Fluxo principal:**
  1. Abre `/mensagens` (menu "Mensagens", notificação ou botão de UC-G22).
  2. A lista mostra até 50 conversas, da mais recente para a mais antiga, com foto (ou logo), nome (empresa mostra nome fantasia), prévia da última mensagem, hora (ou dia e mês) e selo com a quantidade de não lidas.
  3. Pode filtrar pelo nome no campo "Buscar conversas…" (filtro local, só entre as carregadas).
  4. Ao abrir uma conversa, o Site carrega as mensagens, entra na sala em tempo real e marca como lidas as recebidas.
- **Fluxos alternativos e exceções:** lista vazia: "Você ainda não tem conversas. Candidate-se a uma vaga para começar a conversar com empresas." (texto único para qualquer tipo de conta); "Nenhuma conversa encontrada para essa busca."; erro de carga com "Tente novamente em instantes."; conversa com conta excluída: nome "Usuário removido", histórico visível e envio bloqueado ("Esta conversa não permite novas mensagens porque o outro usuário foi removido.").
- **Pós-condições:** marca como lidas (`lida = verdadeiro`) as mensagens recebidas da conversa aberta e emite `mensagem:lida` à sala; o selo do cabeçalho é recalculado.
- **Regras de negócio:** só os dois participantes leem a conversa (nem o administrador lê conversa alheia; só vê uma mensagem denunciada pelo painel, com auditoria, UC-A17). Limitação: o Site carrega apenas a primeira página de 100 mensagens (as mais antigas, em ordem cronológica), sem paginação; numa conversa com mais de 100 mensagens as mais novas não aparecem na tela. Conversas de alguém bloqueado continuam na lista e legíveis, mas sem envio (UC-G30).
- **Telas e endpoints:** `/mensagens`; `GET /api/conversas?limit=50`; `GET /api/conversas/:conversaId/mensagens?limit=100`; `PATCH /api/conversas/:conversaId/mensagens/lidas`; `GET /api/conversas/nao-lidas`.

### UC-G24 — Enviar e receber mensagens em tempo real
- **Ator:** candidato, empresa (aprovada) ou administrador. Ator secundário: interlocutor.
- **Descrição:** trocar mensagens de texto dentro de uma conversa.
- **Pré-condições:** conversa aberta em `/mensagens`.
- **Fluxo principal:**
  1. Escreve em "Escreva uma mensagem…"; a tecla Enter envia e Shift+Enter quebra a linha (ou clica no botão de enviar). O campo é limpo na hora do envio.
  2. A mensagem aparece na conversa com a hora e um tique (enviada; dois tiques quando lida).
  3. O interlocutor recebe na hora, sem recarregar; se estiver com a conversa aberta, ela é marcada como lida de imediato.
  4. Enquanto alguém digita, o outro lado vê "digitando…" (some após cerca de 3 segundos sem novo sinal).
- **Fluxos alternativos e exceções:**
  - Texto vazio não envia; acima de 2000 caracteres (o campo não limita no Site): "A mensagem deve ter entre 1 e 2000 caracteres."
  - Bloqueio posterior à conversa: "Não é possível enviar mensagens nesta conversa."; quem não participa: "Você não participa desta conversa."
  - Falha: mensagem do servidor ou "Não foi possível enviar a mensagem." Como o campo já foi limpo, o texto digitado se perde.
  - Sem conexão em tempo real, o envio e a leitura funcionam por requisição, mas sem atualização automática.
  - O Site não escuta o evento de leitura; o segundo tique aparece quando a lista de mensagens é recarregada.
- **Pós-condições:** grava `mensagens` e atualiza prévia e data da conversa; cada mensagem gera uma notificação ao destinatário ("Nova mensagem recebida", com `<nome>: <prévia de 120 caracteres>`), sem agrupar; emite `mensagem:nova` (sala da conversa e sala privada do destinatário) e `conversa:atualizada`; o selo de mensagens do destinatário sobe.
- **Regras de negócio:** só texto (sem anexos, sem edição, sem exclusão); mensagens da outra pessoa têm menu "⋮" com "Denunciar mensagem" (UC-G29); a sala da conversa só aceita os dois participantes (conferido no banco a cada entrada); o aviso "digitando…" só é repassado para quem já está na sala (`realtime/socket.js`).
- **Telas e endpoints:** `/mensagens`; `POST /api/conversas/:conversaId/mensagens` (corpo `conteudo`); Socket.IO `conversa:entrar`, `conversa:sair`, `mensagem:digitando`, `mensagem:nova`.

## Funções comuns: notificações

### UC-G25 — Consultar notificações e abrir o conteúdo relacionado
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** ler a central de notificações e ir ao conteúdo de cada aviso.
- **Pré-condições:** sessão ativa.
- **Fluxo principal:**
  1. Abre `/notificacoes` pelo item "Notificações" do cabeçalho.
  2. Vê o resumo ("N não lidas" ou "Nenhuma notificação não lida.", contadas entre os itens listados) e as 30 notificações mais recentes, com foto de quem agiu (ou ícone), título, texto, tempo relativo e estado lida ou não lida.
  3. Clica num item; o Site abre o conteúdo (publicação, vaga, conversa ou perfil) e marca o item como lido.
  4. Em "Você tem um novo seguidor" aparece o botão de seguir de volta (UC-G16); em pedidos de seguimento, "Aceitar" e "Recusar" (UC-G18).
- **Fluxos alternativos e exceções:** carregando; erro "Não foi possível carregar suas notificações." com "Tentar novamente"; vazio "Você ainda não tem notificações."; itens sem destino (por exemplo, avisos de conta) não são clicáveis; não há paginação (só as 30 mais recentes).
- **Pós-condições:** abrir um item marca como lido.
- **Regras de negócio:** o texto fica gravado em português e é traduzido na saída para o idioma da conta do destinatário (`notificacaoNoIdioma`). Tipos emitidos pelo backend: curtida, comentário e resposta a comentário, compartilhamento, novo seguidor (pessoa ou empresa), pedido de seguimento e pedido aceito, mensagem nova, candidatura recebida ou atualizada (candidato e empresa), remoção de publicação ou comentário pela moderação, vaga ocultada ou reexibida, empresa aprovada, reprovada, suspensa ou reativada, denúncia analisada, conta bloqueada ou reativada, e-mail confirmado, senha alterada e e-mail alterado.
- **Telas e endpoints:** `/notificacoes`; `GET /api/notificacoes?limit=30`; `GET /api/notificacoes/nao-lidas`.

### UC-G26 — Marcar notificações como lidas e removê-las
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** controlar o que já foi lido e limpar a central.
- **Pré-condições:** existir notificação na lista.
- **Fluxo principal:**
  1. No item, clica no ícone de marcar como lida (`Marcar "<título>" como lida`, só aparece nas não lidas) ou na lixeira (`Remover "<título>"`).
  2. Para tudo de uma vez, clica em "Marcar todas como lidas": "Todas as notificações foram marcadas como lidas."
  3. Remover mostra "Notificação removida."
- **Fluxos alternativos e exceções:** notificação inexistente ou de outra conta: "Notificação não encontrada."; erros mostram a mensagem do servidor. "Marcar todas como lidas" fica desabilitado quando não há não lidas entre as 30 listadas, mesmo que existam não lidas mais antigas.
- **Pós-condições:** `lida = verdadeiro` (um item ou todos) ou exclusão definitiva do registro; o selo do cabeçalho é recalculado.
- **Regras de negócio:** tudo é escopado ao usuário autenticado; remover apaga de fato o registro.
- **Telas e endpoints:** `/notificacoes`; `PATCH /api/notificacoes/:id/lida`; `PATCH /api/notificacoes/lidas`; `DELETE /api/notificacoes/:id`.

### UC-G27 — Receber notificações em tempo real
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** ver novas notificações e contadores atualizados sem recarregar a página.
- **Pré-condições:** sessão ativa e conexão Socket.IO aberta.
- **Fluxo principal:**
  1. Quando alguém age (curtida, mensagem, seguidor etc.), o servidor emite `notificacao:nova` para a sala privada do destinatário.
  2. O Site atualiza o selo de Notificações e, se a tela estiver aberta, a lista; novas mensagens somam no selo de Mensagens (`mensagem:nova`).
- **Fluxos alternativos e exceções:**
  - O token é relido antes de cada reconexão (até 5 tentativas).
  - Conta bloqueada pela moderação: o Site desconecta e encerra a sessão com a mensagem do motivo (UC-G46).
  - Senha trocada: o servidor recusa o socket com o código `SENHA_ALTERADA`; o Site só trata esse caso como falha de conexão (a sessão já terminou pela troca de senha).
  - Sem conexão, os selos só mudam ao recarregar ou navegar.
- **Pós-condições:** nenhuma alteração de dados no Site; o push nativo é exclusivo do app Android (fora desta seção).
- **Regras de negócio:** o handshake exige JWT válido emitido depois da última troca de senha, usuário ativo e não bloqueado; cada pessoa só entra na própria sala; a notificação em tempo real sai no idioma da conta de quem recebe (`realtime/socket.js`, `NotificacaoService.entregar`).
- **Telas e endpoints:** qualquer tela autenticada (cabeçalho), `/notificacoes`; Socket.IO `notificacao:nova`, `mensagem:nova`.

### UC-G28 — Definir preferências de notificação
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** escolher quais categorias de aviso a conta quer receber.
- **Pré-condições:** sessão ativa.
- **Fluxo principal:**
  1. Abre `/configuracoes/notificacoes` (Configurações → Notificações).
  2. Liga ou desliga os interruptores "Vagas e candidaturas", "Mensagens" e "Publicações e comentários" (todos ligados por padrão).
  3. Cada mudança é salva na hora; a tela avisa que "Avisos importantes da sua conta continuam sendo enviados mesmo com tudo desligado."
- **Fluxos alternativos e exceções:** erro ao carregar: "Não foi possível carregar suas preferências." com "Tentar novamente"; erro ao salvar: mensagem do servidor ou "Não foi possível salvar a preferência." (a mudança volta ao valor anterior).
- **Pós-condições:** grava `preferencias_notificacao` (uma linha por conta, criada na primeira consulta) com os campos `vagasCandidaturas`, `mensagens`, `publicacoesComentarios` (e `redeSeguidores`, que a API aceita, mas o Site não exibe).
- **Regras de negócio:** limitação verificada no código atual: a checagem que deveria impedir a criação das notificações (`notificacaoPermitida`, em `NotificacaoService.js`) procura os tipos com inicial maiúscula ("Vaga", "Candidatura", "Mensagem", "Feed"), mas as notificações são gravadas com tipo minúsculo ("vaga", "candidatura", "mensagem", "feed"). Assim a chave nunca é encontrada e nenhuma notificação é bloqueada: a preferência é gravada e devolvida, porém não tem efeito. Notificações do tipo "sistema" e "moderacao" nunca seriam filtradas.
- **Telas e endpoints:** `/configuracoes/notificacoes`; `GET /api/notificacoes/preferencias`; `PUT /api/notificacoes/preferencias`.

## Funções comuns: moderação e bloqueio

### UC-G29 — Denunciar conteúdo ou conta
- **Ator:** candidato, empresa (aprovada ou não, na API) ou administrador. Ator secundário: administrador (que analisa a denúncia no painel).
- **Descrição:** enviar à moderação uma denúncia de postagem, comentário, mensagem, vaga, pessoa ou empresa.
- **Pré-condições:** sessão ativa; não ser o dono do que é denunciado.
- **Fluxo principal:**
  1. Abre a opção "Denunciar": no menu "⋮" da publicação de outra pessoa, no link "Denunciar" de um comentário alheio, em "Denunciar mensagem" no menu da mensagem recebida, em "Denunciar usuário" ou "Denunciar empresa" no menu "⋮" do perfil, ou em "Denunciar vaga" no menu "Mais opções da vaga" (quando não é dono da vaga).
  2. No diálogo `Denunciar "<nome>"` escolhe o motivo (Spam, Conteúdo ofensivo, Discurso de ódio, Assédio, Fraude, Informação falsa, Conteúdo inadequado ou Outro) e, opcionalmente, descreve (até 1000 caracteres).
  3. Clica em "Enviar denúncia" (desabilitado sem motivo). O Site mostra "Denúncia enviada. Nossa equipe vai analisar."
  4. Para postagem, comentário, mensagem e vaga, o mesmo diálogo oferece "Bloquear <nome>?" (autor ou empresa); a pessoa escolhe "Bloquear" (UC-G30) ou "Não, obrigado".
- **Fluxos alternativos e exceções:** denunciar o próprio conteúdo: "Você não pode denunciar seu próprio conteúdo."; denúncia igual ainda em análise: "Você já denunciou isso e a denúncia ainda está em análise." (depois de encerrada pode denunciar de novo); mensagem de conversa de que não participa: "Você não participa desta conversa."; alvo inexistente: "Postagem não encontrada." e equivalentes; limite de 10 denúncias por hora por pessoa: "Você atingiu o limite de denúncias por hora. Tente novamente mais tarde."; sem resposta do servidor: "Não foi possível enviar a denúncia."
- **Pós-condições (o que acontece depois):**
  - Grava `denuncias` com status pendente (motivo, descrição, denunciante). Nada acontece automaticamente com o denunciado: não há punição, bloqueio ou ocultação por si só, e ele não é avisado da denúncia.
  - Na fila do painel (UC-A15 e UC-A16) o administrador pode atribuir (em análise, UC-A18), resolver (UC-A19, com ação opcional: bloquear conta, remover publicação ou comentário, ocultar vaga ou suspender empresa; denúncia de mensagem não tem ação automática e o administrador só vê a mensagem com até 3 antes e 3 depois, com auditoria, UC-A17), rejeitar (UC-A20) ou arquivar (UC-A21). Cada ação do administrador gera registro de auditoria; a ação de moderação escolhida notifica o denunciado pelo caminho próprio (conta bloqueada, publicação ou comentário removido, vaga ocultada, empresa suspensa).
  - Quem denunciou recebe a notificação "Denúncia analisada" apenas quando a denúncia é resolvida ("uma ação foi tomada pela nossa equipe") ou rejeitada ("não identificamos violação das diretrizes da comunidade"); arquivar não avisa; nenhum e-mail é enviado. Não existe tela para acompanhar as próprias denúncias.
  - Excluir a conta denunciada arquiva as denúncias abertas feitas contra a própria conta (ou empresa); denúncias abertas sobre publicações, comentários, vagas e mensagens dela continuam na fila, apontando para conteúdo que já não existe.
- **Regras de negócio:** `DenunciaService`: a unicidade vale só para denúncias abertas (pendente ou em análise) do mesmo autor sobre a mesma coisa (índice parcial no banco); o aviso "Denúncias falsas ou repetidas podem limitar o seu acesso a esta função" é só texto, pois o código não aplica punição automática (o único freio é o limite por hora, por conta); qualquer conta autenticada pode denunciar, inclusive o administrador e a empresa não aprovada (a rota não confere aprovação); a API não verifica se quem denuncia tem acesso à publicação ou ao comentário, só se eles existem.
- **Telas e endpoints:** `/feed`, `/postagem/:postagemId`, `/perfil/:usuarioId`, `/mensagens`, `/vaga/:vagaId`; `POST /api/denuncias` (corpo `entidadeTipo`, `entidadeId`, `motivo`, `descricao`).

### UC-G30 — Bloquear uma pessoa ou empresa
- **Ator:** candidato, empresa (aprovada) ou administrador. Ator secundário: pessoa ou empresa bloqueada.
- **Descrição:** impedir contato e visibilidade mútua com outra conta.
- **Pré-condições:** sessão ativa.
- **Fluxo principal:**
  1. No perfil de terceiro, abre o menu "⋮" e escolhe "Bloquear usuário" (ou aceita "Bloquear" na oferta depois de denunciar, UC-G29).
  2. O diálogo "Bloquear <nome>?" explica o efeito; confirma em "Bloquear".
  3. O Site mostra "<nome> foi bloqueado(a)." e volta ao `/feed`.
- **Fluxos alternativos e exceções:** bloquear a si mesmo: "Você não pode bloquear a si mesmo."; alvo inexistente: "Usuário não encontrado."; sem resposta do servidor: "Não foi possível bloquear este usuário."; bloquear de novo é inofensivo (já existe).
- **Pós-condições:** cria `usuarios_bloqueados`; apaga automaticamente, nos dois sentidos, os vínculos de seguir entre as duas contas (inclusive empresa seguida por candidato), sem notificar ninguém. A outra parte não é avisada. Pedidos de seguimento pendentes e conversas existentes não são apagados.
- **Regras de negócio** (`BloqueioService`): o efeito vale nos dois sentidos: ninguém vê o perfil do outro ("Este perfil não está disponível."), as publicações do outro somem do feed, da busca e das sugestões (publicação aberta por link: "Esta publicação não está disponível."), não se pode seguir ("Você não pode seguir este usuário.") nem iniciar conversa; uma conversa que já existia continua listada, mas deixa de aceitar mensagens ("Não é possível enviar mensagens nesta conversa."). Limitações: comentários do bloqueado continuam visíveis em publicações de terceiros; o administrador não é afetado pelo bloqueio na visibilidade (vê tudo), embora a regra de iniciar conversa valha também para ele. O alvo pode ser qualquer tipo de conta, inclusive administrador.
- **Telas e endpoints:** `/perfil/:usuarioId`; `POST /api/usuarios/:usuarioId/bloquear`.

### UC-G31 — Consultar bloqueados e desbloquear
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** ver quem a conta bloqueou e desfazer bloqueios.
- **Pré-condições:** sessão ativa.
- **Fluxo principal:**
  1. Abre `/configuracoes/bloqueados` (Configurações → Privacidade → Usuários bloqueados).
  2. Vê até 50 contas bloqueadas, com foto e nome (sem paginação).
  3. Clica em "Desbloquear" ao lado do nome; aparece "<nome> foi desbloqueado(a)."
- **Fluxos alternativos e exceções:** vazio: "Você não bloqueou ninguém."; erro ao carregar: "Não foi possível carregar sua lista de bloqueados." com "Tentar novamente"; falha ao desbloquear: mensagem do servidor ou "Não foi possível desbloquear este usuário."
- **Pós-condições:** apaga o bloqueio criado por esta conta; não restaura seguidores nem seguidos que foram desfeitos no bloqueio.
- **Regras de negócio:** a lista mostra só quem **esta** conta bloqueou, nunca quem a bloqueou; se a outra pessoa também tiver bloqueado, o bloqueio dela continua valendo; desbloquear é idempotente.
- **Telas e endpoints:** `/configuracoes/bloqueados`; `GET /api/usuarios/bloqueados`; `DELETE /api/usuarios/:usuarioId/bloquear`.

## Funções comuns: configurações da conta

### UC-G32 — Consultar e editar os dados da conta
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** ver os dados básicos da conta e editar o que a tela permite.
- **Pré-condições:** sessão ativa.
- **Fluxo principal:**
  1. Abre `/configuracoes/conta` (Configurações → Conta → Meus dados e perfil).
  2. A tela mostra Nome, Tipo de conta (Pessoa candidata, Empresa ou Administrador), "Conta criada em" e "Último acesso"; o e-mail aparece na seção "E-mail" (UC-G33).
  3. Candidato: "Editar nome, telefone e localidade" abre o diálogo "Editar perfil" (banner, foto, nome, telefone e dados de candidato, UC-C06); empresa: "Editar dados da empresa" (logo, banner, razão social, nome fantasia e outros dados institucionais, UC-E22).
  4. Administrador: não há botão nessa tela, mas em `/perfil` o botão "Editar perfil" abre o mesmo diálogo, com banner, foto, nome e telefone.
  5. Foto e banner são enviados assim que o arquivo é escolhido ("Foto atualizada.", "Capa atualizada."; "Remover banner" apaga o banner); nome e telefone seguem ao clicar em "Salvar", com o aviso "Perfil atualizado."
- **Fluxos alternativos e exceções:** nome fora de 3 a 150 caracteres: "Informe um nome entre 3 e 150 caracteres."; telefone fora de 10 a 20 caracteres: "Informe um telefone válido."; foto ou banner em formato diferente de PNG, JPEG e WEBP: "Formato inválido. Envie uma imagem PNG, JPEG ou WEBP."; acima de 5 MB (conferido no Site antes do envio): "Imagem muito grande. O tamanho máximo permitido é 5 MB."; erro geral: mensagem do servidor ou "Não foi possível atualizar o perfil."; dados da empresa exigem empresa aprovada. O e-mail não muda aqui (UC-G33).
- **Pós-condições:** atualiza `usuarios` (nome, telefone, foto, capa) e a sessão local; o nome da conta de empresa não é editável pela tela (só os dados da empresa).
- **Regras de negócio:** a rota recusa e-mail, senha, tipo e ativo ("Campo não pode ser alterado por esta rota."); só o dono ou o administrador altera uma conta (`UsuarioService.atualizar`); o upload de foto e capa confere o dono antes de enviar o arquivo.
- **Telas e endpoints:** `/configuracoes/conta`, `/perfil`; `PUT /api/usuarios/:id`; `PATCH /api/usuarios/:id/foto`; `PATCH /api/usuarios/:id/capa`; `PUT /api/empresas/:id` (empresa).

### UC-G33 — Trocar o e-mail
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** mudar o e-mail de acesso, confirmando o novo endereço com um código.
- **Pré-condições:** sessão ativa; saber a senha atual.
- **Fluxo principal:**
  1. Em `/configuracoes/conta`, na seção "E-mail", vê o e-mail atual e clica em "Alterar e-mail".
  2. No diálogo informa "Senha atual" e "Novo e-mail" e clica em "Enviar código": "Código enviado para o novo e-mail."
  3. O diálogo passa para a confirmação; digita o código de 6 dígitos e clica em "Confirmar".
  4. O Site mostra "E-mail atualizado com sucesso." e passa a exibir o novo endereço.
- **Fluxos alternativos e exceções:**
  - Senha incorreta: "Senha atual incorreta."
  - Mesmo e-mail: "Este já é o seu e-mail atual."; e-mail já usado por outra conta: "Este e-mail já está cadastrado." (conferido de novo na confirmação); formato inválido ("Informe um endereço de e-mail válido.") ou acima de 150 caracteres.
  - Código errado ou vencido: "Código inválido ou expirado." (campo limpo); depois de 5 erros, a tentativa seguinte devolve "Número de tentativas excedido. Solicite um novo código." e o código é inutilizado. Sem mensagem do servidor, o Site mostra "Código inválido. Tente novamente."
  - "Voltar" retorna à primeira etapa; pedir outro código invalida os anteriores.
  - Limite de 10 requisições com erro em 15 minutos por IP (contador compartilhado, ver regras gerais): "Muitas tentativas de autenticação. Tente novamente mais tarde."
- **Pós-condições:** guarda o código (só o hash), válido por 15 minutos, e envia o e-mail de confirmação ao **novo** endereço. Ao confirmar, troca o e-mail da conta (o login passa a ser o novo), marca o código como usado e cria a notificação "E-mail alterado". As sessões abertas continuam; não há aviso ao e-mail antigo.
- **Regras de negócio:** `AutenticacaoService.solicitarTrocaEmail` e `confirmarTrocaEmail`. O validador normaliza o endereço antes de gravar (minúsculas e, em endereços do Gmail, remove pontos e o trecho depois de "+"), enquanto o login só converte para minúsculas e tira espaços; quem digita no login o e-mail com os pontos ou o "+" originais pode não conseguir entrar. Sem provedor de e-mail configurado, o código não é enviado: fora de produção ele aparece só no log do servidor. Se o envio falhar, o erro vai só para o log e o Site mostra mesmo assim "Código enviado para o novo e-mail."
- **Telas e endpoints:** `/configuracoes/conta`; `POST /api/auth/email/solicitar` (`senhaAtual`, `novoEmail`); `POST /api/auth/email/confirmar` (`codigo`).

### UC-G34 — Alterar a senha
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** trocar a senha de acesso informando a senha atual.
- **Pré-condições:** sessão ativa.
- **Fluxo principal:**
  1. Em `/configuracoes/conta`, clica em "Alterar senha" e abre `/configuracoes/senha`.
  2. Preenche "Senha atual", "Nova senha" (dica: "Mínimo de 8 caracteres, com maiúscula, minúscula, número e símbolo.") e "Confirmar nova senha".
  3. Clica em "Salvar nova senha".
  4. O sistema troca a senha e encerra as sessões; o Site tenta sair da conta e leva a `/entrar`, com a intenção de mostrar "Senha alterada com sucesso. Entre novamente com a nova senha."
- **Fluxos alternativos e exceções:** senha atual vazia: "Informe sua senha atual."; confirmação diferente da nova senha: "As senhas não coincidem."; nova senha fora de 8 a 72 caracteres ou sem minúscula, maiúscula, número ou caractere especial (mensagens do Site e do servidor); senha atual errada: "Senha atual incorreta." (mostrada no campo e como aviso); falha geral: "Não foi possível alterar a senha." Esta rota não tem o limite de tentativas de UC-G33.
  - Pelo código, a chamada de saída que o Site faz em seguida é recusada (401 "Sua senha foi alterada. Entre novamente."), porque a troca já invalidou o token de acesso; a sessão local é encerrada e a pessoa vai para `/entrar`, mas o aviso exibido pode ser essa mensagem de erro, no campo "Senha atual" e como aviso, em vez do texto de sucesso.
- **Pós-condições:** grava o novo hash (bcrypt) e `senha_alterada_em`, o que invalida todos os tokens de acesso emitidos antes; revoga todas as sessões da conta (inclusive a atual) e remove os tokens de push; cria a notificação "Senha alterada" ("Se não foi você, contate o suporte imediatamente.") e envia e-mail de aviso se houver provedor configurado; as conexões em tempo real caem.
- **Regras de negócio:** o texto explicativo da tela diz que a pessoa "continua conectada aqui", mas o código desconecta todos os aparelhos, inclusive o atual (`AutenticacaoService.alterarSenha`); a mesma regra de senha vale no cadastro e na redefinição.
- **Telas e endpoints:** `/configuracoes/conta`, `/configuracoes/senha`, `/entrar`; `PATCH /api/auth/senha` (`senhaAtual`, `novaSenha`).

### UC-G35 — Definir se o perfil é público ou privado
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** escolher entre perfil público (padrão) e privado.
- **Pré-condições:** sessão ativa.
- **Fluxo principal:**
  1. Abre `/configuracoes/privacidade` (Configurações → Privacidade).
  2. Liga ou desliga "Perfil público".
  3. O Site avisa "Seu perfil agora é público." ou "Seu perfil agora é privado."
- **Fluxos alternativos e exceções:** falha: mensagem do servidor ou "Não foi possível salvar a preferência."; o valor enviado precisa ser verdadeiro ou falso ("Informe se o perfil é público (true/false).").
- **Pós-condições:** grava `usuarios.perfil_publico`. Seguidores já existentes são mantidos; pedidos pendentes não são aprovados automaticamente.
- **Regras de negócio** (efeito real): para candidato e administrador, perfil privado esconde só as publicações (feed, linha do tempo, compartilhamentos, busca, comentários e anexos exigem ser o dono, administrador ou seguidor aprovado); nome, foto, dados profissionais, totais e as listas de seguidores e seguindo continuam visíveis. Quem não segue vê "Solicitar para seguir" (UC-G17) e o dono decide em UC-G18. Para empresa, as publicações continuam sempre visíveis, mas com "Perfil público" desligado o perfil empresarial deixa de abrir para terceiros ("Este perfil não está disponível." na API; o Site cai no perfil genérico, UC-G14); a empresa continua aparecendo na busca. A frase da tela ("Seu nome, foto e informações do perfil continuam visíveis...") vale para pessoas, não para empresas. Para o candidato, é o mesmo interruptor citado em UC-C27.
- **Telas e endpoints:** `/configuracoes/privacidade`; `PUT /api/usuarios/privacidade` (corpo `perfilPublico`).

### UC-G36 — Definir quem pode iniciar conversa comigo
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** controlar quem pode abrir uma conversa **nova** com a conta.
- **Pré-condições:** sessão ativa.
- **Fluxo principal:**
  1. Em `/configuracoes/privacidade`, na seção Mensagens, abre a lista "Quem pode enviar novas mensagens para você?".
  2. Escolhe uma das opções: Todos (padrão), Apenas seguidores, Apenas pessoas que você segue, Apenas seguidores que você também segue, Apenas empresas ou Ninguém.
  3. O Site avisa "Preferência de mensagens atualizada."
- **Fluxos alternativos e exceções:** falha: mensagem do servidor ou "Não foi possível salvar a preferência."; valor fora das seis opções é recusado pela API ("Opção de privacidade de mensagens inválida.").
- **Pós-condições:** grava `usuarios.preferencia_mensagens`.
- **Regras de negócio:** a configuração só afeta conversas novas (conversas existentes seguem); bloqueados nunca iniciam conversa, seja qual for a opção; a decisão final fica em `ConversaService.podeIniciarConversa`, detalhada em UC-G22 (inclui o que "seguir" significa quando o destinatário é empresa).
- **Telas e endpoints:** `/configuracoes/privacidade`; `PUT /api/usuarios/privacidade/mensagens` (corpo `preferenciaMensagens`).

### UC-G37 — Consultar sessões ativas e encerrá-las
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** ver onde a conta está conectada e encerrar sessões.
- **Pré-condições:** sessão ativa.
- **Fluxo principal:**
  1. Abre `/configuracoes/seguranca` (Configurações → Conta → Sessões ativas).
  2. Cada sessão mostra navegador e sistema (extraídos do user-agent; "Dispositivo desconhecido" se faltar), "Ativa desde <data e hora>", o IP e o selo "Esta sessão" na atual.
  3. Clica em "Encerrar" numa sessão: "Sessão encerrada."
  4. Ou clica em "Encerrar as outras" (só aparece se houver outras), confirma o aviso e vê "As outras sessões foram encerradas."
- **Fluxos alternativos e exceções:** carregando; erro "Não foi possível carregar suas sessões." com "Tentar novamente"; "Nenhuma sessão ativa encontrada."; "Nenhuma outra sessão ativa além desta."; falhas: mensagem do servidor ou "Não foi possível encerrar a sessão." / "Não foi possível encerrar as outras sessões."; sessão já encerrada ou de outra conta: "Sessão não encontrada."
- **Pós-condições:** marca `revogada_em` nas sessões encerradas; a sessão atual nunca é encerrada por esta tela.
- **Regras de negócio:** cada sessão é um refresh token (válido por 30 dias, só o hash fica guardado); a cada renovação do token de acesso o servidor troca o refresh token por um novo registro, então a data de "Ativa desde" é a da última renovação, não a do login; o aparelho encerrado perde o acesso quando precisar renovar o token de acesso, já que um token de acesso emitido continua válido até expirar (30 minutos por padrão) (`SessaoService`).
- **Telas e endpoints:** `/configuracoes/seguranca`; `POST /api/auth/sessoes` (corpo `refreshToken`); `DELETE /api/auth/sessoes/:id`; `POST /api/auth/sessoes/encerrar-outras`.

### UC-G38 — Ajustar e salvar preferências de acessibilidade
- **Ator:** candidato, empresa (aprovada) ou administrador (a tela também abre sem login, só com salvamento no aparelho; visitante: UC-V29 a UC-V34).
- **Descrição:** personalizar o Site com pré-visualização imediata e guardar as escolhas na conta.
- **Pré-condições:** nenhuma para ajustar; sessão ativa para salvar na conta.
- **Fluxo principal:**
  1. Abre `/configuracoes/acessibilidade` (menu do perfil, Configurações ou rodapé; também aparece em `/boas-vindas`).
  2. Ajusta qualquer opção e vê o efeito na hora, com uma amostra de pré-visualização: Visual (Alto contraste, Modo escuro, Fonte para dislexia, Tamanho da fonte de 87,5% a 160%, Espaçamento entre letras de 0 a 0,16 em, Espaçamento entre linhas de 1,3 a 2,4); Navegação (Cursor ampliado, Reduzir animações, Destaque de foco do teclado); Assistivos (Leitura por voz, Velocidade da voz de 0,6x a 1,8x, VLibras).
  3. Clica em "Salvar preferências": com sessão aparece "Preferências de acessibilidade salvas na sua conta."; sem sessão, "...salvas neste dispositivo."
  4. "Descartar alterações" volta ao último estado salvo (só habilitado se houve mudança). "Redefinir tudo" restaura o padrão e faz a pergunta de voz voltar (UC-G39): "Preferências redefinidas. A pergunta sobre voz será feita novamente."
- **Fluxos alternativos e exceções:** falha ao salvar na conta: mensagem do servidor ou "Não foi possível salvar na sua conta. Ficou salvo neste dispositivo."; falha ao redefinir na conta: "Não foi possível redefinir na sua conta." (o aviso de redefinição aparece mesmo assim).
- **Pós-condições:** grava no navegador (`localStorage`, `acesso:a11y-prefs`) e, com sessão, em `preferencias_acessibilidade` (uma linha por conta): tema (o Site envia só "claro" ou "escuro", conforme o modo escuro), alto contraste, fonte para dislexia, escala da fonte (80 a 200%), espaçamento (apenas um indicador verdadeiro ou falso: espaço entre letras maior que 0 ou entre linhas maior que 1,6), animações reduzidas, leitura por voz, consentimento de voz, velocidade da voz (0,5 a 2), VLibras e destaque de foco. "Redefinir tudo" grava na conta tema "sistema", VLibras e destaque de foco ligados, escala 100 e consentimento de voz nulo.
- **Regras de negócio:** as preferências da conta são trazidas para o navegador no login e ao abrir esta tela, sobrescrevendo as locais (reabrir ou recarregar o Site não as busca de novo). O cursor ampliado e os valores exatos de espaçamento ficam só no navegador (a conta guarda apenas o indicador de espaçamento, e o Site não o aplica de volta em outro aparelho); a coluna `linguagem_simplificada` existe na conta e na API, mas o Site não a usa; o VLibras é o widget oficial do Governo Federal, carregado de `vlibras.gov.br` e ligado por padrão; "Navegação por teclado" não tem interruptor porque o Site já é todo operável por teclado; a leitura por voz usa a síntese de voz do próprio navegador, no idioma do Site, lendo o elemento em foco ou clicado, diálogos e avisos (`useLeituraAutomatica`).
- **Telas e endpoints:** `/configuracoes/acessibilidade`, `/boas-vindas`; `GET /api/acessibilidade`; `PUT /api/acessibilidade`; `POST /api/acessibilidade/reset`.

### UC-G39 — Responder ao consentimento de leitura por voz
- **Ator:** candidato, empresa (aprovada) ou administrador (visitante: UC-V31).
- **Descrição:** responder à pergunta de primeiro acesso sobre a leitura por voz.
- **Pré-condições:** o navegador oferece síntese de voz e a conta ainda não respondeu (consentimento nulo).
- **Fluxo principal:**
  1. Cerca de 0,7 s depois de abrir uma página autenticada, o Site mostra o diálogo "Deseja ativar a leitura por voz?" e fala a pergunta em voz alta.
  2. A pessoa escolhe "Sim, ativar leitura" ou "Não, obrigado".
  3. "Sim" liga a leitura por voz e o Site fala "Leitura por voz ativada. Use a tecla Tab para navegar pelo site."; "Não" a mantém desligada.
- **Fluxos alternativos e exceções:** se o salvamento na conta falhar: "Não foi possível salvar essa escolha na sua conta. Ficou salva neste dispositivo." (ou a mensagem do servidor); o diálogo não pode ser fechado sem responder; sem suporte de voz no navegador ele não aparece.
- **Pós-condições:** grava a resposta no navegador e, com sessão, em `preferencias_acessibilidade` (consentimento e leitura por voz, ambos iguais à resposta). A pergunta não volta, a não ser que a pessoa use "Redefinir tudo" (UC-G38).
- **Regras de negócio:** a decisão vem do valor salvo na conta, por isso quem já respondeu não é perguntado de novo em outro navegador depois de entrar; depois, a leitura pode ser ligada ou desligada à vontade em UC-G38 sem desfazer o consentimento (`ConsentimentoVozDialog.tsx`).
- **Telas e endpoints:** qualquer tela autenticada (`EstruturaApp`); `PUT /api/acessibilidade`.

### UC-G40 — Escolher o idioma
- **Ator:** candidato, empresa (aprovada ou na tela de status) ou administrador (visitante: UC-V28).
- **Descrição:** trocar o idioma da interface entre português, inglês e espanhol.
- **Pré-condições:** nenhuma (o seletor também existe nas telas públicas).
- **Fluxo principal:**
  1. Usa o seletor de idioma do cabeçalho (sigla PT, EN ou ES) ou o campo "Idioma" em `/configuracoes`.
  2. Escolhe "Português", "English" ou "Español".
  3. O Site troca todos os textos na hora, sem recarregar, e ajusta o idioma do documento e da leitura por voz.
  4. Com sessão, o Site também grava o idioma na conta.
- **Fluxos alternativos e exceções:** se a gravação na conta falhar, nada é mostrado (a interface já mudou e a conta se acerta na próxima escolha); valor fora de pt, en e es é recusado pela API: "Idioma inválido. Use pt, en ou es."
- **Pós-condições:** guarda a escolha no navegador (`acesso:idioma`) e em `usuarios.idioma` (padrão "pt").
- **Regras de negócio:** ao entrar e ao recarregar a página, o idioma da conta passa a valer na interface (acompanha a pessoa entre aparelhos e vence o que estava escolhido no navegador); o Site envia o idioma em toda requisição (`Accept-Language`) e o servidor escreve erros e avisos nele; e-mails e notificações saem no idioma da conta de quem recebe (a notificação fica gravada em português e é traduzida na saída); texto digitado por pessoas não é traduzido.
- **Telas e endpoints:** cabeçalho, `/configuracoes`; `PATCH /api/auth/idioma` (corpo `idioma`).

### UC-G41 — Pausar a conta
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** pausar a conta com a senha, voltando quando quiser com uma reativação no login.
- **Pré-condições:** sessão ativa; saber a senha atual.
- **Fluxo principal:**
  1. Em `/configuracoes/conta`, na "Zona de risco", clica em "Pausar conta".
  2. No diálogo "Pausar sua conta?" informa a senha atual e clica em "Pausar conta".
  3. O Site mostra "Conta pausada. Você pode reativá-la a qualquer momento fazendo login novamente.", encerra a sessão e leva a `/entrar`.
  4. Para voltar, a pessoa entra com e-mail e senha (UC-V23); a tela exibe "Sua conta está pausada" ("Você pausou esta conta anteriormente. Deseja reativá-la e continuar?") e, ao clicar em "Reativar minha conta", o Site mostra "Conta reativada. Bem-vindo de volta!" e leva a `/feed` (UC-V24).
- **Fluxos alternativos e exceções:** senha incorreta: "Senha atual incorreta."; limite de 10 erros em 15 minutos por IP (UC-G33); falha geral: mensagem do servidor ou "Não foi possível pausar a conta."
- **Pós-condições:** marca `pausado_pelo_usuario` e `pausado_em` e revoga todas as sessões da conta; ao reativar no login, limpa as marcas.
- **Regras de negócio:** limitação verificada: o texto da tela promete que o perfil "fica indisponível", mas o código usa a pausa **apenas** no login (pedir a confirmação de reativação). Perfil, publicações, vagas, resultado de busca e conversas continuam visíveis e a conta continua recebendo notificações e mensagens; os tokens de acesso já emitidos continuam valendo até expirar (30 minutos por padrão). Diferente do bloqueio da moderação, não há motivo nem registro de auditoria (`AutenticacaoService.pausarConta` e `entrarComUsuario`). Para empresa, vagas e perfil também continuam como estavam (UC-E26).
- **Telas e endpoints:** `/configuracoes/conta`, `/entrar`; `POST /api/auth/conta/pausar` (corpo `senhaAtual`); `POST /api/auth/login` (com `confirmarReativacao`).

### UC-G42 — Excluir a conta definitivamente
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** apagar a própria conta e os dados vinculados, sem prazo de arrependimento.
- **Pré-condições:** sessão ativa; saber a senha atual.
- **Fluxo principal:**
  1. Em `/configuracoes/conta`, na "Zona de risco", clica em "Excluir conta".
  2. O diálogo "Excluir sua conta permanentemente?" avisa que a ação é definitiva; a pessoa informa a senha atual e clica em "Excluir permanentemente".
  3. O Site mostra "Conta excluída. Sentiremos sua falta." e tenta encerrar a sessão local.
- **Fluxos alternativos e exceções:** senha incorreta: "Senha atual incorreta."; limite de 10 erros em 15 minutos por IP (UC-G33); falha geral: mensagem do servidor ou "Não foi possível excluir a conta."; duas exclusões simultâneas da mesma conta: a segunda recebe "Usuário não encontrado."
  - Pelo código, a chamada de saída que vem em seguida é recusada (401), porque a conta já não existe; a sessão local é encerrada, mas o Site pode mostrar também um aviso de erro ("Usuário não encontrado.") e levar a `/entrar` em vez da página inicial.
- **Pós-condições:**
  - Antes de apagar, remove do armazenamento (melhor esforço; falha só vai para o log, sem impedir a exclusão): foto, capa, currículo, logo e capa da empresa e anexos das publicações.
  - Numa única transação arquiva as denúncias abertas feitas contra a própria conta (ou a empresa da conta; "Encerrada automaticamente: a conta denunciada foi excluída.") e apaga o usuário. Pelas chaves do banco, saem junto: sessões, tokens de push, códigos de verificação e de recuperação, preferências, perfil de candidato (experiências, formações, certificados, habilidades, deficiências, candidaturas, favoritos e empresas seguidas), a empresa da conta com suas vagas e as candidaturas recebidas, publicações com anexos, comentários, curtidas e compartilhamentos (inclusive os feitos em publicações de outras pessoas), seguidores, seguidos, pedidos de seguimento, bloqueios (feitos e recebidos) e as notificações recebidas.
  - Permanecem, com a referência à conta virando nula: as conversas e mensagens para a outra pessoa (o excluído vira "Usuário removido" e a conversa fica só de leitura); as denúncias feitas pela conta (sem autor identificado) e as que ela atendeu como administradora; registros de auditoria (sem administrador identificado); notificações em que a conta era a autora da ação (perdem a foto; o link, quando existe, continua apontando para um conteúdo que pode já não existir); empresas avaliadas ou suspensas por um administrador excluído (perdem só o nome de quem decidiu); a empresa criada por uma conta de candidato excluída continua existindo (perde só o vínculo). Contas de candidato e de empresa são separadas: excluir uma não exclui a outra.
- **Regras de negócio:** o mesmo núcleo da exclusão feita pelo administrador (`AdminUsuarioService.excluirContaDefinitivamente`, UC-A08); a exclusão pelo próprio usuário não gera registro de auditoria nem e-mail; não há carência nem recuperação; não há trava para administrador (o código não impede que o último administrador exclua a própria conta, ao contrário do painel, que não exclui administradores).
- **Telas e endpoints:** `/configuracoes/conta`, `/`; `DELETE /api/auth/conta` (corpo `senhaAtual`).

### UC-G43 — Sair da conta
- **Ator:** candidato, empresa (aprovada ou na tela de status) ou administrador.
- **Descrição:** encerrar a sessão do navegador atual.
- **Pré-condições:** sessão ativa.
- **Fluxo principal:**
  1. No menu do perfil, clica em "Sair" (na tela de status da empresa, o botão é "Sair da conta").
  2. O Site avisa o servidor, apaga os tokens do navegador, fecha a conexão em tempo real e limpa a sessão.
  3. A pessoa é levada à página inicial (`/`).
- **Fluxos alternativos e exceções:** se a chamada de saída falhar, os tokens locais e a sessão são apagados mesmo assim, mas o redirecionamento para `/` não acontece e a rota protegida leva a `/entrar`; trocar a senha, pausar ou excluir a conta também terminam com a saída automática (ver UC-G34, UC-G41 e UC-G42).
- **Pós-condições:** o refresh token desta sessão é revogado; as outras sessões continuam ativas; idioma e preferências de acessibilidade ficam guardados no navegador.
- **Regras de negócio:** só o refresh token é revogado; o token de acesso já emitido não é invalidado no servidor e vale até expirar (30 minutos por padrão), porque a verificação de token não consulta a lista de sessões. O Site não limpa o cache de dados em memória ao sair; entrar com outra conta na mesma aba, sem recarregar a página, pode mostrar por instantes dados em cache da conta anterior (por exemplo notificações e conversas) até as consultas serem refeitas.
- **Telas e endpoints:** menu do perfil, tela de status da empresa; `POST /api/auth/logout` (corpo `refreshToken`).

## Funções comuns: complementos

### UC-G44 — Voltar ao início a partir de uma página de erro
- **Ator:** candidato, empresa, administrador ou visitante (para o visitante, ver também UC-V06).
- **Descrição:** sair de um endereço inexistente ou de uma tela que falhou ao carregar.
- **Pré-condições:** nenhuma.
- **Fluxo principal:**
  1. A pessoa abre um endereço que não existe; o Site mostra "404", "Página não encontrada" e "A página que você procura não existe ou foi movida."
  2. Clica em "Voltar ao início", que leva a `/`; com sessão ativa, `/` redireciona para `/feed`.
- **Fluxos alternativos e exceções:** numa falha inesperada ao desenhar uma tela, o Site mostra "Esta página não carregou" ("Algo deu errado do nosso lado. Você pode tentar novamente ou voltar ao início."), com "Tentar novamente" (recarrega a rota) e "Ir para o início" (recarrega `/`). Essas telas não têm cabeçalho, rodapé nem seletor de idioma, mas seguem o idioma já escolhido.
- **Pós-condições:** nenhuma alteração de dados.
- **Regras de negócio:** textos em `src/i18n/pt/erros.ts`; a API responde 404 "Rota não encontrada." a caminhos `/api` inexistentes.
- **Telas e endpoints:** telas de erro do roteador (`__root.tsx`); nenhum endpoint próprio.

### UC-G45 — Ver o próprio perfil
- **Ator:** candidato, empresa (aprovada) ou administrador.
- **Descrição:** abrir `/perfil`, o perfil da própria conta, a partir do menu do perfil, do cartão do feed ou de qualquer foto ou nome próprio.
- **Pré-condições:** sessão ativa.
- **Fluxo principal:**
  1. Candidato e administrador veem o perfil pessoal (capa, foto, nome, contadores "Seguidores" e "Seguindo" que abrem as listas de UC-G15, cartão de preferências de acessibilidade ativas com o link "Ajustar preferências", publicações e compartilhamentos em ordem cronológica e botão "Editar perfil", UC-G32). O candidato tem ainda as seções profissionais (UC-C05); o administrador vê o rótulo "Administrador do ACESSO" e nenhuma seção profissional.
  2. A empresa vê o perfil empresarial (UC-E21).
  3. Cada publicação própria na linha do tempo tem as ações de UC-G06, UC-G07 e as demais do cartão.
- **Fluxos alternativos e exceções:** a linha do tempo mostra os 10 itens mais recentes; erro "Não foi possível carregar as publicações."; vazio "Nenhuma publicação por aqui ainda."
- **Pós-condições:** nenhuma alteração de dados.
- **Regras de negócio:** abrir o próprio id em `/perfil/:usuarioId` redireciona para `/perfil`; o perfil próprio não mostra "Seguir", "Enviar mensagem" nem "Bloquear".
- **Telas e endpoints:** `/perfil`; `GET /api/postagens/usuario/:usuarioId/linha-do-tempo`; `GET /api/seguir/resumo/:usuarioId`; `GET /api/auth/me` (sessão).

### UC-G46 — Ter a conta bloqueada pela moderação
- **Ator:** candidato ou empresa. Ator secundário: administrador (UC-A06 e UC-A07; também pela resolução de denúncia, UC-A19).
- **Descrição:** o que a pessoa vê quando o administrador bloqueia (ou desbloqueia) sua conta.
- **Pré-condições:** conta bloqueada pelo painel.
- **Fluxo principal:**
  1. O administrador bloqueia a conta; o sistema marca a conta como bloqueada e inativa, grava o motivo, cria a notificação "Conta bloqueada", registra a auditoria e envia um e-mail de aviso (se houver provedor configurado).
  2. Na próxima chamada à API com a sessão aberta, a resposta é 403 "Sua conta foi bloqueada pela moderação do ACESSO. Motivo: <motivo>" com o código `CONTA_BLOQUEADA`; o Site apaga os tokens, encerra a sessão e mostra o motivo por 10 segundos. A renovação do token e a conexão em tempo real são recusadas da mesma forma.
  3. Ao tentar entrar de novo, a pessoa recebe "Usuário desativado." (o login confere a conta inativa antes do bloqueio, então o motivo não aparece aí).
- **Fluxos alternativos e exceções:** ao desbloquear, a conta volta a ficar ativa, recebe a notificação "Conta reativada" ("Sua conta foi reativada pela moderação.") e nenhum e-mail; as publicações, vagas e dados continuam como estavam durante o bloqueio.
- **Pós-condições:** `bloqueado`, `ativo`, `bloqueado_em` e `motivo_bloqueio` alterados; nada é apagado.
- **Regras de negócio:** bloqueio da moderação é diferente de "Bloquear" entre pessoas (UC-G30) e de pausar (UC-G41); administradores não podem ser bloqueados pelo painel. Para empresa, ver também UC-E29.
- **Telas e endpoints:** qualquer tela autenticada; `/entrar`; respostas 403 com `detalhes.codigo = CONTA_BLOQUEADA`.

## Funções comuns: resumo das limitações verificadas no código atual

- Preferências de notificação (UC-G28): gravadas, mas sem efeito, por diferença de maiúsculas entre os tipos gravados e as chaves da checagem.
- Desfazer compartilhamento (UC-G13): o Site envia o id da publicação em vez do id do compartilhamento; a API responde "Compartilhamento não encontrado.".
- Pausar conta (UC-G41): só exige reativação no login; não esconde perfil nem publicações, apesar do texto da tela.
- Alterar senha (UC-G34): a tela diz que a pessoa continua conectada, mas o código desconecta todos os aparelhos; a chamada de saída seguinte falha e o aviso de sucesso pode não aparecer.
- Excluir conta (UC-G42): o Site pode exibir erro após a exclusão por causa da chamada de saída; denúncias sobre o conteúdo da conta excluída continuam na fila.
- Perfil privado de empresa (UC-G14, UC-G35): o Site cai no perfil genérico com o rótulo "Administrador do ACESSO".
- Pedidos de seguimento (UC-G18): só podem ser decididos pela notificação, que continua mostrando os botões mesmo depois de decidido; não há lista de pendentes.
- Mensagens (UC-G23): o Site carrega só as 100 mensagens mais antigas de cada conversa; (UC-G24) o texto digitado se perde se o envio falhar.
- Seguir empresa (UC-G19): o botão aparece para empresa e administrador, mas a API só aceita candidato.
- Listas de seguidores e seguindo (UC-G15): sem filtro de privacidade ou bloqueio na API.
- Bloqueio (UC-G30): comentários do bloqueado continuam visíveis em publicações de terceiros; pedidos de seguimento pendentes não são apagados.
- Exclusão de publicação e comentário (UC-G07, UC-G11): lógica; os registros e os arquivos continuam guardados, apesar do aviso de remoção permanente.
- Acessibilidade (UC-G38): cursor ampliado e valores exatos de espaçamento só no navegador; as preferências da conta só são trazidas no login e ao abrir a tela.
- Feed (UC-G03): publicações novas de outras pessoas só aparecem quando a lista é recarregada; o feed não prioriza quem a pessoa segue; o cartão e o menu mostram "Entre para personalizar" no lugar do título profissional (UC-G01).
- Mensagens (UC-G24): o segundo tique (lida) só aparece quando a lista de mensagens é recarregada.
- Troca de e-mail (UC-G33): a normalização do validador pode gravar um e-mail do Gmail diferente do digitado; falha no envio do código não é informada à pessoa.
- Publicar (UC-G04): recusas posteriores ao envio dos arquivos deixam arquivos órfãos no armazenamento (só pela API).
- Vincular conta Google a conta com senha: existe o endpoint, mas não há tela no Site.
- Sair (UC-G43): o cache de dados em memória não é limpo.
