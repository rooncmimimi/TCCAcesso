# Acessibilidade avançada: Bloco 2 (inclusão nas candidaturas)

Auditoria, plano de migrations, regras de acesso e o que foi entregue. Complementa
[acessibilidade-avancada.md](acessibilidade-avancada.md) (Blocos 0 e 1).

## 1. Auditoria feita antes de implementar

| Item auditado | O que existia | Problema ou decisão |
|---|---|---|
| `Candidatura` (`models/Candidatura.js`) | `status` (pendente, visualizada, em_analise, aprovada, rejeitada, cancelada) e `mensagem`. Uma por par vaga + candidato. | Sem lugar para adaptações. **Rascunho não entrou como status**: toda consulta, contagem e notificação existente enxergaria o rascunho. Ficou em tabela própria. |
| `Candidato` | CPF cifrado, endereço, CEP, nascimento, gênero, pretensão, `necessidadesAcessibilidade` (texto livre), `curriculo` (caminho no bucket privado). | Nenhum campo para "mostrar a categoria de deficiência". Coluna nova `exibir_deficiencia_no_perfil` (falso). |
| Relações | `Candidato 1:N Candidatura N:1 Vaga N:1 Empresa`; `Candidato N:N Deficiencia` (com `observacoes` livre). | Mantidas. As tabelas novas penduram em `candidatos` e `candidaturas` com `ON DELETE CASCADE`. |
| `utils/candidatoPrivacidade.js` | `podeVerDadosPrivados` liberava **todos** os campos privados a qualquer empresa com **qualquer candidatura** do candidato, em qualquer status e em qualquer vaga. A categoria de deficiência era pública. | **Corrigido de forma estrutural** (seção 2). |
| Rotas que expõem candidato a terceiros | `GET /candidatos/:id`, `GET /perfil/candidatos/:id`, `GET /candidatos/:id/curriculo` e `/download`, **`GET /vagas/:vagaId/candidaturas`** e **`GET /candidaturas/:id`**. | As duas últimas devolviam o `Candidato` **inteiro** (CPF decifrado, endereço, necessidades, caminho do currículo) à empresa, sem passar por `candidatoPrivacidade`. Era a maior exposição e **não estava na lista inicial**. Corrigidas. |
| Busca de talentos (`CandidatoService.listar`), busca geral, seguidores, `UsuarioService.buscarRegistroCompleto` | Talentos já usa a allowlist e não devolve deficiência. A busca geral devolve só id, título, cidade e estado. O registro completo é só do dono. | Sem mudança necessária. Conferido. |
| Contagens (`VagaService`, `DashboardService`, `PublicoService`, `AtividadeService`) | Só totais, ou a lista da própria pessoa. | Sem vazamento entre organizações. Conferido. |
| Consentimentos e auditoria | `usuarios.termos_*` (aceite dos documentos legais) e `registros_auditoria` (hoje só ações de administradores, `administrador_id` pode ser nulo). | Reaproveitei `registros_auditoria` (via `AdminAuditoriaService`) com `administrador_id` nulo para autorização, edição, retirada, encerramento e resposta, **sem conteúdo** (só versão e quantidade). Sem tabela de auditoria duplicada. |
| Autorização existente | `garantirDono`, `garantirEmpresaAprovada`, `exigirTipoUsuarioMiddleware`, `BloqueioService`. | Reaproveitados. Para adaptações, **nem o administrador** altera ou lê o conteúdo. |

## 2. Correção estrutural da visibilidade

A regra "se a empresa tem qualquer candidatura do candidato, vê todos os campos privados" foi
**removida**. Agora são três níveis, e nenhum deles é "ter uma candidatura":

1. **Dados privados** (CPF, endereço, CEP, nascimento, gênero, pretensão, necessidades de acessibilidade,
   caminho do currículo, texto livre das deficiências, perfil de adaptações, preferências de comunicação):
   só a própria pessoa e o administrador. **Nunca uma empresa.**
2. **Dados da candidatura** (e-mail de contato e o currículo, por URL assinada): a empresa **dona da vaga**,
   **só enquanto a candidatura está ativa** (nem cancelada nem rejeitada), e sem bloqueio entre as partes.
   A consulta é escopada às vagas da própria empresa.
3. **Adaptações**: só a cópia que a pessoa autorizou naquela candidatura.

A **categoria de deficiência** é privada por padrão. Só entra no perfil público se a própria pessoa ligar
`exibirDeficienciaNoPerfil`, escolha independente que **não** libera nenhuma outra informação nem autoriza
nada numa candidatura. O backend aplica isso em todas as rotas, porque a decisão está em
`aplicarPrivacidadeCandidato`, usada por todas elas.

**Efeito para quem já tinha categoria declarada:** passa a ficar privada na hora em que a migration for
aplicada (padrão falso). É a decisão de "privacidade por padrão"; a pessoa liga de novo se quiser.

## 3. Plano de migrations (`0012`, escrita e **não aplicada**)

| Objeto | Para quê | Escolha |
|---|---|---|
| `candidatos.exibir_deficiencia_no_perfil boolean NOT NULL DEFAULT false` | Exibição pública da categoria, por escolha da pessoa. | Coluna booleana. Sem perda: só acrescenta. |
| `perfis_adaptacao` (1 por candidato) | Adaptações (chaves de lista fechada) e observação livre. | `text[]` para as chaves (lista pequena, tipada, sem consulta por conteúdo). Limite de 40. |
| `preferencias_comunicacao` (1 por candidato) | Canais preferidos e evitados, melhor horário. | `text[]` e `CHECK` de que um canal não é preferido e evitado ao mesmo tempo. |
| `candidatura_adaptacoes` (1 por candidatura) | **Cópia** do que foi autorizado, com data, finalidade, versão do termo, versão do registro, estado, retirada e resposta da empresa. | **JSONB** para o conteúdo: é um retrato fechado e heterogêneo que nunca é consultado por conteúdo, e precisa guardar o rótulo da época. `CHECK` do banco: retirada não tem conteúdo nem resposta. |
| `candidatura_rascunhos` (1 por candidato e vaga) | Candidatura em andamento no servidor. | **Tabela separada**, com `UNIQUE (candidato_id, vaga_id)` contra duplicidade e `expira_em`. |

Todas: `gen_random_uuid()`, `criado_em`/`atualizado_em`, gatilho de `atualizado_em`, `ENABLE ROW LEVEL SECURITY`,
`REVOKE ALL ... FROM anon, authenticated`, `ON DELETE CASCADE`. O cabeçalho do arquivo traz a ordem de
implantação e como voltar atrás.

**Não existe banco descartável neste ambiente** (sem PostgreSQL local e sem Docker), então a migration **não
foi executada** em lugar nenhum. Ela é conferida por testes sobre o texto do SQL (só acrescenta, RLS, restrições
de conteúdo, unicidade). Antes de produção, rode em um banco descartável.

**Ordem de implantação:** aplique a `0012` **antes** de publicar o código. O model `Candidato` passa a ler a
coluna nova; sem ela, toda consulta de candidato falha. O deploy não aplica migrations (ver `README.md`).

## 4. Quem vê o quê

| Dado | Dono | Empresa dona da vaga | Outra empresa | Administrador |
|---|---|---|---|---|
| Perfil de adaptações, preferências de comunicação | sim | **não** | não | **não** (nenhuma rota de terceiros lê) |
| Cópia autorizada (`candidatura_adaptacoes`) | sim, com estado e retirada | só se a candidatura está ativa e a autorização não foi retirada | não | **não** |
| Rascunho | sim | **não** (não existe em `candidaturas`) | não | não |
| CPF, endereço, nascimento, necessidades | sim | **não** | não | sim (moderação) |
| E-mail de contato e currículo | sim | sim, candidatura ativa | não | sim |
| Categoria de deficiência | sim | só se a pessoa marcou na cópia daquela candidatura | só se ligou a exibição pública | sim |

A resposta da empresa a um pedido de adaptação usa quatro opções (podemos oferecer, podemos providenciar,
precisamos verificar, podemos conversar sobre uma alternativa) e uma mensagem curta. Sem pedido ativo, a
empresa recebe o mesmo "não há pedido" tanto se nunca houve quanto se foi retirado, para não revelar a retirada.

## 5. Retenção e descarte

| O quê | Quando some |
|---|---|
| Rascunho de candidatura | 30 dias sem alteração (cada salvamento renova). Apagado ao ler depois de vencido, pela limpeza do servidor a cada 6 horas, no envio da candidatura (mesma transação) e em cascata se a vaga ou o candidato forem excluídos. Não há arquivos no rascunho: o currículo é o do perfil e segue as regras dele. |
| Cópia autorizada | Apagada (conteúdo nulo) quando a pessoa retira a autorização **ou cancela a candidatura**. Candidatura rejeitada: a empresa deixa de ver, a cópia permanece para a pessoa consultar ou retirar. |
| Registro mínimo da operação | Fica na própria linha (datas, versão, quantidade) e em `registros_auditoria` (sem conteúdo). |

A política de privacidade (versão `2026-11-04`) diz com todas as letras que o que a empresa já leu, copiou ou baixou
antes da retirada **não pode ser apagado da memória de quem viu**.

## 6. O que foi entregue

- **Minha Acessibilidade** (`/minha-acessibilidade`): adaptações por grupo (comunicação, ambiente, aprendizagem,
  tecnologia, processos seletivos), preferências de comunicação e a chave "mostrar a categoria de deficiência no perfil".
- **Candidatura em 3 etapas** (`CandidaturaDialog`): mensagem, adaptações e revisão. Rascunho no servidor (retoma, grava
  sozinho, descarta). **Nada vem marcado**; o que está no perfil aparece só como lembrete "do seu perfil".
- **Prévia de privacidade**: o servidor monta a prévia com a mesma função que grava a cópia, então ela mostra exatamente o
  que a empresa receberá, mais o que nunca vai. A autorização é um passo explícito (e desfeita se a escolha mudar). O envio
  cria candidatura, cópia e fim do rascunho **na mesma transação**: se a autorização falha, nada é enviado e a empresa não
  é notificada. Enviar a candidatura não autoriza nada sozinho.
- **Depois do envio**: a pessoa vê o que compartilhou, altera (nova versão, resposta antiga zerada) ou retira.
- **Empresa**: vê só a cópia autorizada e responde. As candidaturas mostram o candidato sem dados privados.
- **Simulador** (`/simulador`): candidatura (7 etapas) e entrevista (6 perguntas) com vaga fictícia. Pausa e retoma (só no
  navegador), ouve as perguntas, responde por texto ou ditado, recebe sugestões sem nota. Não chama o servidor, não lê o
  perfil real e não cria candidatura.
- **Ditado com vocabulário contextual**: ver seção 7.
- **Texto alternativo**: orientação contextual, marcação "decorativa" e aviso antes de publicar imagem informativa sem
  descrição (a pessoa decide). A sugestão automática que já existia continua sendo só um rascunho editável; agora o campo
  avisa que a imagem é enviada a um serviço externo gratuito para gerá-la.

## 7. Ditado e vocabulário contextual

- Usa a API de reconhecimento de fala **do navegador**. Só liga quando a pessoa clica; o navegador pede a permissão do
  microfone; há indicador visível e botão de parar; a escuta para ao sair da tela. O ACESSO **não grava áudio**.
- **Limitação real:** em Chrome e Edge quem reconhece a fala é um serviço online do navegador, então o áudio pode sair do
  aparelho e é preciso internet. Firefox não oferece a API: nele a tela mostra o ditado do sistema (Windows + H, ou o
  microfone do teclado do celular). Nada foi afirmado como "offline".
- A API **não aceita vocabulário personalizado de forma confiável**, então o vocabulário não influencia o reconhecimento. Ele
  atua **depois**: o texto reconhecido vai para uma área de revisão com sugestões (sigla ou acentuação, termo escrito junto ou
  separado, erro pequeno perto de um termo do vocabulário). Cada sugestão traz o motivo e só vale se a pessoa aceitar. O
  texto nunca é trocado em silêncio e só entra no campo quando ela confirma.
- Vocabulário: profissões, habilidades, termos técnicos, modalidades, recrutamento e glossário. Escrito à mão, sem IA.

## 8. Limitações e o que não foi testado

- **Migration `0012` não foi executada** (sem banco descartável). Conferida só pelo texto do SQL.
- As regras de acesso foram testadas **nos services e nas rotas, com o banco simulado** (o projeto não tem banco de teste
  isolado). Não há teste de ponta a ponta contra um PostgreSQL real.
- As telas foram vistas no navegador do app com um servidor simulado, em 375 px (sem rolagem lateral). **Não testado:**
  NVDA, JAWS, VoiceOver, TalkBack, dispositivo de acionamento, celular físico, e o ditado com áudio real.
- Os textos novos de acessibilidade estão em português (ainda fora do dicionário pt/en/es).
- As caixas de seleção do componente de base medem 16 px; o rótulo clicável (maior) é um alvo equivalente.
- A resposta da empresa é registrada e notifica a pessoa, mas não há conversa em tempo real sobre ela.
