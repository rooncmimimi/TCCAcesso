## Empresa

A **Empresa** é uma conta institucional própria (login com o e-mail e a senha da empresa), criada a partir de uma conta de **Candidato** e vinculada a ela. Ela publica vagas, recebe e analisa candidaturas e mantém o perfil institucional. Quase tudo isso só funciona com o cadastro **aprovado** pela equipe do ACESSO, e o **Administrador** aparece como ator secundário em vários casos (as ações dele estão em UC-A06 a UC-A08, UC-A09 a UC-A14, UC-A19 e UC-A26 a UC-A29). Os casos descrevem o comportamento do código atual do Site (`Site/Frontend` e `Site/Backend`). O aplicativo Android (`App/AcessoApk`) é um projeto separado e está fora deste documento.

Quando aprovada, a empresa também pode usar as funções comuns **UC-G** (feed e publicações, mensagens, notificações, seguir, denunciar, bloquear, configurações, acessibilidade, idioma, busca e perfil público). Esta seção descreve só o que é específico da empresa; onde uma função comum tem regra própria para empresa, o caso aparece aqui de forma resumida e remete ao caso UC-G correspondente.

### Tabela-resumo

| ID | Caso de uso | Resumo |
| --- | --- | --- |
| UC-E01 | Cadastrar empresa | A partir de uma conta de candidato, cria a conta da empresa (CNPJ, responsável, endereço, apresentação e aceite dos termos) em situação "pendente". |
| UC-E02 | Confirmar o e-mail e entrar na conta da empresa | Confirma o e-mail por link ou código de 6 dígitos e faz o login com o e-mail e a senha da empresa. |
| UC-E03 | Acompanhar a análise do cadastro | Vê a tela "em análise" enquanto aguarda a decisão e é avisada quando aprovada. |
| UC-E04 | Ver a reprovação do cadastro | Vê a reprovação e o motivo; nada empresarial fica liberado. |
| UC-E05 | Ver a suspensão e a reativação da empresa | Recebe notificação e e-mail da suspensão, vê o motivo e volta a operar quando reativada. |
| UC-E06 | Consultar o painel da empresa | Vê quatro indicadores (vagas publicadas, abertas, candidaturas recebidas e seguidores). |
| UC-E07 | Listar as minhas vagas por situação | Navega pelas vagas abertas, arquivadas e encerradas, com a contagem de candidaturas. |
| UC-E08 | Publicar vaga | Cria uma vaga com todos os campos e recursos de acessibilidade. |
| UC-E09 | Editar vaga | Altera os dados de uma vaga já publicada. |
| UC-E10 | Arquivar vaga | Tira a vaga de circulação sem apagá-la (situação "pausada", exibida como "Arquivada"). |
| UC-E11 | Encerrar vaga | Marca a vaga como encerrada. |
| UC-E12 | Reabrir vaga | Volta uma vaga arquivada ou encerrada para "aberta". |
| UC-E13 | Excluir vaga | Apaga a vaga e, junto, as candidaturas dela. |
| UC-E14 | Ver a própria vaga como o público a vê | Abre a página da vaga e vai ao painel de gestão. |
| UC-E15 | Ver as candidaturas recebidas de uma vaga | Lista, com paginação, quem se candidatou a uma vaga da empresa. |
| UC-E16 | Atualizar a situação de uma candidatura | Muda para Em análise, Aprovada ou Rejeitada, e o candidato é notificado ("Pendente" aparece no seletor, mas o servidor recusa). |
| UC-E17 | Visualizar e baixar o currículo do candidato | Abre ou baixa o currículo por link temporário, só de quem se candidatou. |
| UC-E18 | Consultar o perfil de um candidato | Vê o perfil profissional; a seção de currículo só aparece para quem se candidatou. |
| UC-E19 | Conversar com o candidato | Inicia ou continua uma conversa, respeitando bloqueios e a preferência de mensagens. |
| UC-E20 | Receber avisos da plataforma | Recebe notificações (e alguns e-mails) sobre candidaturas, seguidores e decisões da moderação. |
| UC-E21 | Ver o perfil da empresa | Vê o perfil próprio e sabe como terceiros o veem. |
| UC-E22 | Editar os dados do perfil da empresa | Altera razão social, descrição, cultura inclusiva, setor, porte, site e localização. |
| UC-E23 | Trocar o logotipo | Envia uma nova imagem de logo (PNG, JPEG ou WEBP, até 5 MB). |
| UC-E24 | Trocar ou remover o banner | Envia uma nova capa ou remove a atual. |
| UC-E25 | Acompanhar os seguidores da empresa | Vê o total de seguidores e é avisada de cada novo seguidor. |
| UC-E26 | Pausar ou excluir a conta da empresa | Pausa o acesso ou apaga a conta com tudo que depende dela. |
| UC-E27 | Receber o selo "Empresa verificada" | O administrador concede ou retira o selo, sem relação com a aprovação. |
| UC-E28 | Ter vaga ocultada, alterada ou removida pela moderação | A moderação mexe em vagas da empresa; só a ocultação gera aviso. |
| UC-E29 | Ter a conta bloqueada pela moderação | O login é impedido, com aviso na conta e por e-mail. |
| UC-E30 | Consultar as vagas publicadas por outras empresas | Usa a lista pública de vagas; não pode se candidatar nem favoritar. |
| UC-E31 | Usar recursos da empresa que existem só na API | Busca de talentos, estatísticas da vaga, detalhe da candidatura e outros recursos sem tela no Site. |

## Empresa — Regras gerais: situação do cadastro, transições e visão do candidato

### Situações do cadastro

| Situação | Como chega | O que a empresa vê no Site | Como muda |
| --- | --- | --- | --- |
| Pendente | Estado inicial de todo cadastro (UC-E01) | Tela "Sua empresa está em análise" no lugar de qualquer página do app; botões "Verificar novamente" e "Sair da conta", seletor de idioma e link "Fale conosco" | O administrador aprova (UC-A10) ou reprova (UC-A11) |
| Aprovada | Aprovação, ou reativação de uma empresa suspensa | Site completo | O administrador suspende (UC-A12) ou reprova |
| Reprovada | Reprovação pelo administrador, com ou sem motivo | Tela "Seu cadastro empresarial não foi aprovado", com o motivo quando informado; só "Sair da conta" e idioma | Só o administrador pode aprovar depois; a empresa não reenvia o cadastro |
| Suspensa | Suspensão pelo administrador (só de empresa aprovada), na tela de empresas ou ao resolver uma denúncia | Tela "Conta empresarial suspensa", com o motivo quando informado; só "Sair da conta" e idioma | O administrador reativa (UC-A13) |

### O que cada situação permite e bloqueia

A regra é aplicada em dois pontos: no Site, `EstruturaApp` troca qualquer página autenticada pela `TelaStatusEmpresa` quando `usuario.empresa.statusAprovacao` não é "aprovada" (cuida só da experiência); no servidor, `garantirEmpresaAprovada` e `garantirEmpresaAprovadaSeForEmpresa` (`Backend/src/utils/autorizacao.js`) respondem 403. O administrador nunca é barrado por essa regra.

| Recurso | Aprovada | Pendente, reprovada ou suspensa |
| --- | --- | --- |
| Entrar e sair da conta | Sim | Sim. O login não consulta a aprovação (só conta bloqueada, desativada, pausada ou e-mail não confirmado impedem) |
| Páginas do app (feed, vagas, vaga, perfis, painel, mensagens, notificações, busca, configurações, Minha atividade, Descobrir) | Sim | Substituídas pela tela de status. `/sobre-nos`, `/termos`, `/privacidade` e as telas de entrada e cadastro não usam a estrutura do app e continuam abrindo |
| Publicar, editar, mudar a situação e excluir vaga; listar "minhas vagas"; estatísticas da vaga | Sim | API: 403 |
| Listar as candidaturas de uma vaga; mudar a situação de uma candidatura | Sim | API: 403 |
| Editar dados do perfil; trocar logo e capa | Sim | API: 403 (nas rotas de logo e capa a recusa vem antes do envio do arquivo) |
| Painel de indicadores (`GET /api/dashboard/empresa`) | Sim | API: 403 |
| Feed e publicações (listar, abrir, publicar, curtir, comentar, compartilhar, linha do tempo) | Sim | API: 403 |
| Mensagens: abrir conversa, listar, abrir uma conversa, ler, enviar e marcar como lidas | Sim | API: 403. Não têm a trava: `GET /api/conversas/nao-lidas` e `GET /api/conversas/pode-iniciar/:usuarioId` |
| Notificações, configurações da conta, pausar e excluir a conta, busca global, seguir, bloquear, denunciar, `GET /api/empresas/me` | Sim | Sem trava no servidor; no Site ficam inacessíveis atrás da tela de status |
| Recursos de candidatos pela API (busca de talentos, perfil, currículo de quem se candidatou, detalhe de candidatura) | Sim | Sem trava no servidor; sem tela no Site (UC-E31) |
| Aparecer para os outros | Vagas abertas na lista `/vagas`, na busca e na vitrine da página inicial; recebe candidaturas; perfil visível; entra em "empresas parceiras" e em sugestões | Vagas somem da lista, da busca e da vitrine; terceiros que abrem a vaga recebem "não encontrada"; candidatura recusada com 403 "Esta vaga não está disponível para candidaturas no momento."; o Site mostra "Este perfil não está disponível." e a empresa sai de busca, parceiras e sugestões. Publicações já feitas continuam no feed, e `GET /api/empresas*` não filtra por aprovação |

Mensagens do 403 conforme a situação:
- Pendente: "Sua empresa está aguardando aprovação da equipe do ACESSO. Você receberá uma notificação quando a análise for concluída."
- Reprovada: "Seu cadastro empresarial não foi aprovado. Motivo: …" (sem motivo: "Seu cadastro empresarial não foi aprovado pela equipe do ACESSO.").
- Suspensa: "Sua empresa está suspensa pela moderação do ACESSO. Motivo: …" (sem motivo, sem a parte do motivo).

Se `usuario.empresa` não vier na sessão, a tela de status não é aplicada; então o painel e o perfil mostram o mesmo aviso (`AvisoAprovacaoEmpresa`) dentro do cabeçalho normal.

### Transições da situação do cadastro

| De | Para | Como | Efeito para a empresa |
| --- | --- | --- | --- |
| (cadastro) | Pendente | UC-E01 | Nenhum aviso ao administrador; aparece em `/admin/empresas` |
| Pendente | Aprovada | Administrador, "Aprovar" | Notificação "Cadastro aprovado"; sem e-mail |
| Pendente | Reprovada | Administrador, "Reprovar" (motivo opcional, sem limite de tamanho) | Notificação "Cadastro reprovado"; sem e-mail |
| Aprovada | Suspensa | "Suspender" (motivo até 1.000 caracteres) ou denúncia resolvida com ação | Notificação "Empresa suspensa" e e-mail |
| Aprovada | Reprovada | "Reprovar" (o botão fica ativo para empresa aprovada) | Notificação "Cadastro reprovado" |
| Suspensa | Aprovada | "Reativar" (única ação de cadastro oferecida a empresa suspensa) | Notificação "Empresa reativada"; sem e-mail |
| Reprovada | Aprovada | "Aprovar" | Notificação "Cadastro aprovado"; o motivo antigo é apagado |

Nenhuma transição volta a "pendente" e a empresa não pede nova análise. A API de aprovar e reprovar não confere a situação anterior (aprova até uma suspensa); só suspender (exige "aprovada") e reativar (exige "suspensa") devolvem 409.

### Transições da situação da vaga

| De | Para | Como na tela | Observação |
| --- | --- | --- | --- |
| (criação) | Aberta | "Publicar vaga" | A API aceita criar já como pausada ou encerrada; a tela não oferece |
| Aberta | Arquivada (`pausada`) | "Arquivar" | Sem confirmação |
| Aberta ou Arquivada | Encerrada | "Encerrar" | Sem confirmação |
| Arquivada ou Encerrada | Aberta | "Reabrir" | Sem confirmação |
| Encerrada | Arquivada | Não oferecido na tela | A API aceita qualquer troca entre as três situações, inclusive repetir a atual |
| Qualquer | Excluída | "Excluir", com confirmação | Apaga também candidaturas e favoritos |

Efeitos: só vaga "aberta" aparece na lista pública e recebe candidatura (400 "Esta vaga não está aberta para candidaturas."); a página da vaga abre por link em qualquer situação; a empresa vê as candidaturas já recebidas em qualquer situação. Não há encerramento automático por data. "Oculta" é um campo à parte, definido só pela moderação (UC-E28).

### Transições da situação da candidatura

| Quem | Para | Observação |
| --- | --- | --- |
| Candidato ao se candidatar | Pendente | UC-C21 |
| Empresa | Em análise, Aprovada, Rejeitada | Oferecidos no seletor; gravam e notificam o candidato |
| Empresa | Visualizada | Só pela API; o sistema nunca aplica sozinho |
| Empresa | Pendente | O seletor mostra "Pendente", mas o servidor responde 400 "A empresa não pode aplicar este status." (a tela mostra só "Não foi possível atualizar o status.") |
| Empresa | Cancelada | Recusado (400, mesma mensagem) |
| Candidato | Cancelada | UC-C23; o código não confere a situação anterior |
| Administrador | Qualquer | Pela API |

Não há ordem obrigatória: a empresa pode mudar de Rejeitada para Em análise, e também mexer numa candidatura já cancelada pelo candidato. "Aprovada" não é contratação: o ACESSO não registra contratação.

### Quem vê o que do candidato

Regra de autorização (`podeVerDadosPrivados`, `candidatoPrivacidade.js`), aplicada a `GET /api/candidatos/:id`, `GET /api/perfil/candidatos/...` e às duas rotas de currículo, avaliada de novo a cada requisição:
1. Sem sessão: não.
2. Administrador: sim. O próprio candidato: sim.
3. Bloqueio entre as duas contas, em qualquer sentido: não, mesmo havendo candidatura.
4. Conta de empresa que tenha ao menos uma candidatura desse candidato, em qualquer situação (inclusive cancelada), numa vaga cuja dona é essa empresa: sim. A situação da vaga não importa; se a vaga for excluída, a candidatura some e o acesso também.
5. Qualquer outro caso: não (a resposta passa por uma lista de campos públicos).

A regra não consulta a situação de aprovação da empresa: o Site esconde tudo pela tela de status, mas a API continua respondendo a uma empresa pendente, reprovada ou suspensa que tenha candidatura.

| Dado do candidato | Conta qualquer, sem bloqueio | Empresa com candidatura | Na tela da empresa |
| --- | --- | --- | --- |
| Nome, foto, capa, título profissional, cidade e UF, "Sobre mim", nomes das deficiências, experiências, formações, habilidades, certificados (sem o arquivo) | Sim | Sim | Exibidos no perfil (`/perfil/:usuarioId`) |
| País, escolaridade, disponibilidade, LinkedIn, GitHub, observações das deficiências | Sim (API) | Sim | Não exibidos |
| Nome do arquivo do currículo e o próprio arquivo (link temporário) | Não | Sim | Seção "Currículo" com o nome e os botões "Visualizar currículo" e "Baixar currículo" |
| CPF, data de nascimento, gênero, endereço, CEP, pretensão salarial, necessidades de acessibilidade, arquivo dos certificados, e-mail da conta | Não | Sim (API) | Não exibidos |
| Mensagem opcional e data da candidatura | Não se aplica | Na API | Não exibidas |

A lista de candidaturas de uma vaga (`GET /api/vagas/:vagaId/candidaturas`) não usa essa função: a dona da vaga recebe o registro completo do candidato e da conta (id, nome, e-mail e foto), e a tela mostra só nome, título profissional, situação e os botões de currículo.

## Empresa — Cadastro e acesso da conta

### UC-E01 — Cadastrar empresa
- **Ator:** Pessoa responsável pela empresa, que já tem conta de candidato. A conta da empresa é uma segunda conta, com e-mail e senha próprios. A mesma ação, vista pelo candidato, está em UC-C25; o início pelo botão "Sou empresa" está em UC-V18.
- **Descrição:** Cria o perfil institucional e a conta de login da empresa, vinculada à conta de candidato de quem cadastra. A empresa nasce "pendente" e só publica vagas depois de aprovada.
- **Pré-condições:** Estar logado com a conta de candidato. O CNPJ e o e-mail da empresa não podem estar cadastrados (o e-mail precisa ser diferente do da conta de candidato).
- **Fluxo principal:**
  1. Na página inicial `/`, o visitante clica em "Sou empresa", que leva a `/cadastro/candidato?depois=empresa`. Ele cria a conta de candidato e, ao concluir, o Site o leva a `/cadastro/empresa`. Quem já é candidato logado pode abrir `/cadastro/empresa` digitando o endereço (não há link para ela dentro do app logado). `/cadastro?perfil=empresa` só redireciona ao cadastro de candidato com a intenção de empresa.
  2. O sistema mostra um assistente com indicador de etapas: Empresa, Responsável, Endereço, Apresentação, Conclusão e, por fim, Acessibilidade.
  3. Etapa Empresa: CNPJ\* (máscara 00.000.000/0000-00, 14 números), razão social\* (3 a 200 caracteres), nome fantasia (até 200), setor (até 120) e porte (MEI, Microempresa, Pequena, Média ou Grande).
  4. Etapa Responsável: nome completo\* (3 a 150), e-mail profissional\* (válido, até 150; é o login da empresa), telefone (opcional; a tela exige DDD com 10 ou 11 números e o servidor aceita de 10 a 20 caracteres) e senha\* (8 a 72 caracteres, com maiúscula, minúscula, número e caractere especial; a tela mostra os requisitos).
  5. Etapa Endereço (tudo opcional): CEP (8 números), cidade (até 100, com sugestão de cidades), UF (2 letras) e endereço (até 255).
  6. Etapa Apresentação (opcional): descrição institucional (até 4.000), cultura inclusiva (até 4.000) e site (a tela exige começar com http:// ou https://; o servidor exige apenas que haja um protocolo).
  7. Etapa Conclusão: a pessoa revisa os dados agrupados (cada grupo tem "Editar", que volta à etapa), marca o aceite dos Termos de Uso e da Política de Privacidade\* e clica em "Criar conta". Um aviso explica que é preciso confirmar o e-mail e que o cadastro passa por análise antes de a empresa publicar vagas.
  8. O sistema cria a conta e a empresa (resposta 201). Com envio de e-mail configurado no servidor, o Site mostra "Falta confirmar seu e-mail" (segue em UC-E02) e a sessão do candidato continua aberta. Sem envio configurado, a empresa já entra: aparece "Conta criada com sucesso!", a sessão do navegador passa a ser a da empresa, e vem a etapa Acessibilidade (painel de preferências). O botão de finalizar chama `POST /api/auth/cadastro/concluir` e leva a `/feed`, onde a tela de análise assume (UC-E03).
- **Fluxos alternativos e exceções:**
  - Sem sessão, ou com conta que não é de candidato: `/cadastro/empresa` mostra "Primeiro, a sua conta pessoal", com o botão "Criar minha conta de candidato" e o link "Entrar". A API recusa com 401 ("Para cadastrar uma empresa é preciso entrar com a sua conta de candidato.") ou 403 ("Só uma conta de candidato pode cadastrar uma empresa. Entre com a sua conta pessoal.").
  - Cada etapa valida antes de avançar. Exemplos: "Digite um CNPJ válido, com 14 números.", "Informe a razão social (3 a 200 caracteres).", "Informe o nome de quem responde pela conta.", "Digite um endereço de e-mail válido.", "Digite um telefone válido, com DDD.", "Digite um CEP válido, com 8 números.", "Informe a UF com 2 letras.", "Digite uma URL completa, começando com http:// ou https://.".
  - Sem o aceite dos termos: "É preciso aceitar os Termos de Uso e a Política de Privacidade para criar a conta." Só a tela exige; o servidor não confere o aceite (grava data e versão apenas quando a versão é enviada).
  - E-mail já usado: 409 "Este e-mail já está cadastrado." CNPJ já usado: 409 "Este CNPJ já está cadastrado." (vale também para empresa reprovada). Campo inválido no servidor: 422 "Erro de validação." com a lista de campos. Falha geral na tela: "Não foi possível criar a conta agora."
  - O CNPJ só é conferido quanto aos 14 números. O código não calcula dígitos verificadores nem consulta a Receita Federal; a conferência é manual, feita pelo administrador.
  - O validador de cadastro normaliza o e-mail (`normalizeEmail`): para endereços Gmail remove os pontos e o sufixo "+…" (por exemplo, "joao.silva+rh@gmail.com" é gravado como "joaosilva@gmail.com"). O login não faz a mesma normalização, então digitar o endereço original pode dar "E-mail ou senha inválidos.". O link do e-mail de confirmação usa o endereço já gravado.
  - Falha no envio do e-mail de confirmação não derruba o cadastro; a pessoa pode pedir reenvio.
  - Limite de tentativas: 10 requisições com falha a cada 15 minutos por IP (as bem-sucedidas não contam), com "Muitas tentativas de autenticação. Tente novamente mais tarde."
  - O código não impede que a mesma conta de candidato cadastre mais de uma empresa, cada uma com CNPJ e e-mail próprios.
  - Com sessão devolvida (sem confirmação por e-mail), para voltar à conta de candidato é preciso sair e entrar de novo.
- **Pós-condições:** Na mesma transação, o sistema grava o usuário (tipo empresa, e-mail normalizado, senha com hash, idioma da interface no momento, data e versão dos documentos aceitos) e a empresa (situação "pendente", CNPJ cifrado com hash para conferir duplicidade, vínculo com a conta de candidato da sessão; a tela sempre envia o país "BR", e a API aceita outro código de 2 letras ou nenhum). Se houver envio de e-mail, o código de confirmação é enviado. Não há aviso ao administrador; a empresa aparece como pendente em `/admin/empresas` (UC-A09).
- **Regras de negócio:**
  - O tipo de conta nunca vem do corpo da requisição, e o vínculo com o candidato vem sempre da sessão (`AutenticacaoService.cadastrarEmpresa`).
  - A empresa sempre nasce em análise; nada contorna a aprovação (`criarEmpresa`).
  - E-mail e CNPJ são únicos (o CNPJ por hash).
  - A confirmação de e-mail é obrigatória para empresa quando o provedor de e-mail está disponível (`finalizarCadastro`); sem provedor, a conta nasce com o e-mail verificado.
  - Os limites de tamanho vêm de `validarCadastroEmpresa`.
- **Telas e endpoints:** `/` (botão "Sou empresa"), `/cadastro/candidato?depois=empresa` e `/cadastro/empresa` (telas); `POST /api/auth/register/empresa` e `POST /api/auth/cadastro/concluir` (API).

### UC-E02 — Confirmar o e-mail e entrar na conta da empresa
- **Ator:** Responsável pela empresa.
- **Descrição:** Confirma o e-mail da conta de empresa (obrigatório quando o servidor envia e-mails) e faz o primeiro login com o e-mail e a senha da empresa, que são diferentes dos da conta de candidato. A confirmação é a mesma de UC-V21 e UC-V22; o login é o de UC-V23.
- **Pré-condições:** UC-E01 concluído até a tela "Falta confirmar seu e-mail"; acesso à caixa de entrada.
- **Fluxo principal:**
  1. A empresa abre o link do e-mail (`/confirmar-email?email=…&codigo=…`, que confirma sozinho) ou, em `/confirmar-email`, digita o e-mail e o código de 6 dígitos e clica em "Confirmar e-mail".
  2. O sistema mostra "E-mail confirmado com sucesso!" e o botão "Entrar no ACESSO".
  3. Em `/entrar`, a empresa informa o e-mail e a senha da empresa.
  4. O sistema abre a sessão e leva a `/feed`. Se a empresa estiver pendente, o Site exibe a tela de status (UC-E03).
- **Fluxos alternativos e exceções:**
  - Tentar entrar sem ter confirmado: o login não é liberado e aparece a tela "Confirme seu e-mail", com botão de reenvio. Essa trava vale para empresa e administrador; candidato entra sem confirmar.
  - O código vale 15 minutos. Código errado ou expirado: "Código inválido ou expirado." Depois de 5 tentativas erradas, a seguinte (mesmo com o código certo) invalida o código: "Número de tentativas excedido. Solicite um novo código."
  - Reenvio: a resposta é sempre genérica ("Se sua conta existir e ainda não estiver confirmada, enviaremos um novo e-mail de confirmação."), exige intervalo mínimo de 60 segundos por conta, no máximo 5 pedidos por hora por IP ("Muitas solicitações de reenvio. Tente novamente mais tarde.") e invalida os códigos anteriores.
  - Credenciais erradas: "E-mail ou senha inválidos." Conta desativada ou bloqueada pela moderação: "Usuário desativado." Conta pausada: o Site pede a confirmação da reativação (UC-V24, UC-E26). Senha esquecida: UC-V25 a UC-V27.
  - Sem provedor de e-mail no servidor, não há confirmação: a conta já nasce com o e-mail marcado como verificado.
  - A tela de confirmação promete "retomamos seu cadastro de onde você parou", mas a retomada automática existe só para candidato. A empresa entra em `/feed` e, pendente, vê a tela de status. A etapa Acessibilidade do assistente da empresa não é retomada.
  - Limite de 10 tentativas com falha a cada 15 minutos por IP.
- **Pós-condições:** `email_verificado` passa a verdadeiro e o sistema cria a notificação "E-mail confirmado". No login, o sistema atualiza `ultimo_login` e emite o access token e o refresh token da sessão.
- **Regras de negócio:** O bloqueio por e-mail não confirmado vale para todo tipo de conta exceto candidato (`AutenticacaoService.entrarComUsuario`). A ordem das checagens do login é: conta desativada, conta bloqueada, e-mail não confirmado, conta pausada. O código tem 6 dígitos, validade de 15 minutos, no máximo 5 tentativas e cooldown de 60 s no reenvio.
- **Telas e endpoints:** `/confirmar-email` e `/entrar` (telas); `POST /api/auth/cadastro/confirmar-email`, `POST /api/auth/cadastro/reenviar-confirmacao`, `POST /api/auth/login` e `GET /api/auth/me` (API).

## Empresa — Situação do cadastro (aprovação)

### UC-E03 — Acompanhar a análise do cadastro
- **Ator:** Empresa pendente. Ator secundário: Administrador (aprova ou reprova em `/admin/empresas`, UC-A10 e UC-A11).
- **Descrição:** Enquanto a equipe analisa o cadastro, a empresa vê uma tela de espera e, quando aprovada, passa a usar o Site completo.
- **Pré-condições:** Empresa em situação "pendente" (UC-E01 e UC-E02 concluídos).
- **Fluxo principal:**
  1. Ao entrar, ou ao abrir qualquer página autenticada, o Site lê `usuario.empresa.statusAprovacao` (vindo de `/api/auth/me`) e exibe "Sua empresa está em análise". O texto diz que o cadastro foi recebido, que aguarda um administrador, que a empresa será notificada e que, por ora, publicar vagas, editar o perfil e ver candidaturas ficam indisponíveis.
  2. A empresa pode clicar em "Verificar novamente" (recarrega a página inteira e relê a situação), em "Sair da conta", em "Fale conosco" (abre um e-mail para o contato do projeto) ou trocar o idioma (UC-G40).
  3. O administrador aprova o cadastro (UC-A10). O sistema grava "aprovada", registra a data e o responsável pela avaliação e cria a notificação "Cadastro aprovado" ("Sua empresa foi aprovada e já pode publicar vagas.").
  4. Na próxima verificação ou no próximo login, o Site libera o app completo.
- **Fluxos alternativos e exceções:**
  - Qualquer chamada empresarial à API enquanto pendente recebe 403 com a mensagem de pendência (veja as regras gerais).
  - A aprovação não envia e-mail. A notificação só pode ser lida dentro do app, depois de liberado.
  - Se a aprovação sai com a empresa já logada, a tela só muda quando a sessão é recarregada; o Site não reage à notificação em tempo real. Até lá, o servidor já aceita as ações.
  - O administrador pode reprovar (UC-E04).
- **Pós-condições:** `status_aprovacao = aprovada`, `avaliado_em` e `avaliado_por_id` preenchidos, `motivo_reprovacao` limpo, notificação (tipo sistema) criada e auditoria "aprovar_empresa". A empresa passa a aparecer nas vitrines públicas (empresas parceiras da página inicial, busca global) e suas vagas ficam visíveis ao público.
- **Regras de negócio:** "Aprovada" (checagem cadastral, libera publicar vagas) e "verificada" (selo de confiança) são conceitos separados: aprovar não verifica (`AdminEmpresaService.avaliarEmpresa`, UC-E27). Aprovação e reprovação não exigem motivo e o servidor não confere a situação anterior.
- **Telas e endpoints:** qualquer página autenticada (`TelaStatusEmpresa` no lugar do app) (telas); `GET /api/auth/me`; `POST /api/admin/empresas/:id/aprovar` (API, administrador).

### UC-E04 — Ver a reprovação do cadastro
- **Ator:** Empresa reprovada. Ator secundário: Administrador (UC-A11).
- **Descrição:** A empresa fica sabendo que o cadastro não foi aprovado e vê o motivo, se houver. Nenhum recurso empresarial é liberado.
- **Pré-condições:** O administrador reprovou a empresa (a ação também está disponível para empresa já aprovada, pela tela `/admin/empresas`).
- **Fluxo principal:**
  1. O administrador clica em "Reprovar" e, opcionalmente, escreve o motivo.
  2. O sistema grava "reprovada", o motivo, a data e o responsável, e cria a notificação "Cadastro reprovado" ("Seu cadastro foi reprovado. Motivo: …", ou "não informado").
  3. Ao entrar ou recarregar, a empresa vê "Seu cadastro empresarial não foi aprovado", o texto explicativo e, se houver, o quadro "Motivo". O único botão é "Sair da conta".
- **Fluxos alternativos e exceções:**
  - Nada de vagas, candidaturas, perfil, painel, feed ou mensagens enquanto reprovada. A API responde 403 "Seu cadastro empresarial não foi aprovado. Motivo: …" (ou "… pela equipe do ACESSO." sem motivo).
  - Não há botão "Verificar novamente" nem forma de reenviar o cadastro. O CNPJ continua ocupado, então um novo cadastro com o mesmo CNPJ dá "Este CNPJ já está cadastrado.".
  - O administrador pode aprovar a empresa depois (botão "Aprovar" fica ativo para reprovadas); o motivo antigo é apagado.
  - Não há e-mail de reprovação; só a notificação (que a empresa só vê se for liberada depois).
  - O motivo da reprovação não tem limite de tamanho validado.
- **Pós-condições:** `status_aprovacao = reprovada`, `motivo_reprovacao`, `avaliado_em` e `avaliado_por_id` gravados, notificação e auditoria "reprovar_empresa". Quanto à visibilidade pública, vale o mesmo que na suspensão (UC-E05).
- **Regras de negócio:** A mesma rotina de avaliação (`avaliarEmpresa`) serve para aprovar e reprovar. A mensagem 403 da empresa traz o motivo, mas a mensagem exibida a terceiros é genérica (`garantirVagaDisponivelParaCandidatura`).
- **Telas e endpoints:** `TelaStatusEmpresa` (tela); `POST /api/admin/empresas/:id/reprovar` (API, administrador).

### UC-E05 — Ver a suspensão e a reativação da empresa
- **Ator:** Empresa suspensa. Ator secundário: Administrador (UC-A12 e UC-A13, ou resolvendo uma denúncia contra a empresa com a ação "suspender", UC-A19).
- **Descrição:** A moderação suspende uma empresa aprovada. O login continua funcionando, mas a empresa perde o acesso empresarial até ser reativada.
- **Pré-condições:** Empresa "aprovada" (só ela pode ser suspensa).
- **Fluxo principal:**
  1. O administrador clica em "Suspender" e, opcionalmente, informa o motivo (até 1.000 caracteres).
  2. O sistema grava "suspensa", motivo, data e responsável e cria a notificação "Empresa suspensa" ("Sua empresa foi suspensa pela moderação. Motivo: …").
  3. O sistema envia e-mail à empresa ("Sua empresa foi suspensa — ACESSO") explicando que, enquanto durar a suspensão, não é possível publicar ou editar vagas nem receber novas candidaturas, e que vagas e candidaturas existentes são preservadas.
  4. Ao entrar ou recarregar, a empresa vê "Conta empresarial suspensa" com o motivo e só o botão "Sair da conta".
  5. Quando o administrador reativa, o sistema volta a situação para "aprovada" e cria a notificação "Empresa reativada" ("Sua empresa foi reativada pela moderação e voltou a operar normalmente.").
- **Fluxos alternativos e exceções:**
  - Suspender empresa que não está aprovada: 409 "Só é possível suspender uma empresa que esteja aprovada." Reativar empresa que não está suspensa: 409 "Só é possível reativar uma empresa que esteja suspensa." Motivo com mais de 1.000 caracteres: 422 "Motivo deve ter no máximo 1000 caracteres."
  - Na tela do administrador, uma empresa suspensa só tem a ação "Reativar" (e o selo de verificada); Aprovar e Reprovar não aparecem.
  - A suspensão não altera o status de nenhuma vaga, e as vagas não são apagadas. Mesmo abertas, elas somem da lista pública `/vagas`, da busca global e da vitrine da página inicial. Terceiros que abrem a vaga por link recebem "não encontrada". Candidatos não conseguem se candidatar: 403 "Esta vaga não está disponível para candidaturas no momento." O Site mostra o perfil da empresa como indisponível para terceiros. As publicações da empresa continuam no feed, porque o servidor não filtra publicações por aprovação.
  - A empresa não consegue listar as candidaturas já recebidas (403 com a mensagem de suspensão), mas elas continuam gravadas e visíveis ao candidato.
  - Se a suspensão ocorre com a empresa logada, a tela só troca ao recarregar a sessão; as ações recebem 403.
  - Na reativação não há e-mail, só a notificação. Motivo, data e responsável da suspensão ficam guardados como histórico.
  - Falha no envio do e-mail (ou provedor não configurado) não desfaz a suspensão.
- **Pós-condições:** `status_aprovacao = suspensa`, `suspenso_em`, `suspenso_por_id` e `motivo_suspensao` gravados; notificação (tipo moderação); e-mail; auditoria "suspender_empresa" (e "reativar_empresa" depois).
- **Regras de negócio:** Suspensão e reativação usam campos próprios, separados da avaliação inicial (`AdminEmpresaService.suspenderEmpresa` e `reativarEmpresa`). Uma denúncia contra a empresa, quando resolvida com ação, executa a mesma suspensão, usando a observação do administrador como motivo (`DenunciaService`). O e-mail sai no idioma da conta da empresa, não no de quem modera.
- **Telas e endpoints:** `TelaStatusEmpresa`, `/admin/empresas`, `/admin/denuncias` (telas); `POST /api/admin/empresas/:id/suspender`, `POST /api/admin/empresas/:id/reativar` (API, administrador).

## Empresa — Painel e gestão de vagas

### UC-E06 — Consultar o painel da empresa
- **Ator:** Empresa aprovada.
- **Descrição:** Mostra quatro indicadores da empresa e reúne a gestão de vagas e de candidaturas na mesma tela.
- **Pré-condições:** Empresa aprovada.
- **Fluxo principal:**
  1. A empresa abre o menu do perfil e clica em "Painel de indicadores" (`/dashboard`, que redireciona a `/dashboard/empresa`).
  2. O sistema carrega a empresa (`GET /api/empresas/me`) e, se aprovada, as métricas.
  3. A tela mostra "Painel da empresa" com os cartões "Vagas publicadas" (total em qualquer situação), "Vagas abertas", "Candidaturas recebidas" (todas as vagas, qualquer situação, inclusive as canceladas) e "Seguidores".
  4. Abaixo ficam "Minhas vagas" (UC-E07) e, ao lado, as candidaturas da vaga escolhida (UC-E15).
- **Fluxos alternativos e exceções:**
  - Empresa não aprovada: em vez do painel, aparece o aviso da situação. A API devolve 403.
  - Falha ao carregar: "Não foi possível carregar suas métricas." com "Tentar novamente". Falha ao carregar a empresa: "Não foi possível carregar os dados da sua empresa. Tente novamente mais tarde."
  - Outros tipos de conta são redirecionados a `/feed` (`GuardaAcesso`). `GET /api/dashboard/empresa` responde 403 para quem não é empresa (inclusive o administrador).
  - O código do painel prevê uma frase "Resumo das candidaturas recebidas por status", mas o servidor não envia esse dado (devolve `vagas`, `vagasAbertas`, `candidaturas`, `candidaturasPendentes`, `postagens` e `seguidores`), então a frase nunca aparece. Os totais de candidaturas pendentes e de publicações são calculados, mas a tela não os mostra.
- **Pós-condições:** Nenhuma alteração de dados.
- **Regras de negócio:** As métricas são sempre da empresa da sessão (`DashboardService.empresa`) e exigem aprovação (`garantirEmpresaAprovadaSeForEmpresa`). Seguidores = contagem de `empresas_seguidas`.
- **Telas e endpoints:** `/dashboard` e `/dashboard/empresa` (telas); `GET /api/dashboard/empresa`, `GET /api/empresas/me` (API).

### UC-E07 — Listar as minhas vagas por situação
- **Ator:** Empresa aprovada.
- **Descrição:** Navega pelas vagas da empresa separadas em abas, com a quantidade de candidaturas de cada uma e as ações de gestão.
- **Pré-condições:** Empresa aprovada, no painel (UC-E06).
- **Fluxo principal:**
  1. No cartão "Minhas vagas", a empresa escolhe a aba "Aberta", "Arquivada" ou "Encerrada".
  2. O sistema lista as vagas daquela situação, da mais recente para a mais antiga, 5 por página.
  3. Cada cartão mostra título, local (cidade - UF), modalidade, contrato, salário, "Publicada em …", selo da situação e o selo "N candidaturas".
  4. Os botões do cartão são "Candidaturas", "Ver detalhes", "Editar", "Arquivar" e "Encerrar" (vaga aberta) ou "Reabrir" (vaga arquivada ou encerrada), "Encerrar" também na arquivada, e "Excluir".
- **Fluxos alternativos e exceções:**
  - Aba vazia: "Você ainda não tem vagas ativas. Publique a primeira acima.", "Nenhuma vaga arquivada por aqui." ou "Nenhuma vaga encerrada por aqui."
  - Erro: "Não foi possível carregar suas vagas." com "Tentar novamente". Mais de uma página: "Página anterior", "Próxima página" e "Página N de M".
  - Empresa não aprovada: 403. Conta de empresa sem registro de empresa: 403 "Apenas empresas com perfil completo podem gerenciar vagas."
- **Pós-condições:** Nenhuma alteração de dados.
- **Regras de negócio:** A contagem de candidaturas vem de uma consulta agregada por vaga (`VagaService.buscarPorEmpresaAutenticada`) e inclui candidaturas em qualquer situação. A situação interna "pausada" aparece na tela como "Arquivada". A API aceita `status`, `page` e `limit` (máximo 100); a tela usa 5 por página. A rota é só para conta de empresa (o administrador recebe 403).
- **Telas e endpoints:** `/dashboard/empresa` (tela); `GET /api/vagas/minhas?status=&page=&limit=` (API).

### UC-E08 — Publicar vaga
- **Ator:** Empresa aprovada.
- **Descrição:** Cria uma vaga com os dados da oportunidade e os recursos de acessibilidade oferecidos. A vaga entra aberta.
- **Pré-condições:** Empresa aprovada.
- **Fluxo principal:**
  1. No painel, em "Minhas vagas", a empresa clica em "Nova vaga". Abre o diálogo "Publicar nova vaga".
  2. Preenche Título da vaga\* (5 a 200 caracteres) e Descrição\* (mínimo 20 caracteres; o servidor aceita até 8.000).
  3. Opcionalmente informa Requisitos (até 4.000) e Benefícios (até 4.000).
  4. Escolhe Modalidade (Presencial, Híbrido ou Remoto; começa em Presencial) e Contrato (CLT, PJ, Estágio, Jovem aprendiz ou Temporário; começa em CLT).
  5. Informa Salário (R$), opcional, com ponto decimal e até 2 casas (ex.: 2500.00).
  6. Informa Cidade (com sugestão, até 100), Estado (UF, 2 letras; a tela limita a 2 e converte para maiúsculas) e Carga horária (até 50 caracteres, ex.: "40h semanais").
  7. Escolhe o Público da vaga: "Aberta a todos os públicos", "Exclusiva para pessoas com deficiência", "Exclusiva para pessoas 50+" ou "Para pessoas com deficiência e 50+". A tela começa com a opção exclusiva para PCD (se a API receber a vaga sem público, grava "geral").
  8. Marca os Recursos de acessibilidade da vaga: Intérprete de Libras, Tecnologia assistiva, Ambiente físico acessível, Banheiro adaptado, Elevador ou rampa de acesso, Jornada adaptável e Ferramentas digitais acessíveis.
  9. Opcionalmente escreve os Detalhes adicionais de acessibilidade (até 2.000), para o que não estiver na lista.
  10. Clica em "Publicar vaga". O sistema grava a vaga com situação "aberta", fecha o diálogo e mostra "Vaga "…" publicada com sucesso.". As listas e os indicadores do painel são atualizados.
- **Fluxos alternativos e exceções:**
  - O navegador só impõe título obrigatório de 5 a 200 caracteres e descrição obrigatória com no mínimo 20; os demais limites são do servidor. Erros voltam como 422 "Erro de validação." e a tela mostra a primeira mensagem: "O título deve ter entre 5 e 200 caracteres.", "Informe um salário numérico válido." (inclusive para vírgula decimal), "Use a sigla do estado (ex.: SP).".
  - Descrição acima de 8.000 caracteres é recusada com a mensagem "A descrição deve ter no mínimo 20 caracteres.", que não descreve o limite máximo. Requisitos, Benefícios, Cidade, Carga horária e Detalhes de acessibilidade acima do limite respondem apenas "Valor inválido.", sem dizer qual campo. A tela não limita a digitação desses campos.
  - O validador do salário aceita sinal ("-100", "+5") e não impõe valor máximo; a coluna guarda até 99.999.999,99.
  - Empresa não aprovada: 403 com a mensagem da situação. Conta sem registro de empresa: 403 "Apenas empresas com perfil completo podem gerenciar vagas." Conta que não é empresa: 403 "Você não possui permissão para esta ação."
  - Falha geral: "Não foi possível publicar a vaga." (ou a mensagem do servidor).
  - A tela não oferece a opção "Outro recurso" da lista (a API aceita o valor "outro"); o campo de detalhes cumpre esse papel.
  - A API aceita `status` inicial e `dataEncerramento` (AAAA-MM-DD), mas a tela não os oferece, e o código não encerra vagas automaticamente por data nem mostra essa data em lugar algum.
- **Pós-condições:** Nova linha em `vagas` ligada à empresa, situação "aberta", `oculta = false`. A vaga passa a aparecer em `/vagas`, na busca global, no perfil da empresa e, entre as 6 mais recentes, na vitrine da página inicial. Não há notificação aos seguidores da empresa nem publicação automática no feed.
- **Regras de negócio:** Só empresa aprovada publica (`garantirEmpresaAprovada`). O `empresaId` vem da sessão, nunca do corpo. Não há limite de quantidade de vagas. Os recursos de acessibilidade são uma lista fechada (`RECURSOS_ACESSIBILIDADE`, `vagaValidator.js`). "Exclusiva para PCD" é definida só pelo público-alvo da vaga ("pcd" ou "pcd_cinquenta_mais").
- **Telas e endpoints:** `/dashboard/empresa` (tela, diálogo "Nova vaga"); `POST /api/vagas` (API).

### UC-E09 — Editar vaga
- **Ator:** Empresa aprovada, dona da vaga.
- **Descrição:** Altera os dados de uma vaga já publicada, em qualquer situação.
- **Pré-condições:** Empresa aprovada e dona da vaga.
- **Fluxo principal:**
  1. Em "Minhas vagas", a empresa clica em "Editar" no cartão da vaga.
  2. O diálogo "Editar vaga" abre com os campos preenchidos (os mesmos de UC-E08, com os mesmos limites).
  3. A empresa altera o que quiser e clica em "Salvar alterações". A tela reenvia todos os campos; campo opcional esvaziado é gravado como vazio.
  4. O sistema grava, fecha o diálogo, mostra "Vaga atualizada com sucesso." e atualiza as listas e a página da vaga.
- **Fluxos alternativos e exceções:**
  - Validações iguais às de UC-E08 (422). Falha: "Não foi possível atualizar a vaga."
  - Vaga de outra empresa: 403 "Você não possui permissão sobre este recurso." Vaga inexistente: 404 "Vaga não encontrada."
  - Empresa não aprovada: 403 com a mensagem da situação.
  - A situação da vaga não é editada neste diálogo (veja UC-E10 a UC-E12), e a tela não envia nem altera data de encerramento (a API aceita ambos em `PUT`).
  - Vaga arquivada ou encerrada também pode ser editada, pois não há trava por situação.
- **Pós-condições:** Campos atualizados em `vagas`. Candidatos que já se candidataram não são avisados.
- **Regras de negócio:** Só a empresa dona edita (`garantirDono`); o administrador também consegue editar pela API (UC-E28). A edição é transacional.
- **Telas e endpoints:** `/dashboard/empresa` (tela, diálogo "Editar vaga"); `PUT /api/vagas/:id` (API).

### UC-E10 — Arquivar vaga
- **Ator:** Empresa aprovada, dona da vaga.
- **Descrição:** Tira a vaga aberta de circulação sem apagá-la nem as candidaturas. Internamente a situação é "pausada"; na tela aparece como "Arquivada".
- **Pré-condições:** Vaga com situação "aberta".
- **Fluxo principal:**
  1. No cartão da vaga aberta, a empresa clica em "Arquivar" (não há pedido de confirmação).
  2. O sistema muda a situação para "pausada" e mostra "Vaga arquivada.".
  3. A vaga passa para a aba "Arquivada" e os indicadores são atualizados.
- **Fluxos alternativos e exceções:**
  - Falha: "Não foi possível alterar o status da vaga."
  - Empresa não aprovada ou vaga de outra empresa: 403.
  - Candidatos não conseguem mais se candidatar: 400 "Esta vaga não está aberta para candidaturas." A vaga some de `/vagas` (que lista só abertas por padrão), mas a página dela continua acessível por link.
  - A empresa continua vendo as candidaturas já recebidas e pode mudar a situação delas.
- **Pós-condições:** `vagas.status = pausada`. Nenhum aviso aos candidatos.
- **Regras de negócio:** A API aceita qualquer troca entre "aberta", "pausada" e "encerrada" (`VagaService.alterarStatus`); as opções do cartão é que limitam o caminho na tela (veja as transições nas regras gerais). Candidatura só entra em vaga aberta (`CandidaturaService.criar`).
- **Telas e endpoints:** `/dashboard/empresa` (tela); `PATCH /api/vagas/:id/status` com `{ "status": "pausada" }` (API).

### UC-E11 — Encerrar vaga
- **Ator:** Empresa aprovada, dona da vaga.
- **Descrição:** Marca a vaga como encerrada (por exemplo, quando a posição foi preenchida).
- **Pré-condições:** Vaga "aberta" ou "arquivada".
- **Fluxo principal:**
  1. No cartão da vaga, a empresa clica em "Encerrar" (sem pedido de confirmação).
  2. O sistema muda a situação para "encerrada" e mostra "Vaga encerrada.".
  3. A vaga passa para a aba "Encerrada".
- **Fluxos alternativos e exceções:** Os mesmos de UC-E10 (falha "Não foi possível alterar o status da vaga.", 403 para empresa não aprovada ou vaga alheia, 400 para quem tentar se candidatar). Pode ser desfeito com "Reabrir" (UC-E12).
- **Pós-condições:** `vagas.status = encerrada`. Candidaturas ficam como estão; nenhum aviso aos candidatos.
- **Regras de negócio:** As do UC-E10. Não existe encerramento automático por data: o campo `dataEncerramento` é só um dado, sem rotina que o aplique.
- **Telas e endpoints:** `/dashboard/empresa` (tela); `PATCH /api/vagas/:id/status` com `{ "status": "encerrada" }` (API).

### UC-E12 — Reabrir vaga
- **Ator:** Empresa aprovada, dona da vaga.
- **Descrição:** Volta uma vaga arquivada ou encerrada para "aberta", aceitando candidaturas de novo.
- **Pré-condições:** Vaga "arquivada" (pausada) ou "encerrada".
- **Fluxo principal:**
  1. No cartão da vaga, a empresa clica em "Reabrir" (sem pedido de confirmação).
  2. O sistema muda a situação para "aberta" e mostra "Vaga reaberta.".
  3. A vaga volta à aba "Aberta" e reaparece na lista pública.
- **Fluxos alternativos e exceções:** Os mesmos de UC-E10 (falha "Não foi possível alterar o status da vaga.", 403 para empresa não aprovada ou vaga de outra empresa).
- **Pós-condições:** `vagas.status = aberta`. Quem já tinha se candidatado mantém a candidatura; ninguém é notificado.
- **Regras de negócio:** As do UC-E10. Os candidatos que já aplicaram não precisam aplicar de novo, e a regra "uma candidatura por candidato e vaga" continua valendo.
- **Telas e endpoints:** `/dashboard/empresa` (tela); `PATCH /api/vagas/:id/status` com `{ "status": "aberta" }` (API).

### UC-E13 — Excluir vaga
- **Ator:** Empresa aprovada, dona da vaga.
- **Descrição:** Apaga definitivamente a vaga e, em cascata, as candidaturas e os favoritos ligados a ela.
- **Pré-condições:** Empresa aprovada e dona da vaga.
- **Fluxo principal:**
  1. No cartão da vaga, a empresa clica em "Excluir".
  2. O sistema abre o diálogo "Excluir esta vaga?", avisando que a ação não pode ser desfeita e pode afetar dados relacionados, como candidaturas, e informando "Esta vaga tem N candidatura(s) registrada(s)." quando houver.
  3. A empresa confirma em "Excluir vaga" (ou cancela).
  4. O sistema apaga a vaga e mostra "Vaga excluída.".
- **Fluxos alternativos e exceções:**
  - Falha: "Não foi possível excluir a vaga."
  - Empresa não aprovada ou vaga de outra empresa: 403. Vaga inexistente: 404.
  - Para tirar a vaga de circulação sem perder o histórico, use "Arquivar" ou "Encerrar".
- **Pós-condições:** Remove `vagas`, `candidaturas` e `favoritos_vaga` da vaga (`ON DELETE CASCADE`). Os candidatos não são avisados e perdem o registro da candidatura.
- **Regras de negócio:** Exclusão física, não lógica (`VagaService.excluir`). Só a dona (ou o administrador, UC-E28) exclui. A API responde "Vaga removida com sucesso."; a tela mostra o próprio texto.
- **Telas e endpoints:** `/dashboard/empresa` (tela); `DELETE /api/vagas/:id` (API).

### UC-E14 — Ver a própria vaga como o público a vê
- **Ator:** Empresa aprovada, dona da vaga.
- **Descrição:** Abre a página pública da vaga e vai dela ao painel de gestão.
- **Pré-condições:** A vaga existe. (A página é pública, mas esta descrição trata da dona.)
- **Fluxo principal:**
  1. No cartão da vaga, a empresa clica em "Ver detalhes", ou abre uma notificação de candidatura (UC-E20).
  2. A página `/vaga/:vagaId` mostra título, empresa (com o selo "Verificada", quando houver), local, modalidade e contrato, e selos de situação, de público da vaga e de salário.
  3. Seguem as seções Descrição, Requisitos, Benefícios, Recursos de acessibilidade (com ícones), Detalhes adicionais de acessibilidade e Carga horária.
  4. No lugar dos botões do candidato aparece "Esta é uma das suas vagas. Gerenciar pelo painel da empresa", com link para `/dashboard/empresa`.
- **Fluxos alternativos e exceções:**
  - Vaga inexistente: "Vaga não encontrada", com "Tentar novamente" e "Ver todas as vagas".
  - Para a dona, os botões "Candidatar-se", "Favoritar" e "Conversar com a empresa" não aparecem. O menu "Denunciar vaga" também não aparece na vaga própria. Quando outra empresa abre a vaga, aparece "Candidatar-se" desativado com o aviso "Entre com uma conta de candidato para se candidatar a esta vaga." (UC-E30).
  - Vaga de empresa não aprovada: terceiros recebem 404; a dona e o administrador ainda a veem.
  - A página abre também para vagas arquivadas ou encerradas, com o selo da situação.
- **Pós-condições:** Nenhuma alteração de dados.
- **Regras de negócio:** `VagaService.buscarPorId` esconde a vaga de empresa não aprovada de quem não é dono nem administrador. O detalhe da vaga usa autenticação opcional. Limitação: a resposta de `GET /api/vagas/:id`, pública, traz o registro inteiro da empresa (inclusive campos internos como situação de aprovação, motivos de reprovação e suspensão guardados, CNPJ cifrado e seu hash); a tela só usa os dados de exibição.
- **Telas e endpoints:** `/vaga/:vagaId`, `/dashboard/empresa` (telas); `GET /api/vagas/:id` (API).

## Empresa — Candidaturas e candidatos

### UC-E15 — Ver as candidaturas recebidas de uma vaga
- **Ator:** Empresa aprovada, dona da vaga.
- **Descrição:** Lista as pessoas que se candidataram a uma vaga da empresa, com a situação de cada candidatura.
- **Pré-condições:** Empresa aprovada. A vaga é da empresa.
- **Fluxo principal:**
  1. No painel, a empresa clica em "Candidaturas" no cartão de uma vaga. O destaque do cartão indica a vaga selecionada.
  2. O sistema carrega as candidaturas, da mais recente para a mais antiga, 6 por página.
  3. O cartão "Candidaturas para "título da vaga"" lista, para cada pessoa, o nome, o título profissional ("Sem título informado" quando não houver), os botões de currículo (se ela enviou um) e a situação atual, com seletor para mudá-la (UC-E16).
- **Fluxos alternativos e exceções:**
  - Sem candidaturas: "Nenhuma candidatura recebida para esta vaga ainda." Sem vaga selecionada: "Selecione uma vaga para ver as candidaturas recebidas."
  - Erro: "Não foi possível carregar as candidaturas desta vaga." com "Tentar novamente". Mais de uma página: botões de página anterior e próxima.
  - Vaga de outra empresa: 403 "Você não tem permissão para ver as candidaturas desta vaga." Empresa não aprovada: 403 com a mensagem da situação (inclusive suspensa).
  - A lista mostra também candidaturas canceladas pelo candidato.
  - A tela não mostra a mensagem da candidatura nem a data, e o nome do candidato não é um link para o perfil (veja UC-E18). A API aceita filtro por `status`, que a tela não usa.
- **Pós-condições:** Nenhuma alteração de dados.
- **Regras de negócio:** Só a dona (ou o administrador) vê as candidaturas, e só com a empresa aprovada (`CandidaturaService.listarDaVaga`). A API devolve à empresa o registro completo do candidato (inclusive campos privados e os campos de CPF) e, da conta, id, nome, e-mail e foto; a tela não exibe esses dados. Isso é permitido porque a pessoa se candidatou a uma vaga da empresa.
- **Telas e endpoints:** `/dashboard/empresa` (tela); `GET /api/vagas/:vagaId/candidaturas?page=&limit=&status=` (API).

### UC-E16 — Atualizar a situação de uma candidatura
- **Ator:** Empresa aprovada, dona da vaga. Ator secundário: Candidato (é notificado; UC-C22).
- **Descrição:** Registra o andamento da análise de uma candidatura.
- **Pré-condições:** A candidatura é de uma vaga da empresa, que está aprovada.
- **Fluxo principal:**
  1. Na lista de candidaturas (UC-E15), a empresa abre o seletor "Atualizar status da candidatura de …" e escolhe Em análise, Aprovada ou Rejeitada.
  2. O sistema grava a nova situação imediatamente (sem confirmação) e mostra "Status da candidatura atualizado.".
  3. O sistema cria para o candidato a notificação "Sua candidatura foi atualizada" ("Sua candidatura para a vaga "…" foi atualizada para Em análise."), enviada em tempo real e, havendo aplicativo instalado, por push.
  4. A lista e os indicadores do painel são atualizados.
- **Fluxos alternativos e exceções:**
  - O seletor também lista "Pendente", mas essa mudança é recusada pelo servidor: 400 "A empresa não pode aplicar este status." A tela mostra só "Não foi possível atualizar o status." (toda falha de atualização mostra essa frase) e a situação não muda.
  - "Cancelada" é recusada para a empresa com a mesma resposta 400. A API aceita "visualizada" (a tela não oferece e o sistema nunca a aplica sozinho). Valor desconhecido: 422 "Status de candidatura inválido." O administrador pode aplicar qualquer situação pela API.
  - Candidatura de outra empresa: 403 "Apenas a empresa dona da vaga pode alterar o status." Empresa não aprovada: 403 com a mensagem da situação.
  - O código não impõe ordem entre as situações nem bloqueia mudar uma candidatura já cancelada pelo candidato. O seletor não tem opção para "Cancelada" nem "Visualizada".
  - "Aprovada" não é contratação: o ACESSO não registra contratação.
  - Não há e-mail ao candidato, só a notificação. Pelo código, nenhuma preferência de Configurações, Notificações silencia esse aviso (veja UC-E20).
- **Pós-condições:** `candidaturas.status` atualizado e uma notificação (tipo candidatura, subtipo `candidatura_atualizada`, com link para a vaga) para o candidato.
- **Regras de negócio:** `STATUS_EMPRESA` (visualizada, em análise, aprovada, rejeitada) são os únicos que a empresa aplica (`CandidaturaService.atualizarStatus`). A posse e a aprovação são checadas antes da troca e antes da checagem do status. A notificação é criada na mesma transação da mudança. Pela API, toda requisição bem-sucedida gera notificação, mesmo repetindo o valor atual.
- **Telas e endpoints:** `/dashboard/empresa` (tela); `PATCH /api/candidaturas/:id/status` (API).

### UC-E17 — Visualizar e baixar o currículo do candidato
- **Ator:** Empresa, com candidatura recebida do candidato (no Site, aprovada).
- **Descrição:** Abre o currículo do candidato em outra aba ou o baixa, por um link temporário. O arquivo é o enviado em UC-C14; o candidato vê o próprio em UC-C15.
- **Pré-condições:** O candidato se candidatou a uma vaga da empresa e enviou currículo (PDF, DOC ou DOCX).
- **Fluxo principal:**
  1. Na lista de candidaturas (UC-E15) ou na seção "Currículo" do perfil do candidato (UC-E18), a empresa clica em "Visualizar currículo" ou em "Baixar currículo". Os botões só aparecem quando o servidor informa o nome do arquivo, o que só acontece para quem está autorizado e quando existe currículo.
  2. O sistema confere a autorização a cada clique (regra em "Quem vê o que do candidato") e gera um link assinado.
  3. "Visualizar" abre o arquivo em nova aba. "Baixar" força o download com o nome original do arquivo.
- **Fluxos alternativos e exceções:**
  - Sem permissão: 403 "Você não tem permissão para acessar este currículo." Sem currículo: 404 "Este candidato ainda não enviou um currículo." Bloqueio entre empresa e candidato nega o acesso.
  - Falha: "Não foi possível abrir o currículo." ou "Não foi possível baixar o currículo." Se o navegador bloquear a aba, o Site tenta abrir de novo.
  - O link vale 5 minutos por padrão (`SIGNED_URL_EXPIRES_SECONDS`). Passado esse prazo, é preciso clicar de novo; o link nunca é salvo. Sem o armazenamento Supabase configurado, o arquivo fica em disco local e o endereço não expira.
  - A verificação olha só se existe candidatura (de qualquer situação, até cancelada) a uma vaga da empresa. Ela não consulta a situação de aprovação da empresa; quem barra a empresa não aprovada é a tela de status do Site.
- **Pós-condições:** Nenhuma alteração de dados; o currículo continua no armazenamento privado.
- **Regras de negócio:** O currículo fica em bucket privado e só é acessado por URL assinada. Autorizados: o próprio candidato, a empresa que tem candidatura dele numa vaga própria e o administrador (`candidatoPrivacidade.js`, `CandidatoService.gerarUrlCurriculo`).
- **Telas e endpoints:** `/dashboard/empresa`, `/perfil/:usuarioId` (telas); `GET /api/candidatos/:id/curriculo`, `GET /api/candidatos/:id/curriculo/download` (API; `:id` é o id do candidato).

### UC-E18 — Consultar o perfil de um candidato
- **Ator:** Empresa aprovada.
- **Descrição:** Vê o perfil profissional de uma pessoa candidata. Quando ela se candidatou a uma vaga da empresa, o perfil inclui a seção de currículo. A abertura de perfil de terceiros é a de UC-G14; aqui estão as diferenças para empresa.
- **Pré-condições:** Empresa aprovada; conhecer o candidato (busca, feed, notificações ou outro caminho).
- **Fluxo principal:**
  1. A empresa chega ao perfil por busca global ou feed (UC-G02, UC-G03), ou por um link de perfil. A lista de candidaturas não tem link para o perfil.
  2. O sistema abre `/perfil/:usuarioId` e carrega o perfil do candidato.
  3. A tela mostra nome, foto, capa, título profissional, cidade e estado, contadores de seguidores e seguindo (que abrem as listas, UC-G15), "Sobre mim", deficiências informadas (só os nomes), experiência profissional, formação acadêmica, habilidades, certificados e publicações.
  4. Se a empresa tem candidatura dessa pessoa em uma vaga própria, aparece também a seção "Currículo", com o nome do arquivo e os botões de UC-E17.
  5. Estão disponíveis "Enviar mensagem" (UC-E19), "Seguir" (UC-G16 e UC-G17) e o menu para bloquear ou denunciar (UC-G30, UC-G29).
- **Fluxos alternativos e exceções:**
  - Bloqueio entre as contas: "Este perfil não está disponível."
  - Perfil privado do candidato não impede ver o perfil profissional: só as publicações dependem de ser seguidor aprovado.
  - Sem candidatura, a empresa vê só os dados públicos, sem a seção "Currículo".
  - A API entrega à empresa autorizada também dados privados (CPF, data de nascimento, gênero, endereço, CEP, pretensão salarial, necessidades de acessibilidade, arquivo dos certificados e e-mail). A tela atual não os exibe.
  - Não existe tela de "busca de talentos" para a empresa (UC-E31).
- **Pós-condições:** Nenhuma alteração de dados.
- **Regras de negócio:** Veja "Quem vê o que do candidato" nas regras gerais: `podeVerDadosPrivados` libera os dados privados ao dono, ao administrador e à empresa com candidatura de qualquer situação, sem consultar a aprovação da empresa. Para os demais, uma lista permitida (`CAMPOS_PUBLICOS_CANDIDATO`) esconde tudo que não é explicitamente público. O bloqueio sempre nega.
- **Telas e endpoints:** `/perfil/:usuarioId` (tela); `GET /api/perfil/candidatos/usuario/:usuarioId`, `GET /api/seguir/resumo/:usuarioId`, `GET /api/postagens/usuario/:usuarioId/linha-do-tempo` (API). As rotas `GET /api/perfil/candidatos/:candidatoId` e `GET /api/candidatos/:id` aplicam a mesma regra e não têm tela.

### UC-E19 — Conversar com o candidato
- **Ator:** Empresa aprovada. Ator secundário: Candidato.
- **Descrição:** Inicia ou continua uma conversa privada com um candidato. As telas e o fluxo geral são os de UC-G22 a UC-G24; aqui estão as regras que dependem de a conta ser de empresa.
- **Pré-condições:** Empresa aprovada; o destinatário está ativo e sem bloqueio com a empresa.
- **Fluxo principal:**
  1. No perfil do candidato (UC-E18), a empresa clica em "Enviar mensagem". O botão consulta antes se é permitido.
  2. O sistema abre ou recupera a conversa e leva a `/mensagens`.
  3. A empresa escreve e envia mensagens; o candidato recebe em tempo real. Candidatos também podem iniciar a conversa pelo botão "Conversar com a empresa" na página da vaga (UC-C24).
- **Fluxos alternativos e exceções:**
  - Sem permissão, o botão aparece desativado ("Mensagens indisponíveis") com o motivo em texto.
  - Preferência do destinatário (UC-G36), na ótica da empresa que inicia: "Todos" permite; "Apenas empresas" permite; "Apenas seguidores" exige que a empresa siga o candidato (vínculo pessoa a pessoa, que pode depender de aprovação se o perfil for privado); "Apenas pessoas que você segue" exige que o candidato siga a empresa; "Apenas seguidores que você também segue" exige os dois vínculos; "Ninguém" recusa ("Este usuário desativou o recebimento de novas mensagens.").
  - Bloqueio em qualquer sentido: 403 "Não é possível iniciar esta conversa." Conversa que já existe é reaberta sem rever a preferência. Destinatário inativo ou bloqueado: "Usuário não encontrado."
  - Com a opção "Apenas empresas" escolhida pela própria empresa, só outras empresas conseguem iniciar conversa com ela; candidatos recebem "Apenas empresas podem iniciar conversas com este usuário."
  - Empresa não aprovada: 403 ao abrir conversa, listar, abrir uma conversa, ler, enviar e marcar como lidas. A contagem de não lidas e a consulta "pode iniciar" não têm essa trava.
  - A conversa com o candidato não depende de ele ter se candidatado.
- **Pós-condições:** Conversa e mensagens gravadas, com notificação ("Nova mensagem recebida") e contagem de não lidas para o destinatário.
- **Regras de negócio:** `ConversaService.podeIniciarConversa` (preferência) e `BloqueioService` (bloqueio). `garantirEmpresaAprovadaSeForEmpresa` vale para as operações listadas acima. A preferência é checada só ao criar uma conversa nova.
- **Telas e endpoints:** `/perfil/:usuarioId`, `/mensagens` (telas); `GET /api/conversas/pode-iniciar/:usuarioId`, `POST /api/conversas`, `GET /api/conversas`, `GET /api/conversas/:conversaId/mensagens`, `POST /api/conversas/:conversaId/mensagens` (API).

## Empresa — Avisos da plataforma

### UC-E20 — Receber avisos da plataforma
- **Ator:** Empresa.
- **Descrição:** A empresa é avisada de eventos que a afetam por notificações no sino do Site e, em alguns casos, por e-mail. A central de notificações é a de UC-G25 a UC-G27; aqui estão os eventos próprios da empresa.
- **Pré-condições:** Conta de empresa; para ler no Site, empresa aprovada (a tela de status esconde `/notificacoes` das demais situações).
- **Fluxo principal:**
  1. Um evento acontece. Os principais:
     - "Nova candidatura recebida" ("Fulano se candidatou à vaga "…""), com link para a vaga;
     - "Novo seguidor" ("Fulano começou a seguir sua empresa"), com link para o perfil de quem seguiu;
     - "Cadastro aprovado" ou "Cadastro reprovado" (o link leva ao perfil da própria empresa);
     - "Empresa suspensa" ou "Empresa reativada";
     - "Vaga ocultada pela moderação" ou "Vaga voltou a ficar visível";
     - "Conta bloqueada" ou "Conta reativada";
     - "E-mail confirmado", "Senha alterada" e "E-mail alterado";
     - avisos comuns do feed e das mensagens (curtidas, comentários, "Nova mensagem recebida", publicação removida pela moderação, "Denúncia analisada"), descritos em UC-G.
  2. O sistema grava a notificação, a entrega em tempo real (Socket.IO) e, havendo aplicativo instalado, por push.
  3. A empresa abre `/notificacoes`, onde o contador do sino mostra as não lidas, e clica na notificação para ir ao conteúdo relacionado.
- **Fluxos alternativos e exceções:**
  - E-mails enviados à empresa: confirmação de cadastro e de troca de e-mail, recuperação de senha, suspensão da empresa, bloqueio de conta e senha alterada (quando o envio está configurado). Não há e-mail para nova candidatura, aprovação, reprovação ou reativação.
  - Publicar, editar, arquivar, encerrar ou excluir vaga não gera aviso a ninguém. A mudança de status ou a exclusão feitas pela moderação também não geram aviso (UC-E28).
  - Nenhuma preferência de Configurações, Notificações (UC-G28) silencia avisos hoje: a checagem usa chaves com inicial maiúscula ("Vaga", "Candidatura", "Mensagem", "Feed") e os tipos gravados são minúsculos. Avisos de conta (sistema e moderação) nunca seriam filtrados de qualquer forma.
  - Textos são traduzidos no idioma da conta de quem recebe.
- **Pós-condições:** Registro em `notificacoes`, não lido até a empresa abrir ou marcar como lido.
- **Regras de negócio:** `NotificacaoService.criar` (criação, preferência, tempo real e push) e `CandidaturaService.criar` (aviso de candidatura na mesma transação). O aviso de nova candidatura é enviado ao usuário da empresa, não ao candidato. "Novo seguidor", aprovação, reprovação e bloqueio são do tipo sistema; suspensão e reativação, do tipo moderação.
- **Telas e endpoints:** `/notificacoes`, `/configuracoes/notificacoes` (telas); `GET /api/notificacoes`, `GET /api/notificacoes/nao-lidas`, `PATCH /api/notificacoes/lidas` (API).

## Empresa — Perfil da empresa

### UC-E21 — Ver o perfil da empresa
- **Ator:** Empresa aprovada (e, no outro sentido, qualquer pessoa autenticada ou visitante vendo uma empresa; a visão de terceiros também está em UC-G14).
- **Descrição:** Mostra o perfil institucional da empresa: dados, vagas, seguidores e publicações.
- **Pré-condições:** Empresa aprovada.
- **Fluxo principal:**
  1. A empresa abre o menu do perfil e clica em "Ver perfil" (`/perfil`). Para a empresa, `/perfil` mostra o perfil empresarial.
  2. A tela mostra banner, logotipo, nome (nome fantasia ou razão social), selo "Aprovada", selo de verificada (se houver), razão social, setor, cidade e estado, link "Site" e "N seguidores". Em seguida vêm "Sobre a empresa", "Cultura de inclusão", "Vagas publicadas" e "Publicações". O porte, o CNPJ e o endereço não aparecem.
  3. Em "Vagas publicadas", a empresa vê as suas 10 mais recentes, em qualquer situação, cada uma com link, local, modalidade e selo de situação. Vazio: "Nenhuma vaga publicada ainda.".
  4. O botão "Editar perfil da empresa" leva a UC-E22.
- **Fluxos alternativos e exceções:**
  - Erro: "Não foi possível carregar os dados da sua empresa. Tente novamente mais tarde."
  - Visão de terceiros (`/perfil/:usuarioId`): vê os mesmos dados, mas só as vagas abertas, com "Enviar mensagem", "Seguir" e o menu para bloquear ou denunciar a empresa. O total de seguidores não abre lista.
  - Empresa não aprovada: terceiros veem "Este perfil não está disponível." A própria empresa vê a tela de status.
  - Com "Perfil público" desligado em Configurações, Privacidade (UC-G35), o servidor recusa o perfil empresarial a terceiros (403 "Este perfil não está disponível."). A tela de terceiros recorre ao perfil genérico de usuário (nome, foto e publicações), sem dados da empresa e, pelo código atual, com o rótulo "Administrador do ACESSO" no lugar do setor.
  - Bloqueio entre as contas: "Este perfil não está disponível."
  - O perfil não tem campos de redes sociais; só o link do site.
- **Pós-condições:** Nenhuma alteração de dados.
- **Regras de negócio:** `EmpresaService.buscarPorUsuarioPublico` aplica bloqueio e privacidade (`BloqueioService.garantirVisibilidadePerfil`). Para terceiros, só vagas abertas. O servidor não filtra por situação de aprovação no perfil público nem na lista `GET /api/empresas` (a tela é que esconde). Vagas ocultadas pela moderação ainda aparecem aqui, porque a consulta não filtra `oculta`. Limitação verificada: o registro devolvido por `GET /api/empresas`, `GET /api/empresas/parceiras` (rotas sem login), `GET /api/empresas/:id` e `GET /api/empresas/usuario/:usuarioId` é o da empresa inteira, incluindo o CNPJ decifrado, `cnpjCifrado`, `cnpjHash`, endereço, CEP e campos de moderação; a tela não exibe esses dados.
- **Telas e endpoints:** `/perfil`, `/perfil/:usuarioId` (telas); `GET /api/empresas/me`, `GET /api/empresas/usuario/:usuarioId`, `GET /api/empresas/:id`, `GET /api/seguir/resumo/empresas/:empresaId` (API).

### UC-E22 — Editar os dados do perfil da empresa
- **Ator:** Empresa aprovada.
- **Descrição:** Atualiza as informações institucionais exibidas no perfil público da empresa.
- **Pré-condições:** Empresa aprovada.
- **Fluxo principal:**
  1. A empresa clica em "Editar perfil da empresa" (em `/perfil`) ou em "Editar dados da empresa" (em Configurações, Conta; UC-G32). O diálogo "Editar perfil da empresa" abre, com banner e logo no topo (UC-E23 e UC-E24).
  2. Altera os campos: Razão social\* (3 a 200), Nome fantasia (até 200), Descrição (até 4.000), Cultura de inclusão (até 4.000), Setor (até 120), Porte (MEI, Microempresa, Pequena, Média ou Grande), Site, Cidade (até 100, com sugestão), UF (2 letras), Endereço e CEP (8 números, sem traço).
  3. Clica em "Salvar". O sistema grava, fecha o diálogo e mostra "Perfil da empresa atualizado.".
- **Fluxos alternativos e exceções:**
  - Erro: "Não foi possível atualizar o perfil da empresa." (ou a mensagem do servidor). Validações do servidor (422): "Informe a razão social (3 a 200 caracteres).", "Porte inválido.", "Informe uma URL válida.", "Use a sigla do estado (ex.: SP).", "O CEP deve conter 8 dígitos numéricos."; nos demais campos com limite, "Valor inválido.".
  - O campo Site usa `type="url"` no navegador (exige o endereço completo); o servidor aceita endereço sem protocolo.
  - Empresa não aprovada: 403 com a mensagem da situação. Empresa de outra conta: 403 "Você não possui permissão sobre este recurso."
  - CNPJ, país e e-mail de acesso não são editáveis por aqui. O nome do responsável e o telefone da conta de empresa também não têm tela de edição. A API ignora `empresaVerificada` e `cnpj` enviados por quem não é administrador.
  - A tela não limita o tamanho do endereço (o servidor também não).
  - Pela API, `PUT /api/empresas/:id` também aceita `logo` e `capa` como texto livre (sem checar que são arquivos enviados) e `null` para esvaziá-los; a tela usa os endpoints de upload.
- **Pós-condições:** Campos atualizados em `empresas`; as telas que mostram a empresa passam a exibir os novos dados.
- **Regras de negócio:** Só os campos de `CAMPOS_EDITAVEIS` são aceitos; dona ou administrador, e empresa aprovada (`EmpresaService.atualizar`, `garantirDono`, `garantirEmpresaAprovada`). A edição é transacional.
- **Telas e endpoints:** `/perfil`, `/configuracoes/conta` (telas); `PUT /api/empresas/:id` (API).

### UC-E23 — Trocar o logotipo
- **Ator:** Empresa aprovada.
- **Descrição:** Envia uma imagem para ser o logotipo exibido no perfil, nas vagas e nas buscas.
- **Pré-condições:** Empresa aprovada, com o diálogo de edição aberto (UC-E22).
- **Fluxo principal:**
  1. No diálogo, em "Logo", a empresa clica no botão de câmera "Alterar logo".
  2. Escolhe uma imagem PNG, JPEG ou WEBP de até 5 MB. A tela recomenda 400 × 400 px.
  3. O sistema confere o arquivo, envia ao armazenamento público e grava o novo logo. Mostra "Foto atualizada.".
  4. O logo anterior é apagado do armazenamento.
- **Fluxos alternativos e exceções:**
  - Formato fora da lista: "Formato inválido. Envie uma imagem PNG, JPEG ou WEBP." Arquivo maior que 5 MB: "Imagem muito grande. O tamanho máximo permitido é 5 MB." (a tela confere antes de enviar e o servidor repete a checagem: "Arquivo muito grande. Limite de 5MB para este tipo.").
  - O servidor confere o conteúdo real do arquivo: "O conteúdo do arquivo não corresponde a um arquivo válido do formato declarado."
  - Falha: "Não foi possível enviar a foto."
  - Empresa não aprovada ou de outra conta: 403, antes de o arquivo ser guardado.
  - Não existe opção para remover o logo na tela, só trocá-lo.
- **Pós-condições:** `empresas.logo` aponta para o novo arquivo (`empresas/<empresaId>/<uuid>.ext`, com o armazenamento Supabase configurado) e o arquivo antigo é removido.
- **Regras de negócio:** A autorização acontece antes do envio (`garantirEmpresaAprovadaMiddleware`), para não deixar arquivo órfão. O tamanho máximo vem de `MAX_UPLOAD_BYTES` (5 MB por padrão). Só imagens PNG, JPEG e WEBP.
- **Telas e endpoints:** `/perfil`, `/configuracoes/conta` (diálogo de edição); `PATCH /api/empresas/:id/logo` (API, campo `logo`).

### UC-E24 — Trocar ou remover o banner
- **Ator:** Empresa aprovada.
- **Descrição:** Envia uma nova imagem de capa para o perfil da empresa ou remove a atual.
- **Pré-condições:** Empresa aprovada, com o diálogo de edição aberto (UC-E22).
- **Fluxo principal:**
  1. No diálogo, em "Banner", a empresa clica em "Alterar capa" e escolhe uma imagem PNG, JPEG ou WEBP de até 5 MB (recomendado 1584 × 396 px).
  2. O sistema envia, grava e mostra "Capa atualizada.". A capa anterior é apagada do armazenamento.
  3. Para remover, a empresa clica em "Remover banner" (visível quando há capa). O sistema mostra "Banner removido.".
- **Fluxos alternativos e exceções:**
  - Mesmas validações e mensagens de UC-E23 ("Formato inválido…", "Imagem muito grande…"). Falha de envio: "Não foi possível enviar a capa."; falha ao remover: "Não foi possível remover o banner.".
  - Empresa não aprovada: 403.
  - "Remover banner" só limpa o campo `capa` no banco; pelo código, o arquivo antigo continua guardado no armazenamento.
- **Pós-condições:** `empresas.capa` com o novo caminho ou nulo.
- **Regras de negócio:** Mesmas de UC-E23.
- **Telas e endpoints:** `/perfil`, `/configuracoes/conta` (diálogo de edição); `PATCH /api/empresas/:id/capa` (campo `capa`) e `PUT /api/empresas/:id` com `{ "capa": null }` (API).

### UC-E25 — Acompanhar os seguidores da empresa
- **Ator:** Empresa aprovada. Ator secundário: Candidato (quem segue; UC-G19).
- **Descrição:** A empresa acompanha quantas pessoas a seguem e é avisada de cada novo seguidor.
- **Pré-condições:** Empresa aprovada.
- **Fluxo principal:**
  1. Um candidato clica em "Seguir" no perfil da empresa. O sistema registra o vínculo e cria para a empresa a notificação "Novo seguidor" ("Fulano começou a seguir sua empresa").
  2. A empresa vê o total em "N seguidores" no perfil e no cartão "Seguidores" do painel.
  3. Se o candidato deixa de seguir, o total diminui; não há aviso.
- **Fluxos alternativos e exceções:**
  - Só candidatos seguem empresas: outra empresa que clica em "Seguir" recebe 403 "Apenas candidatos podem seguir empresas." (o botão aparece, mas a ação falha e é desfeita na tela, com aviso de erro).
  - Bloqueio entre as contas: 403 "Você não pode seguir esta empresa."
  - A tela mostra só o número. Não há lista de quem segue nem como remover um seguidor.
  - A empresa não pode seguir outras empresas, mas pode seguir pessoas (UC-G16 e UC-G17).
- **Pós-condições:** Registro em `empresas_seguidas` e notificação (tipo sistema, subtipo `novo_seguidor_empresa`).
- **Regras de negócio:** `SeguidorService.alternarEmpresa` exige que o seguidor tenha perfil de candidato e não esteja bloqueado, e não consulta a aprovação da empresa. Não há solicitação de aprovação para seguir empresa.
- **Telas e endpoints:** `/perfil`, `/dashboard/empresa` (telas); `POST /api/seguir/empresas/:empresaId`, `GET /api/seguir/resumo/empresas/:empresaId` (API).

## Empresa — Conta

### UC-E26 — Pausar ou excluir a conta da empresa
- **Ator:** Empresa aprovada (a tela de status não dá acesso às configurações).
- **Descrição:** Pausa o acesso à conta ou apaga a conta definitivamente. As telas e o fluxo são os de UC-G41 e UC-G42; este caso descreve os efeitos para uma empresa.
- **Pré-condições:** Estar logada na conta da empresa e saber a senha atual.
- **Fluxo principal:**
  1. Em Configurações, Conta, na "Zona de risco", a empresa escolhe "Pausar conta" ou "Excluir conta".
  2. O sistema abre um diálogo de confirmação e pede a senha atual.
  3. Pausar: o sistema encerra todas as sessões da conta e o Site volta ao `/entrar`. Para voltar, a empresa entra de novo e confirma a reativação (UC-V24).
  4. Excluir: o sistema apaga a conta em definitivo e o Site volta à página inicial.
- **Fluxos alternativos e exceções:**
  - Senha errada: 401 "Senha atual incorreta."
  - A tela diz que o perfil fica indisponível enquanto a conta está pausada. Pelo código, `pausadoPeloUsuario` só é consultado no login: o perfil da empresa, as vagas abertas e o recebimento de candidaturas continuam como antes. Só a empresa fica sem entrar.
  - Excluir apaga a conta, a empresa e, em cascata, as vagas, as candidaturas e os favoritos ligados a elas, mais publicações, conversas e vínculos. Remove do armazenamento o logo, a capa e a foto de perfil e os anexos das publicações, e arquiva as denúncias pendentes contra a empresa. Os candidatos não são avisados.
  - A conta de candidato vinculada não é apagada junto; o vínculo é apenas registrado em `usuario_candidato_id`.
  - Limite de 10 tentativas com falha a cada 15 minutos por IP.
- **Pós-condições:** Pausa: `pausado_pelo_usuario = true`, `pausado_em` e sessões revogadas. Exclusão: linhas removidas por `ON DELETE CASCADE`, arquivos removidos do armazenamento (melhor esforço; falhas são registradas em log) e denúncias arquivadas com a observação "Encerrada automaticamente: a conta denunciada foi excluída.".
- **Regras de negócio:** `AutenticacaoService.pausarConta` e `excluirConta` (que usa `AdminUsuarioService.excluirContaDefinitivamente`, o mesmo núcleo da exclusão pelo administrador). A senha atual é obrigatória nas duas ações. Se a conta de candidato for apagada, a empresa continua existindo (o vínculo vira nulo).
- **Telas e endpoints:** `/configuracoes/conta` (tela); `POST /api/auth/conta/pausar`, `DELETE /api/auth/conta` (API).

## Empresa — Efeitos das decisões do administrador

### UC-E27 — Receber o selo "Empresa verificada"
- **Ator:** Empresa. Ator secundário: Administrador (UC-A14).
- **Descrição:** O administrador concede ou retira um selo de confiança, independente da aprovação do cadastro.
- **Pré-condições:** A empresa existe, em qualquer situação.
- **Fluxo principal:**
  1. Em `/admin/empresas`, o administrador marca a empresa como verificada.
  2. O sistema grava `empresa_verificada = true` e registra a auditoria "verificar_empresa".
  3. O selo (ícone de verificado e texto "Empresa verificada") passa a aparecer no perfil da empresa, nos cartões e no detalhe das vagas, na busca global, na vitrine da página inicial e em Descobrir.
- **Fluxos alternativos e exceções:**
  - O administrador pode tirar o selo a qualquer momento (auditoria "remover_verificacao_empresa"). A empresa continua publicando vagas.
  - A empresa não pede nem edita o selo: o campo é ignorado em `PUT /api/empresas/:id` quando não vem de administrador.
  - Não há notificação nem e-mail à empresa sobre o selo.
- **Pós-condições:** `empresas.empresa_verificada` alterado e registro de auditoria.
- **Regras de negócio:** Aprovação e verificação são independentes (`AdminEmpresaService.verificarEmpresa`). A verificação não é pré-requisito para aparecer em vitrines.
- **Telas e endpoints:** `/admin/empresas`, `/perfil`, `/vagas` (telas); `POST /api/admin/empresas/:id/verificar` com `{ "verificada": true|false }` (API, administrador).

### UC-E28 — Ter vaga ocultada, alterada ou removida pela moderação
- **Ator:** Empresa (afetada). Ator secundário: Administrador (UC-A19, UC-A26 a UC-A29).
- **Descrição:** A moderação pode ocultar, mudar o status ou excluir vagas da empresa. A empresa só é avisada quando a vaga é ocultada.
- **Pré-condições:** A vaga existe.
- **Fluxo principal:**
  1. Ao resolver uma denúncia contra uma vaga com a ação "ocultar", ou pelo endpoint de ocultação, o administrador marca a vaga como oculta.
  2. O sistema grava `oculta = true`, cria para a empresa a notificação "Vaga ocultada pela moderação" ("Sua vaga "…" foi ocultada pela moderação e não aparece mais nas buscas.") e registra a auditoria "ocultar_vaga".
  3. Se o administrador reverte (só pela API), a notificação é "Vaga voltou a ficar visível" (auditoria "reexibir_vaga").
  4. Em `/admin/vagas`, o administrador também pode mudar o status da vaga e excluí-la. A empresa vê o resultado na lista de vagas, sem aviso.
- **Fluxos alternativos e exceções:**
  - Alterar o status ou excluir pela moderação gera só auditoria ("alterar_status_vaga", "excluir_vaga"), sem notificação à empresa.
  - O administrador também edita vagas pela API, e a regra de aprovação não vale para ele.
  - Pelo código atual, "oculta" é respeitada pela busca global e pela vitrine da página inicial, mas não pela lista `/vagas` (`VagaService.listar`), pelo perfil da empresa, pela página da vaga nem pela regra de candidatura. A mensagem da notificação promete mais do que isso.
  - Não há tela do administrador para reexibir (nem para ocultar diretamente) uma vaga; só pela denúncia ou pela API.
- **Pós-condições:** `vagas.oculta` ou `status` alterados, ou vaga excluída (com as candidaturas); notificação (só na ocultação e na reexibição); auditoria.
- **Regras de negócio:** `AdminConteudoService.alternarVisibilidadeVaga`; `VagaService.alterarStatus` e `excluir` registram auditoria quando quem age é um administrador que não é dono da vaga. Uma denúncia contra vaga só admite a ação "ocultar" (`DenunciaService`).
- **Telas e endpoints:** `/admin/vagas`, `/admin/denuncias`, `/notificacoes` (telas); `POST /api/admin/vagas/:id/ocultar`, `PATCH /api/vagas/:id/status`, `DELETE /api/vagas/:id` (API, administrador).

### UC-E29 — Ter a conta bloqueada pela moderação
- **Ator:** Empresa (afetada). Ator secundário: Administrador (UC-A06 a UC-A08).
- **Descrição:** O administrador bloqueia a conta de login da empresa, impedindo qualquer acesso.
- **Pré-condições:** Conta de empresa existente (não administrativa).
- **Fluxo principal:**
  1. Em `/admin/usuarios`, o administrador clica em "Bloquear". Essa tela não pede motivo; o motivo (até 1.000 caracteres) só entra ao resolver uma denúncia de tipo usuário (a observação vira o motivo) ou pela API.
  2. O sistema marca a conta como bloqueada e inativa, cria a notificação "Conta bloqueada" ("Sua conta foi bloqueada. Motivo: …", ou "não informado") e envia o e-mail "Conta bloqueada".
  3. Se a empresa estiver logada, a próxima requisição recebe 403 "Sua conta foi bloqueada pela moderação do ACESSO." (com "Motivo: …" quando houver). O Site encerra a sessão e mostra a mensagem por 10 segundos.
  4. Novas tentativas de login: "Usuário desativado." (o bloqueio também marca a conta como inativa, e o login confere a conta inativa antes do bloqueio; por isso o motivo não aparece aí, só quando uma sessão aberta é derrubada).
  5. Ao desbloquear, a conta volta a ser usada e a notificação é "Conta reativada" (sem e-mail).
- **Fluxos alternativos e exceções:**
  - O bloqueio não altera a situação de aprovação da empresa nem esconde as vagas. Pelo código, as vagas continuam públicas e a empresa só fica sem entrar para gerenciá-las.
  - O administrador também pode excluir a conta definitivamente, com os mesmos efeitos de UC-E26 e auditoria.
  - A ação não vale contra a própria conta do administrador nem contra outro administrador.
  - Falha no e-mail (ou provedor não configurado) não desfaz o bloqueio.
- **Pós-condições:** `usuarios.bloqueado = true`, `ativo = false`, `bloqueado_em` e `motivo_bloqueio`; notificação, e-mail e auditoria "bloquear_usuario".
- **Regras de negócio:** `AdminUsuarioService.alternarBloqueio`. O bloqueio é checado antes de "desativado" para mostrar o motivo (`autenticacaoMiddleware`). `garantirAlvoDeAcaoAdministrativa` impede agir contra administradores.
- **Telas e endpoints:** `/admin/usuarios`, `/entrar` (telas); `POST /api/admin/usuarios/:id/bloquear`, `DELETE /api/admin/usuarios/:id` (API, administrador).

## Empresa — Vagas públicas e recursos só da API

### UC-E30 — Consultar as vagas publicadas por outras empresas
- **Ator:** Empresa aprovada.
- **Descrição:** Usa a lista pública de vagas e a página de detalhe como qualquer visitante (UC-V07, UC-V08 e UC-V09), mas sem poder agir como candidato.
- **Pré-condições:** Empresa aprovada.
- **Fluxo principal:**
  1. A empresa clica em "Vagas" no cabeçalho e abre `/vagas`.
  2. O sistema lista as vagas abertas de empresas aprovadas, 10 por página, com os filtros de UC-V08. As vagas da própria empresa aparecem como as demais.
  3. A empresa abre uma vaga em `/vaga/:vagaId` (UC-V09). Para a vaga de outra empresa, o nome da empresa leva ao perfil dela (UC-G14).
- **Fluxos alternativos e exceções:**
  - Em cada cartão, "Favoritar" mostra o aviso informativo "Entre com uma conta de candidato para favoritar vagas." e nada é gravado. A API também recusa (403 "Você não possui permissão para esta ação.").
  - Na página de vaga de outra empresa, "Candidatar-se" fica desativado e aparece "Entre com uma conta de candidato para se candidatar a esta vaga."; "Favoritar" e "Conversar com a empresa" não aparecem. "Denunciar vaga" está disponível (UC-G29).
  - Na vaga própria, vale UC-E14.
  - A limitação do texto de busca (enviado como `q` e ignorado pelo servidor) descrita em UC-V08 vale também aqui.
- **Pós-condições:** Nenhuma alteração de dados.
- **Regras de negócio:** `/vagas` e `/vaga/:vagaId` não exigem login, mas usam a estrutura do app; por isso a empresa não aprovada vê a tela de status no lugar delas.
- **Telas e endpoints:** `/vagas`, `/vaga/:vagaId` (telas); `GET /api/vagas`, `GET /api/vagas/:id` (API).

### UC-E31 — Usar recursos da empresa que existem só na API
- **Ator:** Empresa (com token válido). Não há tela no Site para nenhum destes recursos.
- **Descrição:** A API oferece recursos que o Site hoje não usa. Eles são descritos aqui porque uma empresa pode acioná-los diretamente.
- **Pré-condições:** Sessão de empresa. Nenhum destes recursos consulta a situação de aprovação da empresa, exceto as estatísticas da vaga.
- **Fluxo principal:**
  1. Busca de talentos: `GET /api/candidatos` com `nome`, `cidade`, `estado` e `deficienciaId` (e `page`/`limit`, máximo 100). Liberada a empresa e administrador. Lista os candidatos com conta ativa, 10 por página por padrão.
  2. Estatísticas de uma vaga: `GET /api/vagas/:id/estatisticas` devolve o total de candidaturas e o total por situação. Exige empresa dona e aprovada.
  3. Detalhe de uma candidatura: `GET /api/candidaturas/:id`, para o candidato dono, a empresa dona da vaga ou o administrador.
  4. Filtro de candidaturas por situação (`?status=` em `GET /api/vagas/:vagaId/candidaturas`), marcar candidatura como "visualizada" (UC-E16) e informar `dataEncerramento` na vaga (UC-E08).
- **Fluxos alternativos e exceções:**
  - Conta que não é empresa nem administrador na busca de talentos: 403 "Você não possui permissão para esta ação."
  - Estatísticas ou detalhe de vaga ou candidatura de outra empresa: 403 ("Você não possui permissão sobre este recurso." e "Acesso negado a esta candidatura.").
  - O método `listarCandidatos` do Site existe, mas nenhuma tela o usa, e ele envia o parâmetro `busca`, que o servidor não lê (o servidor lê `nome`).
- **Pós-condições:** Nenhuma alteração de dados.
- **Regras de negócio:** A busca de talentos não passa pelo filtro de privacidade do perfil individual: devolve o registro completo de cada candidato ativo (inclusive CPF e outros campos privados) junto com os dados da conta (como e-mail e telefone), e não exige empresa aprovada. O detalhe de candidatura também não confere a aprovação. É um ponto a observar, não um recurso planejado.
- **Telas e endpoints:** nenhuma; `GET /api/candidatos`, `GET /api/vagas/:id/estatisticas`, `GET /api/candidaturas/:id` (API).

## Empresa — O que a empresa não consegue fazer

Limites do código atual. A tabela traz o que a empresa não faz porque é restrito a outros tipos de conta ou a quem tem a conta aprovada.

| Ação | O que acontece |
| --- | --- |
| Candidatar-se, cancelar candidatura, favoritar vaga, ver "minhas candidaturas" e "vagas favoritas" | Restritas a candidato (cancelar também ao administrador). Na vaga, "Candidatar-se" fica desativado com o aviso "Entre com uma conta de candidato para se candidatar a esta vaga."; na lista, "Favoritar" mostra "Entre com uma conta de candidato para favoritar vagas.". A API responde 403 "Você não possui permissão para esta ação." |
| Seguir outra empresa; ver "empresas que sigo" | 403 "Apenas candidatos podem seguir empresas."; `GET /api/empresas/seguindo` é só de candidato |
| Painel do candidato (`/dashboard/candidato`) | Redirecionada a `/feed` |
| Experiências, formações, certificados e habilidades; currículo próprio e importação de currículo | Rotas `/api/perfil/:recurso` (candidato) e `/api/candidatos/:id/curriculo` (só o dono) não servem à empresa |
| Gerir vagas, ver candidaturas ou editar o perfil de outra empresa | 403 "Você não possui permissão sobre este recurso." / "Você não tem permissão para ver as candidaturas desta vaga." / "Apenas a empresa dona da vaga pode alterar o status." |
| Mudar aprovação, selo de verificada ou CNPJ | Só o administrador; os campos são ignorados quando vêm da empresa |
| Pedir nova análise depois de reprovada, ou reenviar o cadastro | Não há tela nem rota; o CNPJ continua ocupado |
| Excluir a empresa separadamente | `DELETE /api/empresas/:id` é só do administrador (sem tela no painel). A empresa só exclui a conta inteira (UC-E26) |
| Ver quem são os seguidores ou removê-los | Só o total é exibido |
| Mudar o país, remover o logo, editar nome do responsável e telefone da conta | Não há tela para isso |
| Aplicar "Pendente" ou "Cancelada" a uma candidatura | Recusado pelo servidor (UC-E16) |
| Encerrar vaga automaticamente por data | Não existe rotina; `dataEncerramento` é só um dado |
| Notificar candidatos ou seguidores ao publicar, arquivar, encerrar ou excluir vaga | Não existe |
| Contratar: registrar contratação | O ACESSO não registra contratação; "Aprovada" é só uma situação da candidatura |
| Qualquer recurso empresarial sem aprovação | Bloqueado pela tela de status e pelo servidor (veja "O que cada situação permite e bloqueia") |

Funcionalidades que existem só na API, sem tela no Site (detalhadas em UC-E31): busca de talentos, estatísticas por vaga, detalhe de uma candidatura, filtro de candidaturas por situação, data de encerramento da vaga e a situação "visualizada".
