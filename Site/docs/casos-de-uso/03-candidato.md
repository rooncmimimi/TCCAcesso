## Candidato

O **Candidato** é a conta de uma pessoa que busca emprego (tipo de usuário `candidato`). Esta seção descreve o que o Site faz hoje, segundo o código da branch `claude/zealous-pasteur-2cu3a1`. O aplicativo Android (`App/AcessoApk`) é um projeto separado e não é tratado aqui.

Convenções:

- "Tela" é a rota do Site (frontend); "API" é o endpoint do servidor, sempre sob o prefixo `/api`.
- **Limite de upload:** 5 MB (5.242.880 bytes, variável `MAX_UPLOAD_BYTES`). Acima disso o servidor responde 400 "Arquivo excede o tamanho máximo permitido." Nos envios de foto, capa e currículo o servidor também confere a assinatura binária do arquivo; se o conteúdo não for do formato declarado, responde 400 "O conteúdo do arquivo não corresponde a um arquivo válido do formato declarado." Formatos aceitos: foto e capa em PNG, JPEG ou WEBP; currículo em PDF, DOC ou DOCX; importação de dados do currículo só em PDF ou DOCX.
- O status de vaga `pausada` aparece para o usuário como "Arquivada".
- Na maioria das ações, quando o servidor recusa, a tela mostra a mensagem dele (a primeira mensagem de validação, se houver; senão a mensagem geral) e só usa um texto próprio se o servidor não mandar nenhum. A exceção neste ator é o cancelamento de candidatura (UC-C23), que mostra sempre o texto próprio. O servidor escreve as mensagens no idioma da interface; aqui elas estão em português.
- O cadastro em etapas (UC-C01 a UC-C03) é descrito por inteiro na seção do visitante (UC-V11 a UC-V17); aqui ficam só as diferenças da conta de candidato. Entrar na conta, recuperar senha, confirmar e-mail e entrar com Google também são do visitante (UC-V19 a UC-V27).
- Funções comuns a contas autenticadas (feed, mensagens, notificações, seguir, denunciar, bloquear, configurações, acessibilidade, idioma, busca global, perfil de terceiros) estão na seção UC-G e só são citadas abaixo quando há diferença específica do candidato.

### Tabela-resumo

| ID | Caso de uso | Resumo |
| --- | --- | --- |
| UC-C01 | Criar conta de candidato | Etapas 1 e 2 do cadastro (UC-V11, UC-V12); aqui, o que a conta de candidato recebe: sessão aberta, CPF cifrado e e-mail sem confirmação obrigatória. |
| UC-C02 | Completar o perfil profissional no cadastro | Etapa 3, opcional (UC-V14, UC-V15); aqui, o que ela grava no perfil e no currículo. |
| UC-C03 | Concluir ou retomar o cadastro | Etapa 4 e finalização (UC-V16, UC-V17); aqui, a conferência do servidor e o destino depois de finalizar. |
| UC-C04 | Consultar o painel do candidato | Quatro contadores, candidaturas recentes e vagas favoritas. |
| UC-C05 | Consultar o próprio perfil | Tela `/perfil` com dados, currículo, deficiências, experiências, formações, habilidades e certificados. |
| UC-C06 | Editar dados pessoais e profissionais | Formulário "Editar perfil" com nome, telefone, título, resumo, localidade, links, disponibilidade e pretensão. |
| UC-C07 | Trocar a foto de perfil | Envio de imagem PNG, JPEG ou WEBP de até 5 MB. |
| UC-C08 | Trocar ou remover a capa do perfil | Envio de banner (mesmos limites) ou remoção do banner atual. |
| UC-C09 | Declarar deficiências no perfil | Escolhe categorias do catálogo e escreve observações opcionais. |
| UC-C10 | Gerenciar experiências profissionais | Adicionar, editar e remover experiências. |
| UC-C11 | Gerenciar formações | Adicionar, editar e remover formações acadêmicas. |
| UC-C12 | Gerenciar habilidades | Adicionar, editar e remover habilidades, com nível livre. |
| UC-C13 | Gerenciar certificados | Adicionar, editar e remover certificados (sem anexo de arquivo). |
| UC-C14 | Enviar ou substituir o currículo | Envia PDF, DOC ou DOCX (até 5 MB) para o armazenamento privado. |
| UC-C15 | Visualizar e baixar o currículo | Abre ou baixa o arquivo por link assinado que vale 5 minutos. |
| UC-C16 | Importar dados do currículo para o perfil | Extrai um rascunho (sem IA) de PDF ou DOCX, revisa e só então grava. |
| UC-C17 | Buscar e filtrar vagas | Lista `/vagas` e filtros (UC-V07, UC-V08); aqui, o que muda para o candidato: o coração de favoritar. |
| UC-C18 | Ver o detalhe de uma vaga | Página `/vaga/:id` (UC-V09); aqui, as ações do candidato sobre a vaga. |
| UC-C19 | Favoritar e desfavoritar vaga | Alterna o coração na lista ou no detalhe. |
| UC-C20 | Consultar vagas favoritas | Lista paginada de favoritas no painel e em "Minha atividade". |
| UC-C21 | Candidatar-se a uma vaga | Um clique em "Candidatar-se"; a empresa recebe aviso. |
| UC-C22 | Acompanhar o status das candidaturas | Lista com selo de status e aviso quando a empresa muda o status. |
| UC-C23 | Cancelar candidatura | Confirma o cancelamento no painel; a candidatura fica como "Cancelada". |
| UC-C24 | Iniciar conversa com a empresa da vaga | Botão "Conversar com a empresa" (UC-G22) abre o chat com o usuário da empresa. |
| UC-C25 | Cadastrar uma empresa a partir da conta de candidato | Cria uma segunda conta, de empresa, vinculada à de candidato (passo a passo em UC-E01). |
| UC-C26 | Acompanhar a aprovação da empresa | A conta da empresa fica "em análise" até um administrador decidir (telas em UC-E03 a UC-E05). |
| UC-C27 | Controlar quem vê os dados do candidato | Perfil público ou privado e a regra fixa entre dados abertos e dados só da empresa autorizada. |

## Candidato — Cadastro e entrada na plataforma

### UC-C01 — Criar conta de candidato
- **Ator:** Visitante que se torna Candidato. Secundários: serviço de e-mail (código de confirmação) e Google (opcional, só quando configurado no servidor).
- **Descrição:** As etapas 1 (Conta) e 2 (Dados pessoais) do assistente de cadastro criam a conta e o perfil de candidato. O passo a passo, os campos e as mensagens estão em UC-V11 e UC-V12 (com Google, UC-V19). Este caso registra só o que é específico da conta de candidato.
- **Pré-condições:** Sem sessão; e-mail e CPF ainda não cadastrados.
- **Fluxo principal:**
  1. O visitante percorre as etapas "Conta" e "Informações pessoais" (UC-V11, UC-V12) em `/cadastro/candidato`.
  2. Ao clicar em "Criar conta", o sistema cria usuário e perfil de candidato numa única transação, abre a sessão e leva à etapa 3 (UC-C02).
- **Fluxos alternativos e exceções:** Todas as validações e recusas (campos obrigatórios, e-mail ou CPF já cadastrados, data de nascimento futura, limite de tentativas) estão em UC-V12. Do CPF só se confere que há 11 números; não há cálculo de dígito verificador.
- **Pós-condições:**
  - Gravados o usuário (tipo `candidato`, idioma da interface, data e versão do aceite dos documentos, Google vinculado se houve) e o perfil (CPF cifrado com hash para unicidade, país `BR`, data de nascimento, cidade e UF).
  - O e-mail fica com `emailVerificado = falso`. Se o envio de e-mail estiver configurado, sai uma mensagem com código de 6 dígitos válido por 15 minutos.
  - As preferências de acessibilidade que estavam na tela são gravadas na conta em segundo plano.
  - Não há notificação nem registro de auditoria.
- **Regras de negócio:**
  - O tipo de conta nunca vem do corpo da requisição: este endpoint sempre cria `candidato` (`AutenticacaoService.cadastrarCandidato`).
  - O candidato usa a conta sem confirmar o e-mail (o login só barra e-mail não confirmado nas contas que não são de candidato, `entrarComUsuario`), e o Site nunca cobra a confirmação de um candidato já logado.
  - O país não é perguntado: o Site envia sempre `BR` (`dados/localidade.ts`).
  - O CPF é guardado cifrado (AES-256-GCM) e nenhuma tela o mostra depois do cadastro. A API o devolve ao próprio dono, ao administrador e à empresa autorizada (UC-C27).
- **Telas e endpoints:** `/cadastro` (redireciona) e `/cadastro/candidato`; `POST /api/auth/register/candidato`; `GET /api/auth/google/disponivel`; `GET /api/candidatos/me`.

### UC-C02 — Completar o perfil profissional no cadastro
- **Ator:** Candidato (recém-cadastrado). Secundário: sistema de extração de texto do currículo.
- **Descrição:** A etapa 3 do assistente (currículo opcional, título, escolaridade, resumo, experiências, formações e habilidades) está descrita em UC-V14 (importar o currículo) e UC-V15 (montar o perfil). Este caso registra o que ela grava na conta de candidato.
- **Pré-condições:** Ter concluído a etapa 2 (UC-C01) ou estar retomando o cadastro (UC-C03).
- **Fluxo principal:**
  1. O candidato anexa o currículo (opcional) e preenche o que quiser, como em UC-V14 e UC-V15.
  2. Ao clicar em "Continuar" (ou "Continuar sem currículo"), o sistema grava tudo de uma vez e segue para a etapa 4.
- **Fluxos alternativos e exceções:**
  - Arquivo que não seja PDF ou DOCX, ou acima de 5 MB: a tela avisa "PDF ou DOCX, até 5 MB. O envio é opcional." e não envia.
  - PDF escaneado (só imagem), `.doc` e DOCX sem texto: o servidor recusa a extração com mensagem própria (textos em UC-C16); a tela mostra essa mensagem (sem texto do servidor, "Não foi possível ler este arquivo. Tente outro, ou preencha manualmente.") e descarta o anexo.
  - Só são gravados itens completos: experiência com cargo, empresa e início; formação com instituição e curso. Itens incompletos são descartados sem aviso.
  - A gravação é sequencial e sem transação: se falhar no meio, o que já foi criado permanece (UC-V15).
- **Pós-condições:**
  - Atualizados título profissional, escolaridade e resumo, além de LinkedIn e GitHub quando o currículo os contém.
  - Criadas as experiências, formações e habilidades confirmadas (experiência sem data de fim vira "atual"; formação sem data de conclusão vira "em andamento").
  - O arquivo vira o currículo oficial (armazenamento privado, UC-C14) só neste momento, e só se houver arquivo.
- **Regras de negócio:**
  - O extrator é o mesmo do UC-C16: cargo, empresa e datas nunca são preenchidos por ele; o trecho encontrado vira a descrição sugerida. Ele nunca lê nem sugere CPF (`parsearCurriculo.js`).
  - Diferente do UC-C16, aqui o resumo, as habilidades, o LinkedIn e o GitHub encontrados são aproveitados, e importar de novo substitui as listas da tela em vez de somá-las.
- **Telas e endpoints:** `/cadastro/candidato` (etapa 3); `POST /api/candidatos/:id/curriculo/importar`; `PUT /api/candidatos/:id`; `POST /api/perfil/experiencias`, `/formacoes` e `/habilidades`; `PATCH /api/candidatos/:id/curriculo`.

### UC-C03 — Concluir ou retomar o cadastro
- **Ator:** Candidato.
- **Descrição:** A etapa 4 (acessibilidade) e a finalização estão em UC-V16; a retomada de quem parou no meio, em UC-V17. Este caso registra a conferência feita pelo servidor e o destino depois de finalizar.
- **Pré-condições:** Conta criada (UC-C01).
- **Fluxo principal:**
  1. Na etapa 4, o candidato ajusta o painel de acessibilidade (nada ali é obrigatório) e clica em "Finalizar cadastro".
  2. O sistema marca o cadastro como concluído e leva ao `/feed`.
  3. Quem não finalizou entra de novo por `/entrar`, é levado a `/cadastro/candidato?retomar=true` e volta na etapa 3.
- **Fluxos alternativos e exceções:**
  - Se país, data de nascimento, cidade ou estado estiverem vazios, o servidor recusa (400) com "Para concluir o cadastro, preencha: …" e a pessoa permanece na etapa.
  - `?retomar=true` só vale para quem está logado como candidato.
  - Quem veio por "Sou empresa" (`?depois=empresa`) vê "Continuar para o cadastro da empresa" e é levado a `/cadastro/empresa` (UC-C25) em vez do feed.
  - Como em UC-V16, a etapa 4 não grava as preferências de acessibilidade: "Finalizar cadastro" só conclui o cadastro.
- **Pós-condições:** `cadastroConcluidoEm` é gravado na primeira conclusão e não é reescrito se a conclusão se repetir.
- **Regras de negócio:** Currículo e foto continuam opcionais e nunca impedem a conclusão (`AutenticacaoService.concluirCadastro`).
- **Telas e endpoints:** `/cadastro/candidato` (etapa 4); `/entrar`; `/feed`; `POST /api/auth/cadastro/concluir`; `GET /api/candidatos/me`.

## Candidato — Painel

### UC-C04 — Consultar o painel do candidato
- **Ator:** Candidato.
- **Descrição:** Visão resumida da atividade do candidato: contadores e duas listas (candidaturas recentes e vagas favoritas).
- **Pré-condições:** Autenticado como candidato. Quem não está logado vai a `/entrar`; outros tipos de conta são redirecionados ao `/feed`.
- **Fluxo principal:**
  1. No menu do avatar, o candidato escolhe "Painel de indicadores" (`/dashboard`, que encaminha a `/dashboard/candidato`).
  2. O sistema mostra quatro cartões: **Candidaturas** (total de qualquer status, inclusive canceladas), **Vagas favoritas**, **Publicações** (publicações ativas dele no feed) e **Seguidores**.
  3. Abaixo, "Minhas candidaturas recentes" (UC-C22) e "Vagas favoritas" (UC-C20), lado a lado.
- **Fluxos alternativos e exceções:**
  - Erro ao carregar os contadores: "Não foi possível carregar suas métricas." com botão "Tentar novamente".
  - A API também calcula "em andamento" (pendente, visualizada, em análise) e "aprovadas", mas a tela não mostra esses números. A frase "Resumo das suas candidaturas por status" existe no código, mas não aparece, porque a API não envia `candidaturasPorStatus`.
  - Os cartões não são links.
- **Pós-condições:** Nenhuma alteração de dados.
- **Regras de negócio:** As métricas são sempre do candidato logado, sem receber id pela URL (`DashboardService.candidato`).
- **Telas e endpoints:** `/dashboard`, `/dashboard/candidato`; `GET /api/dashboard/candidato`.

## Candidato — Perfil profissional

### UC-C05 — Consultar o próprio perfil
- **Ator:** Candidato.
- **Descrição:** Tela única com tudo o que o candidato cadastrou e as ações de edição.
- **Pré-condições:** Autenticado.
- **Fluxo principal:**
  1. O candidato abre o menu do avatar → "Ver perfil" (ou "Ver meu perfil" no cartão lateral do feed), em `/perfil`.
  2. O sistema mostra, de cima para baixo: capa, foto, nome, título profissional (ou o atalho "Adicionar título profissional"), "cidade - UF" (quando há cidade) e as contagens de seguidores e seguindo (que abrem a lista, UC-G15).
  3. Em seguida: "Sobre mim" (só se o resumo estiver preenchido); "Preferências de acessibilidade" (chips só dos recursos ativados no aparelho: Leitura por voz, Libras (VLibras), Alto contraste, Fonte para dislexia, ou "Nenhuma preferência de acessibilidade ativada.", com o link "Ajustar preferências de acessibilidade"); e um cartão com as seções Currículo, "Informações de acessibilidade" (deficiências), Experiência profissional, Formação acadêmica, Habilidades e Certificados. No fim, "Publicações".
- **Fluxos alternativos e exceções:**
  - Seção sem itens mostra "Nada cadastrado ainda."; falha ao carregar uma seção: "Não foi possível carregar essa seção." Em "Informações de acessibilidade" a mensagem vazia é "Nenhuma informação de acessibilidade cadastrada. Adicionar é opcional e ajuda empresas a oferecer os recursos certos."
  - Data de nascimento, gênero, escolaridade, disponibilidade, pretensão salarial, LinkedIn, GitHub e necessidades de acessibilidade são gravados, mas **não são exibidos** na tela de perfil, nem para o dono; aparecem só no formulário de edição (UC-C06).
  - Nas listas, a descrição, o local e a modalidade das experiências, o link e a validade dos certificados também não são exibidos. A experiência sem data de fim e não marcada como atual mostra "início — ?".
- **Pós-condições:** Nenhuma alteração de dados.
- **Regras de negócio:** A seção de preferências de acessibilidade só aparece no perfil próprio. A seção "Currículo" aparece no perfil próprio e, no perfil de terceiros, só para quem o UC-C27 autoriza (empresa com candidatura do candidato e administrador). Quem vê o perfil de outra pessoa tem as seções vazias omitidas (UC-G14).
- **Telas e endpoints:** `/perfil` (empresa e administrador usam o mesmo caminho com conteúdo próprio); `GET /api/candidatos/me`; `GET /api/perfil/experiencias`, `/formacoes`, `/habilidades` e `/certificados`; `GET /api/seguir/resumo/:usuarioId`.

### UC-C06 — Editar dados pessoais e profissionais
- **Ator:** Candidato.
- **Descrição:** Altera os dados da conta e do perfil num único formulário.
- **Pré-condições:** Autenticado como candidato.
- **Fluxo principal:**
  1. O candidato clica em "Editar perfil" em `/perfil`, no atalho "Adicionar título profissional" ou, em Configurações → Conta, no botão "Editar nome, telefone e localidade" (UC-G32).
  2. No formulário, altera os campos: nome; telefone; título profissional; sobre mim; data de nascimento; gênero; cidade (com sugestões do IBGE, aceita texto livre) e estado (UF); escolaridade; LinkedIn; GitHub; disponibilidade; pretensão salarial (R$); necessidades de acessibilidade.
  3. Clica em "Salvar". O sistema grava os dados da conta e depois os do perfil, atualiza o nome mostrado na sessão e confirma com "Perfil atualizado."
- **Fluxos alternativos e exceções:**
  - Limites na tela: nome de 3 a 150 caracteres (obrigatório); telefone até 20; título até 150; sobre mim até 2000; UF até 2; gênero até 40; escolaridade até 120; disponibilidade até 100; necessidades de acessibilidade até 2000.
  - Validação no servidor: nome de 3 a 150 ("Informe um nome entre 3 e 150 caracteres."); telefone de 10 a 20 caracteres ("Informe um telefone válido."); gênero até 40; sobre mim até 2000; escolaridade até 120; cidade até 100; disponibilidade até 100; "Use a sigla do estado (ex.: SP)."; "Informe uma data de nascimento válida (AAAA-MM-DD)."; "Informe uma URL válida para o LinkedIn." (e para o GitHub); "Informe um valor numérico válido." A pretensão aceita até 2 casas decimais com ponto (ex.: 3500.50); o formato com vírgula é recusado. O servidor não valida o tamanho do título profissional nem das necessidades de acessibilidade (a coluna do título tem 150 caracteres; acima disso, por chamada direta à API, o banco recusa e a resposta é o erro interno "Erro ao consultar o banco de dados.").
  - Campo esvaziado é gravado como vazio (a tela envia `null`). Isso vale também para data de nascimento, cidade e UF, que eram obrigatórios no cadastro: a edição não os exige.
  - As duas gravações acontecem em sequência: se a segunda falhar, o nome e o telefone já foram atualizados, e a tela mostra a mensagem do servidor ou "Não foi possível atualizar o perfil."
  - CPF, país, endereço e CEP não são editáveis pela tela (a API aceita). O e-mail muda em Configurações → Conta (UC-G33).
- **Pós-condições:** Dados atualizados em `usuarios` e `candidatos`. Sem notificação, e-mail ou auditoria.
- **Regras de negócio:**
  - Só o dono (ou administrador) altera o perfil (`garantirDono`).
  - Campos privados e públicos seguem o UC-C27.
  - Se o CPF for enviado e já existir em outro perfil: 409 "Este CPF já está cadastrado." (só via API).
- **Telas e endpoints:** `/perfil`, `/configuracoes/conta`; `PUT /api/usuarios/:id`; `PUT /api/candidatos/:id`.

### UC-C07 — Trocar a foto de perfil
- **Ator:** Candidato.
- **Descrição:** Envia uma nova foto que aparece no perfil, no cabeçalho, no feed e nas buscas.
- **Pré-condições:** Autenticado.
- **Fluxo principal:**
  1. No formulário "Editar perfil" (UC-C06), o candidato clica no botão da câmera ("Alterar foto") sobre o avatar.
  2. Escolhe uma imagem PNG, JPEG ou WEBP de até 5 MB (a tela recomenda 400 × 400 px).
  3. O envio acontece na hora, sem esperar o "Salvar". O sistema confirma com "Foto atualizada."
- **Fluxos alternativos e exceções:**
  - A tela confere antes de enviar: formato fora da lista, "Formato inválido. Envie uma imagem PNG, JPEG ou WEBP."; acima de 5 MB, "Imagem muito grande. O tamanho máximo permitido é 5 MB."
  - O servidor repete as regras. Formato fora da lista: o mesmo "Formato inválido. Envie uma imagem PNG, JPEG ou WEBP." Acima de 5 MB: "Arquivo excede o tamanho máximo permitido." Conteúdo diferente do formato declarado: "O conteúdo do arquivo não corresponde a um arquivo válido do formato declarado."
  - Falha no armazenamento: "Não foi possível enviar o arquivo agora. Tente novamente em alguns instantes." (503). Sem mensagem do servidor, a tela mostra "Não foi possível enviar a foto."
  - Não existe ação para só remover a foto; ela só é substituída.
- **Pós-condições:** Caminho novo em `usuarios.foto_perfil`; a foto anterior é apagada do armazenamento depois que a nova é confirmada (melhor esforço). Sem notificação nem auditoria.
- **Regras de negócio:** A foto fica no armazenamento público (bucket público, pasta `perfis/<usuarioId>/`), isto é, o arquivo tem URL pública; as telas de perfil só a mostram a usuários autenticados. A autorização (dono ou administrador) é conferida antes de o arquivo ser enviado.
- **Telas e endpoints:** `/perfil` (formulário de edição); `PATCH /api/usuarios/:id/foto` (campo `foto`).

### UC-C08 — Trocar ou remover a capa do perfil
- **Ator:** Candidato.
- **Descrição:** Define ou retira o banner exibido no topo do perfil.
- **Pré-condições:** Autenticado.
- **Fluxo principal:**
  1. No formulário "Editar perfil", o candidato clica em "Alterar capa" sobre o banner.
  2. Escolhe PNG, JPEG ou WEBP de até 5 MB (a tela recomenda 1584 × 396 px). O envio é imediato, com confirmação "Capa atualizada."
  3. Para retirar, clica em "Remover banner" (visível só quando há capa); o sistema confirma com "Banner removido." e o perfil volta à cor sólida.
- **Fluxos alternativos e exceções:** As mesmas mensagens de formato, tamanho, conteúdo e armazenamento do UC-C07; sem mensagem do servidor, a tela mostra "Não foi possível enviar a capa." Falha ao remover: "Não foi possível remover o banner."
- **Pós-condições:** `usuarios.capa_perfil` atualizado (ou limpo). Na troca, o arquivo anterior é apagado do armazenamento.
- **Regras de negócio:** A capa também fica no bucket público. Ao remover, o campo é limpo, mas o código não apaga o arquivo antigo do armazenamento (só a troca o faz).
- **Telas e endpoints:** `/perfil`; `PATCH /api/usuarios/:id/capa` (campo `capa`); `PUT /api/usuarios/:id` com `capaPerfil: null`.

### UC-C09 — Declarar deficiências no perfil
- **Ator:** Candidato. Secundários que consultam o resultado: outros usuários autenticados e empresas.
- **Descrição:** O candidato escolhe, entre categorias de um catálogo, as deficiências que quer declarar e pode escrever observações. A declaração é opcional.
- **Pré-condições:** Autenticado como candidato; catálogo carregado. O catálogo inicial (migração `0002`) tem 8 categorias: física, auditiva, visual, surdocegueira, intelectual, psicossocial, Transtorno do Espectro Autista e múltipla; administradores podem alterá-lo.
- **Fluxo principal:**
  1. Na seção "Informações de acessibilidade" de `/perfil`, o candidato clica em "Adicionar".
  2. No diálogo "Adicionar deficiência ao perfil", escolhe uma opção da lista (só aparecem as ainda não declaradas) e, se quiser, escreve "Observações (opcional)".
  3. Clica em "Adicionar" e o sistema confirma com "Deficiência adicionada ao perfil."
  4. Para retirar, clica no "x" do selo da deficiência; a remoção é imediata, sem pedir confirmação, com "Deficiência removida do perfil."
- **Fluxos alternativos e exceções:**
  - Observações com no máximo 1000 caracteres.
  - Sem opções disponíveis: "Nenhuma opção disponível".
  - Não existe campo de nível ou grau da deficiência, nem envio de laudo; o detalhe vai só nas observações.
  - As observações são gravadas, mas a tela não as exibe depois de salvas (nem para o dono). Para alterar uma observação, é preciso remover a deficiência e adicioná-la de novo (a API atualiza a observação quando o vínculo já existe, mas a tela esconde as deficiências já declaradas).
  - Vínculo já existente (via API): atualiza a observação em vez de duplicar. Remover um vínculo que não existe: 404 "Vínculo não encontrado."
- **Pós-condições:** Vínculo `candidato_deficiencias` criado ou removido. Sem notificação nem auditoria.
- **Regras de negócio:**
  - Quem enxerga: os **nomes** das deficiências declaradas ficam na lista pública do candidato (qualquer usuário autenticado e não bloqueado, mesmo com perfil privado). A tela de terceiros mostra só os nomes, mas a resposta da API de perfil (`GET /api/perfil/candidatos/usuario/:usuarioId`) devolve também o texto das observações, sem o filtro de privacidade (`candidatoPrivacidade.js` não esconde `deficiencias`).
  - Declarar deficiência não é pré-requisito para se candidatar a vaga exclusiva PCD (ver UC-C21).
- **Telas e endpoints:** `/perfil`; `GET /api/deficiencias`; `POST /api/candidatos/:id/deficiencias`; `DELETE /api/candidatos/:id/deficiencias/:deficienciaId`.

### UC-C10 — Gerenciar experiências profissionais
- **Ator:** Candidato.
- **Descrição:** Adiciona, edita e remove as experiências que aparecem no perfil.
- **Pré-condições:** Autenticado como candidato.
- **Fluxo principal:**
  1. Na seção "Experiência profissional" de `/perfil`, clica em "Adicionar" (ou no lápis de um item para editar).
  2. Preenche o formulário: cargo*, empresa*, local, modalidade (texto livre, ex.: "Presencial, remoto…"), início*, fim, a chave "Trabalho atualmente aqui" e descrição.
  3. Clica em "Salvar"; o sistema confirma com "Registro adicionado." ou "Registro atualizado."
  4. Para remover, clica na lixeira; o sistema pede confirmação ("Remover este registro?", com o aviso de que a ação não pode ser desfeita) e confirma com "Registro removido."
- **Fluxos alternativos e exceções:**
  - Limites: cargo e empresa de 2 a 150 caracteres; local até 150; modalidade até 50; descrição até 2000. Início é obrigatório.
  - Marcando "Trabalho atualmente aqui", a data de fim é desativada e gravada vazia.
  - Data de fim anterior à de início: a tela não confere; o banco recusa e o servidor responde 500 "Erro ao consultar o banco de dados.", que a tela mostra como aviso.
  - Editar ou remover item de outro candidato: 403 "Você não possui permissão sobre este registro." Item inexistente: 404 "Registro não encontrado."
  - A lista mostra cargo e "empresa · período"; local, modalidade e descrição não são exibidos.
- **Pós-condições:** Registro criado, alterado ou apagado em `candidato_experiencias`. Sem notificação nem auditoria.
- **Regras de negócio:** Ordenação: experiências atuais primeiro, depois por data de início mais recente. Todo registro é sempre vinculado ao candidato logado, nunca a um id vindo do corpo (`PerfilCandidatoService`).
- **Telas e endpoints:** `/perfil`; `GET /api/perfil/experiencias`; `POST /api/perfil/experiencias`; `PUT /api/perfil/experiencias/:id`; `DELETE /api/perfil/experiencias/:id`.

### UC-C11 — Gerenciar formações
- **Ator:** Candidato.
- **Descrição:** Adiciona, edita e remove formações acadêmicas do perfil.
- **Pré-condições:** Autenticado como candidato.
- **Fluxo principal:**
  1. Na seção "Formação acadêmica" de `/perfil`, clica em "Adicionar" (ou no lápis para editar).
  2. Preenche instituição*, curso*, nível (texto livre, ex.: "Técnico, graduação, pós…"), início, conclusão, a chave "Em andamento" e descrição.
  3. Salva (mensagens iguais às do UC-C10). A remoção também pede confirmação.
- **Fluxos alternativos e exceções:**
  - Limites: instituição e curso de 2 a 180 caracteres; nível até 80; descrição até 2000.
  - Com "Em andamento", a data de conclusão é desativada e gravada vazia.
  - Conclusão anterior ao início: o banco recusa e a tela mostra "Erro ao consultar o banco de dados." (como no UC-C10).
  - A lista mostra o curso e "instituição · nível".
- **Pós-condições:** Registro em `candidato_formacoes` criado, alterado ou apagado. Sem notificação nem auditoria.
- **Regras de negócio:** Ordenação: em andamento primeiro, depois por data de início mais recente (as formações sem data de início vêm antes, por regra do PostgreSQL para ordem decrescente).
- **Telas e endpoints:** `/perfil`; `GET`, `POST`, `PUT` e `DELETE` em `/api/perfil/formacoes` (e `/:id`).

### UC-C12 — Gerenciar habilidades
- **Ator:** Candidato.
- **Descrição:** Adiciona, edita e remove as habilidades do perfil, com nível em texto livre.
- **Pré-condições:** Autenticado como candidato.
- **Fluxo principal:**
  1. Na seção "Habilidades" de `/perfil`, clica em "Adicionar" (ou no lápis para editar).
  2. Preenche habilidade* e nível (placeholder "Básico, intermediário, avançado…").
  3. Salva e confirma (mensagens do UC-C10). Remoção com confirmação. A lista mostra o nome e, abaixo, o nível.
- **Fluxos alternativos e exceções:**
  - Nome de 2 a 80 caracteres.
  - Nível: a tela e o validador aceitam até 80 caracteres, mas a coluna do banco tem 30; acima de 30 a gravação falha e a tela mostra "Erro ao consultar o banco de dados."
  - Nome repetido para o mesmo candidato: 409 "Registro duplicado."; a tela mostra "Este valor já está em uso."
- **Pós-condições:** Registro em `candidato_habilidades` criado, alterado ou apagado. Sem notificação nem auditoria.
- **Regras de negócio:** Nome único por candidato (restrição do banco, que diferencia maiúsculas de minúsculas). A lista é ordenada por nome.
- **Telas e endpoints:** `/perfil`; `GET`, `POST`, `PUT` e `DELETE` em `/api/perfil/habilidades` (e `/:id`).

### UC-C13 — Gerenciar certificados
- **Ator:** Candidato.
- **Descrição:** Adiciona, edita e remove certificados informados no perfil.
- **Pré-condições:** Autenticado como candidato.
- **Fluxo principal:**
  1. Na seção "Certificados" de `/perfil`, clica em "Adicionar" (ou no lápis para editar).
  2. Preenche título*, instituição emissora, "Emitido em", "Expira em" e link da credencial.
  3. Salva e confirma (mensagens do UC-C10). Remoção com confirmação.
- **Fluxos alternativos e exceções:**
  - Título de 2 a 180 caracteres; instituição até 180; link até 500 (o campo do navegador exige URL; o servidor só confere o tamanho).
  - Não há envio de arquivo do certificado: o serviço reserva o campo `arquivo`, mas a coluna não existe e a tela não o oferece.
  - A lista mostra o título e "instituição · data de emissão"; validade e link não aparecem.
- **Pós-condições:** Registro em `candidato_certificados` criado, alterado ou apagado. Sem notificação nem auditoria.
- **Regras de negócio:** Ordenação por data de emissão mais recente (os sem data de emissão vêm antes, por regra do PostgreSQL para ordem decrescente). Se um dia houver arquivo, ele é escondido de terceiros (`aplicarPrivacidadeCandidato`).
- **Telas e endpoints:** `/perfil`; `GET`, `POST`, `PUT` e `DELETE` em `/api/perfil/certificados` (e `/:id`).

## Candidato — Currículo

### UC-C14 — Enviar ou substituir o currículo
- **Ator:** Candidato.
- **Descrição:** Guarda um arquivo de currículo no perfil. Há um único currículo por candidato; um novo envio substitui o anterior.
- **Pré-condições:** Autenticado como candidato.
- **Fluxo principal:**
  1. Na seção "Currículo" de `/perfil`, o candidato clica em "Enviar currículo" (ou "Atualizar currículo", se já houver).
  2. Escolhe um arquivo `.pdf`, `.doc` ou `.docx`.
  3. O sistema valida, guarda o arquivo e mostra o nome e "enviado em" com a data, com a confirmação "Currículo enviado."
- **Fluxos alternativos e exceções:**
  - Tipo fora da lista: a tela avisa "Envie um arquivo PDF, DOC ou DOCX." (a tela confere o tipo; não confere o tamanho).
  - Acima de 5 MB: o servidor recusa com 400 "Arquivo excede o tamanho máximo permitido."
  - Conteúdo que não bate com o tipo declarado (por exemplo, outro formato renomeado): "O conteúdo do arquivo não corresponde a um arquivo válido do formato declarado."
  - Falha no armazenamento: "Não foi possível enviar o arquivo agora. Tente novamente em alguns instantes." Sem mensagem do servidor, a tela mostra "Não foi possível enviar o currículo."
  - Não existe exclusão avulsa do currículo: nem tela nem endpoint. O arquivo só é apagado quando é substituído ou quando a conta é excluída.
  - Limitação: o servidor lê o nome do arquivo em Latin-1, então nomes com acento são gravados com caracteres trocados (em teste com o `multer` 2.2.0 do projeto, "Currículo João.pdf" virou "CurrÃ­culo JoÃ£o.pdf"). Esse é o nome mostrado no perfil e usado no download.
- **Pós-condições:**
  - Gravados o caminho, o nome original (até 255 caracteres) e a data de atualização do currículo.
  - O arquivo anterior é apagado do armazenamento depois que o novo é confirmado.
  - Sem notificação, e-mail ou auditoria.
- **Regras de negócio:**
  - O arquivo vai ao armazenamento **privado** (`curriculos/<candidatoId>/`) e nunca vira link permanente.
  - O dono (ou administrador) é verificado antes do envio (`garantirDonoDeCandidato`).
  - O currículo não pode ser definido por `PUT /api/candidatos/:id`.
- **Telas e endpoints:** `/perfil`; `PATCH /api/candidatos/:id/curriculo` (campo `curriculo`).

### UC-C15 — Visualizar e baixar o currículo
- **Ator:** Candidato. Também usam os mesmos botões: empresa com candidatura do candidato (UC-E17) e administrador.
- **Descrição:** Abre ou baixa o arquivo guardado.
- **Pré-condições:** Ter currículo enviado (os botões só aparecem quando existe `curriculoNome`).
- **Fluxo principal:**
  1. Em `/perfil`, o candidato clica em "Visualizar currículo" ou "Baixar currículo".
  2. O sistema confere a autorização na hora e gera um link assinado novo para o arquivo.
  3. "Visualizar" abre o arquivo em outra aba; "Baixar" força o download com o nome original.
- **Fluxos alternativos e exceções:**
  - O link vale 5 minutos (padrão `SIGNED_URL_EXPIRES_SECONDS`, 300 s); cada clique pede um link novo.
  - Falhas: "Não foi possível abrir o currículo." e "Não foi possível baixar o currículo."
  - Servidor: 403 "Você não tem permissão para acessar este currículo." e 404 "Este candidato ainda não enviou um currículo."
  - A tela abre a aba antes de pedir o link, para evitar bloqueio de pop-up; se o navegador ainda bloquear, ele mostra o aviso próprio.
- **Pós-condições:** Nenhuma alteração de dados.
- **Regras de negócio:** Só dono, administrador ou empresa com candidatura do candidato (e sem bloqueio entre as partes) obtêm o link (`podeVerDadosPrivados`).
- **Telas e endpoints:** `/perfil`; `GET /api/candidatos/:id/curriculo`; `GET /api/candidatos/:id/curriculo/download`.

### UC-C16 — Importar dados do currículo para o perfil
- **Ator:** Candidato.
- **Descrição:** A partir de um PDF ou DOCX, o sistema extrai um rascunho por palavras-chave (sem inteligência artificial) e o candidato decide o que gravar no perfil.
- **Pré-condições:** Autenticado como candidato; arquivo PDF com texto selecionável ou DOCX.
- **Fluxo principal:**
  1. Em `/perfil`, seção "Currículo", o candidato clica em "Importar dados do currículo".
  2. No diálogo, clica na área "Clique para escolher um PDF ou DOCX" e escolhe o arquivo.
  3. O sistema extrai o texto, mostra "Extraindo texto do arquivo…" e devolve o rascunho. Nada é gravado ainda.
  4. O diálogo mostra o aviso "Extração automática por palavras-chave, sem inteligência artificial — revise e complete cada campo antes de salvar", os contatos encontrados (e-mail, telefone, LinkedIn, GitHub; só informativos) e blocos de experiências, formações e habilidades.
  5. O candidato desmarca o que não quer e preenche os campos obrigatórios de cada item: cargo, empresa e data de início nas experiências; instituição e curso nas formações. Nas habilidades, clica nos selos para incluir ou excluir.
  6. Clica em "Confirmar e salvar itens marcados". O sistema cria os itens, mostra "N itens adicionados ao perfil." e fecha o diálogo.
- **Fluxos alternativos e exceções:**
  - Arquivo `.doc` ou outro formato: a tela recusa ("Envie um arquivo PDF ou DOCX."); no servidor o `.doc` também é recusado, com orientação para salvar como `.docx` ou PDF.
  - PDF escaneado, sem texto: "Não foi possível extrair texto deste PDF — ele pode ser uma imagem escaneada. Envie um PDF com texto selecionável ou um DOCX." DOCX sem texto: "Não foi possível extrair texto deste arquivo DOCX."
  - Acima de 5 MB: 400 "Arquivo excede o tamanho máximo permitido." A tela do diálogo não confere o tamanho antes de enviar.
  - Se nenhuma seção for identificada, o diálogo mostra a mensagem pedindo títulos de seção mais explícitos ou preenchimento manual; o botão de confirmar continua visível e, se clicado, avisa "Nada foi salvo — marque ao menos um item e preencha os campos obrigatórios."
  - Item marcado sem os campos obrigatórios é ignorado, e a mensagem final informa quantos foram ignorados.
  - A gravação é item a item, sem transação, na ordem experiências, formações, habilidades. Se um item falhar, os anteriores permanecem e os seguintes não são gravados; o diálogo continua aberto com a mensagem do servidor ("Não foi possível salvar os itens confirmados." se não vier texto). É o que acontece com uma habilidade repetida (nome único por candidato), que o banco recusa com "Este valor já está em uso."
  - Reimportar e confirmar de novo cria experiências e formações em duplicidade (este diálogo não confere o que já existe).
  - Limitação de ambiente: sem as variáveis do Supabase Storage (modo de desenvolvimento, arquivos em disco local), o servidor não recebe o conteúdo do arquivo em memória e a importação falha com o erro interno "Erro interno do servidor." Isso vale também para a importação do cadastro (UC-C02).
- **Pós-condições:**
  - Criadas as experiências, formações e habilidades confirmadas (experiência marcada "Emprego atual" ou sem data de fim e formação em andamento seguem os campos do diálogo).
  - O arquivo **não** vira o currículo oficial e não é guardado; para isso é preciso UC-C14.
  - Os contatos encontrados e o resumo extraído **não** são gravados neste diálogo (no cadastro, UC-C02, LinkedIn, GitHub, resumo e habilidades são aproveitados).
  - Sem notificação, e-mail ou auditoria.
- **Regras de negócio:**
  - Reconhece cabeçalhos como "Resumo/Objetivo", "Experiência profissional", "Formação acadêmica" e "Habilidades/Competências" em linhas curtas (até 40 caracteres).
  - Limites do rascunho: 6 itens por seção, 500 caracteres por item, 25 habilidades (de 2 a 80 caracteres cada) e resumo de até 2000 caracteres.
  - Cargo, empresa e datas ficam sempre em branco; o trecho encontrado vira a descrição.
  - CPF nunca é procurado nem devolvido.
  - Só o dono (ou administrador) usa o endpoint; a conferência de dono é feita no serviço, depois que o arquivo é lido.
  - Este endpoint confere só o tipo declarado e o limite de 5 MB; não confere a assinatura binária do arquivo (diferente de UC-C14). Um arquivo que não seja realmente PDF ou DOCX falha na leitura.
- **Telas e endpoints:** `/perfil` (diálogo); `POST /api/candidatos/:id/curriculo/importar` (campo `curriculo`); `POST /api/perfil/experiencias`, `/formacoes` e `/habilidades`.

## Candidato — Vagas e candidaturas

### UC-C17 — Buscar e filtrar vagas
- **Ator:** Candidato. A lista `/vagas` também é aberta a visitantes (UC-V07, UC-V08), empresas e administradores.
- **Descrição:** A lista, os filtros (cidade, modalidade, público da vaga e recursos de acessibilidade) e as regras de exibição são os descritos em UC-V07 e UC-V08. Aqui ficam só as diferenças para quem está logado como candidato.
- **Pré-condições:** Nenhuma para ver a lista. Para favoritar, ser candidato.
- **Fluxo principal:**
  1. O candidato abre "Vagas" no cabeçalho (`/vagas`) e usa a lista e os filtros como em UC-V07 e UC-V08.
  2. Cada cartão traz o coração de favoritar ativo (UC-C19), pintado conforme as vagas favoritas do candidato.
- **Fluxos alternativos e exceções:**
  - Os corações só reconhecem as 100 favoritas mais recentes (`GET /api/dashboard/favoritos?limit=100`).
  - Para quem não é candidato (visitante, empresa ou administrador), o coração só mostra o aviso "Entre com uma conta de candidato para favoritar vagas."
  - As limitações da busca são as mesmas de UC-V08: os filtros só valem ao clicar em "Buscar" e não ficam na URL; o texto da caixa "Cargo, empresa ou palavra-chave" é enviado como `q`, mas a API lê `search`, então a palavra-chave não restringe o resultado; contrato, estado e "exclusiva PCD" existem na API e não na tela.
- **Pós-condições:** Nenhuma alteração de dados.
- **Regras de negócio:** A listagem traz só vagas "aberta" de empresa **aprovada**; vaga de empresa pendente, reprovada ou suspensa some (`VagaService.listar`). A listagem não filtra a vaga ocultada pela moderação (UC-V07).
- **Telas e endpoints:** `/vagas`; `GET /api/vagas`; `GET /api/dashboard/favoritos` (para pintar os corações).

### UC-C18 — Ver o detalhe de uma vaga
- **Ator:** Candidato. A página também é aberta a visitantes (UC-V09).
- **Descrição:** O conteúdo da vaga é o descrito em UC-V09. Aqui ficam as ações do candidato sobre ela.
- **Pré-condições:** Conhecer a vaga (lista, perfil da empresa, notificação ou busca).
- **Fluxo principal:**
  1. O candidato clica no título ou em "Ver vaga" (`/vaga/:vagaId`).
  2. O sistema mostra os dados da vaga (UC-V09) e, abaixo do título, os botões de ação.
  3. O candidato pode candidatar-se (UC-C21), favoritar (UC-C19), conversar com a empresa (UC-C24), abrir o perfil da empresa (UC-G14) ou, em "Mais opções da vaga", "Denunciar vaga" (UC-G29).
- **Fluxos alternativos e exceções:**
  - Vaga inexistente, removida ou de empresa que não está aprovada: "Vaga não encontrada" ("Esta vaga pode ter sido encerrada ou removida pela empresa.") com "Tentar novamente" e "Ver todas as vagas".
  - Vaga arquivada ou encerrada continua abrindo, com o status visível, mas o botão "Candidatar-se" fica desativado, sem texto explicando o motivo.
  - Depois de se candidatar, o botão passa a "Candidatura enviada" e fica desativado; o mesmo acontece se a candidatura foi cancelada (UC-C23), porque a tela só procura a vaga entre as 100 candidaturas mais recentes do candidato, de qualquer status.
  - Quem não é candidato vê "Entre com uma conta de candidato para se candidatar a esta vaga."
  - A data de encerramento cadastrada pela empresa (`dataEncerramento`) não é exibida e não fecha a vaga sozinha: não existe tarefa agendada que faça isso.
- **Pós-condições:** Nenhuma alteração de dados.
- **Regras de negócio:** Vaga de empresa não aprovada só é vista pela própria empresa e por administradores (`VagaService.buscarPorId`).
- **Telas e endpoints:** `/vaga/:vagaId`; `GET /api/vagas/:id`; `GET /api/candidaturas/minhas` e `GET /api/dashboard/favoritos` (para o estado dos botões).

### UC-C19 — Favoritar e desfavoritar vaga
- **Ator:** Candidato.
- **Descrição:** Marca ou desmarca uma vaga como favorita, para acompanhá-la depois.
- **Pré-condições:** Autenticado como candidato.
- **Fluxo principal:**
  1. Na lista `/vagas`, o candidato clica no coração do cartão ("Favoritar vaga" ou "Remover vaga dos favoritos"), ou, no detalhe, no botão "Favoritar" ("Favoritada" quando marcada).
  2. O sistema alterna o estado: cria o favorito se não existia ou o apaga se existia.
  3. A tela atualiza o coração e os contadores do painel.
- **Fluxos alternativos e exceções:**
  - Vaga inexistente: 404 "Vaga não encontrada." Conta de candidato sem perfil: 403 "Ação disponível apenas para candidatos." Conta de outro tipo (chamada direta à API): 403 "Você não possui permissão para esta ação."
  - Hoje o aviso exibido ao favoritar sempre diz "Vaga removida dos favoritos.", porque a tela lê o campo `favoritada` e a API envia `favoritado`. O coração e a lista de favoritas ficam corretos, pois vêm da lista recarregada.
  - A tela reconhece até 100 favoritas ao pintar os corações.
  - No painel e em "Minha atividade" não há botão para desfavoritar.
- **Pós-condições:** Registro em `favoritos_vaga` criado ou removido. A empresa não é avisada; não há e-mail nem auditoria.
- **Regras de negócio:** Um favorito por par candidato-vaga (restrição única); o candidato vem sempre da sessão, nunca do corpo (`InteracaoService`). A API não confere se a vaga está aberta nem se a empresa está aprovada.
- **Telas e endpoints:** `/vagas`, `/vaga/:vagaId`; `POST /api/vagas/:vagaId/favoritar`.

### UC-C20 — Consultar vagas favoritas
- **Ator:** Candidato.
- **Descrição:** Lista as vagas favoritadas, com paginação.
- **Pré-condições:** Autenticado como candidato.
- **Fluxo principal:**
  1. O candidato abre o painel (UC-C04) ou "Minha atividade" (`/minha-atividade`, UC-G21), que mostra o mesmo quadro.
  2. No quadro "Vagas favoritas", o sistema mostra 5 por página: título, empresa, "cidade · modalidade" (ou "Local não informado") e o selo de status da vaga (Aberta, Arquivada ou Encerrada).
  3. Navega com "Página anterior" e "Próxima página" ("Página n de m").
- **Fluxos alternativos e exceções:**
  - Sem favoritas: "Você ainda não favoritou nenhuma vaga." com link "Explorar vagas".
  - Erro: "Não foi possível carregar suas vagas favoritas." com "Tentar novamente".
  - Os itens não são links nem têm botão para desfavoritar; para abrir a vaga, o candidato usa `/vagas`.
- **Pós-condições:** Nenhuma alteração de dados.
- **Regras de negócio:** Ordem: favorita mais recente primeiro. Os favoritos são privados do candidato. A lista não filtra por status da vaga nem por aprovação da empresa: vaga arquivada, encerrada ou de empresa suspensa continua listada. Se a empresa excluir a vaga, o favorito some junto (chave estrangeira com exclusão em cascata).
- **Telas e endpoints:** `/dashboard/candidato`, `/minha-atividade`; `GET /api/dashboard/favoritos`.

### UC-C21 — Candidatar-se a uma vaga
- **Ator:** Candidato. Secundário: Empresa dona da vaga (recebe o aviso).
- **Descrição:** O candidato registra interesse numa vaga aberta; a empresa passa a ver a candidatura.
- **Pré-condições:** Autenticado como candidato; vaga com status "aberta" de empresa aprovada; sem bloqueio entre candidato e empresa; sem candidatura anterior à mesma vaga.
- **Fluxo principal:**
  1. No detalhe da vaga (UC-C18), o candidato clica em "Candidatar-se".
  2. O sistema valida as condições, cria a candidatura com status **Pendente** e avisa a empresa.
  3. A tela confirma com "Candidatura enviada com sucesso." e o botão passa a "Candidatura enviada", desativado.
- **Fluxos alternativos e exceções:**
  - O servidor confere nesta ordem: perfil de candidato; vaga existente; empresa aprovada; bloqueio; vaga aberta; candidatura anterior. A primeira falha encerra o pedido.
  - A tela não tem campo de mensagem: a candidatura vai sem texto. A API aceita `mensagem` de até 2000 caracteres, mas nenhuma tela a envia e a tela da empresa não a mostra.
  - Já candidatado: 409 "Você já se candidatou a esta vaga." Isso vale também depois de cancelar (UC-C23): a candidatura cancelada continua existindo (restrição única por vaga e candidato) e não é possível se candidatar de novo.
  - Vaga arquivada ou encerrada: botão desativado na tela; no servidor, 400 "Esta vaga não está aberta para candidaturas."
  - Empresa pendente, reprovada ou suspensa: 403 "Esta vaga não está disponível para candidaturas no momento." (sem revelar o motivo).
  - Bloqueio entre as partes, em qualquer sentido: 403 "Não é possível se candidatar a esta vaga." (sem revelar que é bloqueio).
  - Conta de candidato sem perfil: 403 "Apenas candidatos com perfil podem se candidatar." Conta de outro tipo (chamada direta à API): 403 "Você não possui permissão para esta ação."
  - A tela só sabe que já houve candidatura pelas primeiras 100 do candidato; acima disso, o servidor devolve o 409.
- **Pós-condições:**
  - Criada a candidatura (`status = pendente`; um registro por par vaga-candidato).
  - A empresa recebe a notificação "Nova candidatura recebida" ("<nome> se candidatou à vaga "<título>"."), em tempo real e, havendo aplicativo instalado, por push; a notificação leva à vaga. Não há e-mail nem auditoria.
  - A notificação é criada na mesma transação da candidatura. Ela é do tipo `candidatura` e a preferência "Vagas e candidaturas" da empresa hoje não a impede (ver UC-C22).
  - A partir daí a empresa passa a ver os dados privados do candidato (UC-C27) e o currículo (UC-C15), e o candidato passa a ver a candidatura em UC-C22.
- **Regras de negócio:**
  - A candidatura não exige currículo nem perfil preenchido.
  - O "público da vaga" (PCD, 50+) é informativo: não há bloqueio para quem não declarou deficiência nem verificação de idade (`CandidaturaService.criar`).
  - O candidato vem sempre da sessão.
- **Telas e endpoints:** `/vaga/:vagaId`; `POST /api/vagas/:vagaId/candidaturas`.

### UC-C22 — Acompanhar o status das candidaturas
- **Ator:** Candidato. Secundário: Empresa (quem altera o status).
- **Descrição:** Consulta as candidaturas enviadas e recebe aviso quando a empresa as atualiza.
- **Pré-condições:** Autenticado como candidato.
- **Fluxo principal:**
  1. O candidato abre o painel (UC-C04) ou "Minha atividade" (UC-G21).
  2. No quadro "Minhas candidaturas recentes", o sistema lista 5 por página, da mais nova para a mais antiga: título da vaga, empresa e selo de status (Pendente, Visualizada, Em análise, Aprovada, Rejeitada ou Cancelada).
  3. Quando a empresa muda o status, o candidato recebe a notificação "Sua candidatura foi atualizada" ("Sua candidatura para a vaga "<título>" foi atualizada para <status>."), em tempo real e por push (se houver aplicativo instalado), que leva à página da vaga (UC-G25).
- **Fluxos alternativos e exceções:**
  - Sem candidaturas: "Você ainda não se candidatou a nenhuma vaga." com link "Explorar vagas". Erro: "Não foi possível carregar suas candidaturas."
  - O título da vaga não é link e não há tela de detalhe da candidatura (a API de detalhe, `GET /api/candidaturas/:id`, existe, mas nenhuma tela a usa).
  - Na tela da empresa, o seletor de status lista Pendente, Em análise, Aprovada e Rejeitada. A API recusa "Pendente" e "Cancelada" para a empresa (400 "A empresa não pode aplicar este status."); "Visualizada" só existe na API.
  - Desligar "Vagas e candidaturas" em Configurações → Notificações (UC-G28) hoje não impede o aviso: `notificacaoPermitida` procura os tipos "Vaga" e "Candidatura" (com maiúscula), e os avisos são gravados como "vaga" e "candidatura".
- **Pós-condições:** Leitura apenas. A notificação nasce quando a empresa altera o status.
- **Regras de negócio:** Só o dono da candidatura (ou a empresa dona da vaga, ou administrador) a consulta. A empresa não pode voltar a candidatura a "Pendente" (`STATUS_EMPRESA`). A lista inclui candidaturas de vagas que já foram arquivadas, encerradas ou ocultadas; se a empresa excluir a vaga, a candidatura some junto (chave estrangeira com exclusão em cascata).
- **Telas e endpoints:** `/dashboard/candidato`, `/minha-atividade`, `/notificacoes` (UC-G25); `GET /api/candidaturas/minhas`; `GET /api/atividade/minha`.

### UC-C23 — Cancelar candidatura
- **Ator:** Candidato.
- **Descrição:** Desiste de uma candidatura enviada.
- **Pré-condições:** Ter a candidatura listada em "Minhas candidaturas recentes".
- **Fluxo principal:**
  1. No item da lista, o candidato clica em "Cancelar".
  2. O sistema pergunta "Cancelar candidatura?": "Você está prestes a cancelar sua candidatura à vaga "<título>". Essa ação não pode ser desfeita."
  3. O candidato clica em "Confirmar cancelamento"; o sistema muda o status para **Cancelada** e confirma com "Candidatura cancelada."
- **Fluxos alternativos e exceções:**
  - "Voltar" fecha o diálogo sem alterar nada.
  - O botão não aparece nas candidaturas já Canceladas ou Rejeitadas; em Aprovadas ele aparece.
  - Erro: "Não foi possível cancelar a candidatura."
  - Cancelar candidatura de outra pessoa: 403 "Você só pode cancelar as suas próprias candidaturas."
- **Pós-condições:**
  - O registro não é apagado: continua listado como Cancelada e é contado no cartão "Candidaturas".
  - A empresa não é notificada (nem por e-mail); a candidatura cancelada continua visível na lista dela e os dados privados do candidato continuam acessíveis a essa empresa (UC-C27).
  - Não é possível se candidatar de novo à mesma vaga (UC-C21).
  - Sem auditoria.
- **Regras de negócio:** O servidor não confere o status atual antes de cancelar. Só o dono (ou administrador) cancela. O cancelamento não é definitivo no servidor: a empresa dona da vaga ainda consegue aplicar outro status a uma candidatura cancelada (o código não confere o status anterior), o que gera nova notificação ao candidato.
- **Telas e endpoints:** `/dashboard/candidato`, `/minha-atividade`; `PATCH /api/candidaturas/:id/cancelar`.

### UC-C24 — Iniciar conversa com a empresa da vaga
- **Ator:** Candidato. Secundário: Empresa dona da vaga.
- **Descrição:** O botão "Conversar com a empresa" da página da vaga abre (ou reabre) o chat com o usuário da empresa. As regras de quem pode iniciar conversa, as recusas e o envio de mensagens estão em UC-G22 (iniciar) e UC-G23 e UC-G24 (conversar). Aqui ficam só as particularidades do botão da vaga.
- **Pré-condições:** Autenticado como candidato; vaga visível.
- **Fluxo principal:**
  1. No detalhe da vaga, o candidato clica em "Conversar com a empresa" (aparece "Abrindo…" enquanto processa).
  2. O sistema abre a conversa entre os dois usuários, ou recupera a existente.
  3. A tela leva a `/mensagens` com a conversa aberta.
- **Fluxos alternativos e exceções:**
  - Diferente do botão "Enviar mensagem" dos perfis (UC-G22), este botão não consulta antes se a conversa é permitida: o resultado só aparece depois do clique, como aviso com o texto do servidor ou "Não foi possível abrir a conversa." Os motivos são os de UC-G22 (bloqueio, preferência de mensagens da empresa, usuário inativo).
  - Conversa já existente é reaberta sem rever a preferência de mensagens da empresa.
  - Não exige ter se candidatado à vaga.
- **Pós-condições:** Conversa criada (aparece no topo da lista, mesmo sem mensagens). Nenhuma notificação até que uma mensagem seja enviada.
- **Regras de negócio:** Regra única em `ConversaService.podeIniciarConversa`; o padrão da preferência de mensagens é "Todos". Se a empresa escolheu "Apenas seguidores", o candidato precisa seguir a empresa (UC-G19).
- **Telas e endpoints:** `/vaga/:vagaId`, `/mensagens`; `POST /api/conversas`.

## Candidato — Empresa criada a partir da conta de candidato

### UC-C25 — Cadastrar uma empresa a partir da conta de candidato
- **Ator:** Candidato. Secundários: serviço de e-mail e Administrador (analisa depois, UC-C26).
- **Descrição:** Para ter conta de empresa é preciso ter conta de candidato. O cadastro cria uma **segunda conta**, de tipo empresa, com e-mail e senha próprios e vinculada à conta de candidato que a criou. O passo a passo do assistente (Empresa, Responsável, Endereço, Apresentação, Conclusão e Acessibilidade), os campos e as mensagens estão em UC-E01; o caminho "Sou empresa" para quem ainda não tem conta, em UC-V18. Aqui ficam as regras que dependem de a origem ser uma conta de candidato.
- **Pré-condições:** Estar logado como candidato. CNPJ e e-mail ainda não usados; o e-mail da empresa precisa ser diferente do e-mail do candidato.
- **Fluxo principal:**
  1. Quem ainda não tem conta clica em "Sou empresa" na página inicial, faz o cadastro de candidato (UC-C01 a UC-C03) e, no fim, clica em "Continuar para o cadastro da empresa". Quem já é candidato logado precisa abrir `/cadastro/empresa` direto: não há link para ela dentro do app logado, e a página inicial leva quem está logado ao feed.
  2. O candidato preenche o assistente de cinco etapas (UC-E01) e, na última, aceita os Termos de Uso e a Política de Privacidade e clica em "Criar conta".
  3. O sistema cria usuário e empresa numa transação, com a empresa em **análise (pendente)**, e grava o vínculo com a conta de candidato que fez o pedido.
  4. Com envio de e-mail configurado: aparece "Falta confirmar seu e-mail" e a sessão do candidato continua aberta. Sem envio de e-mail: a conta da empresa nasce com o e-mail confirmado, os tokens do navegador passam a ser os da empresa (a sessão de candidato é substituída no navegador) e o fluxo segue para a etapa de acessibilidade e o `/feed`, onde aparece a tela de análise (UC-C26).
- **Fluxos alternativos e exceções:**
  - Sem sessão ou com sessão de outro tipo, `/cadastro/empresa` mostra "Primeiro, a sua conta pessoal" com o botão "Criar minha conta de candidato" (e o link para entrar). No servidor: 401 "Para cadastrar uma empresa é preciso entrar com a sua conta de candidato." e 403 "Só uma conta de candidato pode cadastrar uma empresa. Entre com a sua conta pessoal."
  - E-mail já usado (inclusive o do próprio candidato): 409 "Este e-mail já está cadastrado." CNPJ já cadastrado: 409 "Este CNPJ já está cadastrado." O CNPJ só é conferido por ter 14 números.
  - Termos não aceitos: "É preciso aceitar os Termos de Uso e a Política de Privacidade para criar a conta."
  - Falha geral: "Não foi possível criar a conta agora."
  - O código não limita quantas empresas uma conta de candidato pode cadastrar (cada uma com CNPJ e e-mail próprios).
- **Pós-condições:**
  - Criados o usuário de tipo empresa (idioma da interface, aceite dos termos) e a empresa com `statusAprovacao = pendente` e `usuario_candidato_id` = usuário candidato (vindo da sessão, nunca do corpo).
  - Com e-mail configurado, sai o código de 6 dígitos (15 minutos) para o e-mail da empresa; a empresa só consegue entrar depois de confirmar (UC-E02).
  - O candidato não recebe notificação sobre a empresa, e nada muda na conta de candidato.
- **Regras de negócio:**
  - Contas separadas, cada uma com seu login e seu tipo; nada da autorização do candidato muda (`AutenticacaoService.cadastrarEmpresa`, migração `0006`).
  - Se a conta de candidato for excluída (UC-G42), a empresa continua existindo e o vínculo vira nulo (`ON DELETE SET NULL`).
  - Nenhuma tela mostra a empresa vinculada nem permite alternar de conta: para voltar ao candidato é preciso sair e entrar com o outro e-mail.
  - O cadastro de empresa continua exigindo confirmação de e-mail quando há envio configurado; o de candidato não.
- **Telas e endpoints:** `/` ("Sou empresa"), `/cadastro/candidato?depois=empresa`, `/cadastro/empresa`, `/confirmar-email`; `POST /api/auth/register/empresa`; `POST /api/auth/cadastro/confirmar-email`; `POST /api/auth/cadastro/reenviar-confirmacao`; `POST /api/auth/cadastro/concluir`.

### UC-C26 — Acompanhar a aprovação da empresa
- **Ator:** Candidato (na conta da empresa que criou). Secundário: Administrador (decide).
- **Descrição:** Enquanto a empresa não é aprovada, a conta dela só mostra o status da análise; a conta de candidato segue normal. As telas de espera, reprovação e suspensão estão em UC-E03, UC-E04 e UC-E05.
- **Pré-condições:** Empresa criada (UC-C25) e e-mail confirmado, quando exigido (UC-E02).
- **Fluxo principal:**
  1. A pessoa entra em `/entrar` com o e-mail e a senha da **empresa** (não os do candidato).
  2. O sistema mostra a tela "Sua empresa está em análise": cadastro recebido, à espera de um administrador; publicar vagas, editar o perfil da empresa e ver candidaturas ficam indisponíveis.
  3. A pessoa usa "Verificar novamente" (recarrega a página) para ver se mudou, "Sair da conta" ou "Fale conosco" (e-mail da equipe).
  4. Quando um administrador decide, a conta da empresa recebe a notificação "Cadastro aprovado" ("Sua empresa foi aprovada e já pode publicar vagas.") ou "Cadastro reprovado" ("Seu cadastro foi reprovado. Motivo: …", ou "não informado"). Aprovada, o app libera os recursos de empresa na próxima recarga.
- **Fluxos alternativos e exceções:**
  - Antes de confirmar o e-mail, o login da empresa devolve "e-mail não verificado" e oferece reenviar a confirmação (limites: 60 segundos entre reenvios por conta e 5 por hora por IP).
  - Reprovada ("Seu cadastro empresarial não foi aprovado", com o motivo) ou suspensa ("Conta empresarial suspensa", com o motivo): a mesma tela de bloqueio aparece, sem o botão "Verificar novamente". O servidor também recusa as ações empresariais com mensagem específica de cada estado.
  - O candidato não é avisado na conta pessoal; o aviso só chega na conta da empresa, e é do tipo "sistema", que a preferência de notificações não silencia.
- **Pós-condições:** Leitura. A decisão (aprovar ou reprovar) é do administrador e grava data, quem avaliou e o motivo, com registro de auditoria do administrador.
- **Regras de negócio:** "Aprovada" libera publicar vagas; o selo "Empresa verificada" é uma ação à parte do administrador (UC-E27). Vagas de empresa não aprovada não aparecem para candidatos (UC-C17 e UC-C18) e não recebem candidaturas (UC-C21).
- **Telas e endpoints:** `/entrar`, `/` (feed com a tela de status), `/notificacoes`; `POST /api/auth/login`; `GET /api/auth/me`.

## Candidato — Privacidade

### UC-C27 — Controlar quem vê os dados do candidato
- **Ator:** Candidato. Secundários: outros usuários autenticados, Empresa com candidatura do candidato, Administrador.
- **Descrição:** O candidato escolhe se o perfil é público ou privado; independentemente dessa escolha, o sistema separa dados abertos a qualquer usuário autenticado dos dados privados, que só chegam ao próprio candidato, ao administrador e à empresa autorizada.
- **Pré-condições:** Autenticado como candidato.
- **Fluxo principal:**
  1. Em Configurações → Privacidade (`/configuracoes/privacidade`), o candidato alterna a chave "Perfil público" (UC-G35). O sistema confirma com "Seu perfil agora é público." ou "Seu perfil agora é privado."
  2. Opcionalmente, escolhe "Quem pode enviar novas mensagens para você?" (UC-G36) e abre "Usuários bloqueados" (UC-G31).
  3. O sistema passa a aplicar as regras de visibilidade abaixo a cada consulta ao perfil.
- **Fluxos alternativos e exceções:**
  - Perfil privado **não** esconde o perfil: nome, foto e dados profissionais continuam visíveis a qualquer usuário autenticado não bloqueado. Muda apenas o acesso às publicações, que ficam para seguidores aprovados (os demais veem "Solicitar para seguir", UC-G17).
  - Visitante sem login não vê perfis de candidato: as rotas exigem autenticação.
  - Bloqueio em qualquer sentido (UC-G30): o perfil responde "Este perfil não está disponível."; a empresa bloqueada deixa de receber o currículo e os dados privados pelos endpoints de perfil mesmo com candidatura; candidatura e nova conversa também são recusadas.
  - A preferência de mensagens vale só para conversas novas.
- **Pós-condições:** Atualizados `usuarios.perfil_publico` e `usuarios.preferencia_mensagens`. Não há notificação, e-mail ou auditoria.
- **Regras de negócio (`utils/candidatoPrivacidade.js`):**
  - **Aberto a qualquer usuário autenticado não bloqueado** (lista de permissões): nome, foto, capa, tipo de conta, se o perfil é público, título profissional, resumo, escolaridade, cidade, estado, país, disponibilidade, LinkedIn, GitHub, experiências, formações, habilidades, certificados (sem arquivo) e deficiências declaradas (nomes; a API inclui também as observações, UC-C09). Na tela de perfil de terceiro aparecem foto, capa, nome, título, cidade e UF, seguidores e seguindo, "Sobre mim", deficiências (só os nomes), experiências, formações, habilidades, certificados e publicações (UC-G14). LinkedIn, GitHub, escolaridade e disponibilidade chegam pela API, mas a tela não os exibe.
  - **Privado** (só o dono, o administrador ou uma empresa com ao menos uma candidatura do candidato em vaga dela, de qualquer status, inclusive cancelada, e sem bloqueio): CPF, data de nascimento, gênero, endereço, CEP, pretensão salarial, necessidades de acessibilidade, currículo (nome, data e arquivo) e os dados da conta além dos listados como abertos (e-mail e, em `GET /api/candidatos/:id`, telefone). Qualquer campo novo do modelo nasce privado.
  - Na tela, o dado privado que a empresa autorizada passa a ver é o currículo (botões "Visualizar currículo" e "Baixar currículo", UC-C15), no perfil do candidato e na lista de candidaturas dela, onde aparecem ainda nome e título profissional (UC-E15 a UC-E18). A mensagem opcional da candidatura não é exibida.
  - A chave "Perfil público" não altera o que a empresa autorizada vê.
  - Quem decide é `podeVerDadosPrivados`: administrador, dono, ou (sem bloqueio) empresa com candidatura. A empresa não precisa estar aprovada para passar nessa conferência.
  - Limitações verificadas no código atual:
    - A lista de candidaturas de uma vaga (`GET /api/vagas/:vagaId/candidaturas`) e o detalhe da candidatura (`GET /api/candidaturas/:id`) entregam à empresa dona da vaga o registro do candidato sem passar pela lista de permissões nem pela checagem de bloqueio. Depois que o candidato bloqueia a empresa, a candidatura continua listada para ela (e a empresa ainda consegue mudar o status, o que notifica o candidato); só o link do currículo passa a dar 403.
    - `GET /api/candidatos` (busca de talentos, restrita a empresas e administradores) não aplica o filtro de privacidade, não exige candidatura nem empresa aprovada, e não tem tela no Site hoje.
    - `GET /api/candidatos/:id` não aplica o bloqueio aos dados abertos (só aos privados); a tela usa `GET /api/perfil/candidatos/usuario/:usuarioId`, que aplica.
- **Telas e endpoints:** `/configuracoes/privacidade`, `/configuracoes/bloqueados`, `/perfil/:usuarioId`; `PUT /api/usuarios/privacidade`; `PUT /api/usuarios/privacidade/mensagens`; `GET /api/perfil/candidatos/usuario/:usuarioId`; `GET /api/perfil/candidatos/:candidatoId`; `GET /api/candidatos/:id`; `GET /api/candidatos/:id/curriculo`.

## Candidato — O que o candidato ainda não consegue fazer hoje

Limitações verificadas no código atual, sem planejamento futuro:

- Excluir só o currículo (não há tela nem endpoint; ele só é trocado ou apagado com a conta).
- Remover a foto de perfil sem trocá-la.
- Filtrar vagas por tipo de contrato ou estado pela tela (a API aceita) e usar a caixa de palavra-chave da lista `/vagas` com efeito (o parâmetro enviado, `q`, não é o que a API lê, `search`).
- Escrever uma mensagem de apresentação ao se candidatar (a API aceita até 2000 caracteres; nenhuma tela a envia).
- Candidatar-se de novo a uma vaga depois de cancelar.
- Abrir o detalhe de uma candidatura (`GET /api/candidaturas/:id` não tem tela) ou ver o resumo por status no painel.
- Desfavoritar ou abrir a vaga a partir do quadro "Vagas favoritas".
- Anexar arquivo a um certificado, ou declarar o nível de uma deficiência.
- Ver as observações de deficiência que já salvou, ou os campos de data de nascimento, gênero, escolaridade, disponibilidade, pretensão salarial, LinkedIn, GitHub e necessidades de acessibilidade fora do formulário de edição.
- Editar CPF, país, endereço e CEP pela tela.
- Manter acentos no nome do arquivo do currículo (o nome é gravado com caracteres trocados).
- Alternar entre a conta de candidato e a da empresa criada sem sair e entrar de novo.
- Listar as empresas que segue pelo endpoint `GET /api/empresas/seguindo` (existe só para candidatos, mas nenhuma tela o chama; "Minha atividade", UC-G21, usa outro endpoint).
