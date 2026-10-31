# Guia do schema do banco ACESSO

Este documento descreve o schema `public` do PostgreSQL/Supabase e a responsabilidade de cada grupo
de tabelas. É um guia de leitura e manutenção; a fonte executável da estrutura continua sendo os
arquivos SQL em `migrations/`.

> **Inventário auditado:** 32 tabelas funcionais da aplicação e 1 tabela técnica de controle de
> migrations (`migracoes_aplicadas`), totalizando 33 tabelas em `public` no momento desta revisão.
> Atualize este inventário quando uma nova migration criar ou remover tabelas.

## Visão geral por domínio

| Domínio | Tabelas | Responsabilidade |
| --- | --- | --- |
| Contas e autenticação | `usuarios`, `sessoes`, `tokens_push`, `codigos_recuperacao_senha`, `codigos_verificacao_email` | Conta principal, sessões, dispositivos e fluxos separados de recuperação de senha e confirmação de e-mail. |
| Preferências | `preferencias_acessibilidade`, `preferencias_notificacao` | Preferências individuais de acessibilidade e categorias de notificações. |
| Perfis e dados profissionais | `candidatos`, `empresas`, `deficiencias`, `candidato_deficiencias`, `candidato_experiencias`, `candidato_formacoes`, `candidato_certificados`, `candidato_habilidades` | Perfis de candidato/empresa e histórico profissional detalhado. |
| Vagas e recrutamento | `vagas`, `candidaturas`, `favoritos_vaga`, `empresas_seguidas` | Publicação de vagas, candidaturas, favoritos e relação de candidatos com empresas. |
| Rede de usuários | `usuarios_seguidos`, `solicitacoes_seguimento`, `usuarios_bloqueados` | Seguir pessoas, controlar pedidos para perfis privados e bloquear contas. |
| Feed | `postagens`, `postagem_anexos`, `comentarios`, `curtidas`, `compartilhamentos` | Publicações, mídias, comentários/respostas e interações. |
| Comunicação | `conversas`, `mensagens`, `notificacoes` | Conversas privadas, mensagens e avisos enviados aos usuários. |
| Administração e moderação | `denuncias`, `registros_auditoria` | Denúncias, decisões de moderação e trilha de ações administrativas. |
| Controle técnico | `migracoes_aplicadas` | Registra quais arquivos SQL já foram executados em cada banco. Não é uma funcionalidade de usuário. |

## Relações importantes

### Contas e perfis

- `usuarios` é a identidade de autenticação e autorização.
- `candidatos` e `empresas` são perfis de domínio ligados à conta por relações 1:1. Não duplicam a autenticação: guardam dados específicos de cada tipo de perfil.
- `empresas.usuario_id` identifica a conta institucional que acessa o painel da empresa.
- `empresas.usuario_candidato_id` identifica a conta pessoal de candidato da pessoa responsável pelo cadastro. São vínculos diferentes e não devem ser fundidos.
- `sessoes` guarda sessões por conta; `tokens_push` guarda tokens por dispositivo, permitindo que uma conta tenha mais de um aparelho.

### Perfil profissional do candidato

- `candidato_experiencias`, `candidato_formacoes`, `candidato_certificados` e `candidato_habilidades` são relações 1:N: um candidato pode ter vários registros de cada tipo.
- `deficiencias` é um catálogo compartilhado. `candidato_deficiencias` é a tabela de ligação N:N e também permite guardar observações daquele vínculo.
- `candidatos.escolaridade` é um resumo do nível de escolaridade informado no cadastro. `candidato_formacoes` guarda o histórico detalhado de cursos/formações. Os campos têm granularidades diferentes; não são duplicatas.
- O backend monta o perfil completo com associações do Sequelize, sem precisar armazenar uma segunda cópia agregada em `candidatos`.

### Recrutamento e rede

- `vagas` pertence a uma empresa; `candidaturas` relaciona uma vaga a um candidato.
- `favoritos_vaga` registra vagas salvas pelo candidato.
- `empresas_seguidas` representa candidato seguindo empresa. `usuarios_seguidos` representa usuário seguindo usuário; não são a mesma relação.
- `solicitacoes_seguimento` representa uma solicitação pendente para seguir conta privada. `usuarios_seguidos` representa uma relação já estabelecida. `usuarios_bloqueados` representa bloqueio e tem regra própria.

### Feed e comunicação

- `postagens` e `postagem_anexos` são separadas porque uma publicação pode ter vários anexos.
- `comentarios` guarda comentários e respostas por autor, com referência opcional ao comentário-pai.
- `curtidas` e `compartilhamentos` são eventos diferentes, com dados e regras próprios.
- `conversas` representa o relacionamento entre participantes; `mensagens` guarda cada mensagem da conversa. Uma conversa pode conter muitas mensagens.
- `notificacoes` é uma caixa de entrada de eventos. Seus campos `entidade_tipo` e `entidade_id` funcionam como referência polimórfica para diferentes recursos, por isso não equivalem a uma única FK tradicional.

## Decisões de normalização

As tabelas abaixo podem parecer candidatas à união, mas mantê-las separadas preserva a cardinalidade ou a regra de negócio:

| Tabelas | Por que manter separadas |
| --- | --- |
| `usuarios` + `candidatos`/`empresas` | Autenticação é diferente de dados específicos de cada perfil. |
| `conversas` + `mensagens` | Relação 1:N; juntar repetiria dados da conversa em cada mensagem. |
| `postagens` + `postagem_anexos` | Relação 1:N; uma postagem pode não ter anexo ou ter vários. |
| Tabelas `candidato_*` | Um perfil pode ter múltiplas experiências, formações, certificados e habilidades. |
| `deficiencias` + `candidato_deficiencias` | Catálogo reutilizável e relação N:N com observações por candidato. |
| `codigos_recuperacao_senha` + `codigos_verificacao_email` | Fluxos de segurança diferentes: a recuperação tem hash de token/código, tentativas e revogação de sessão; a confirmação de e-mail está vinculada ao novo endereço. |
| `usuarios_seguidos` + `solicitacoes_seguimento` + `usuarios_bloqueados` | Relações com estados e efeitos distintos: seguir, solicitar acesso e bloquear. |
| `preferencias_acessibilidade` + `preferencias_notificacao` | Ambas são 1:1 com usuário, mas pertencem a domínios independentes, têm APIs/services próprios e evoluem por razões diferentes. A união reduziria uma tabela, mas aumentaria o acoplamento sem remover uma redundância real. |

### Redundâncias de implementação identificadas

O perfil detalhado já é persistido em `candidato_experiencias` e `candidato_habilidades`, por meio das rotas de
`/perfil/:recurso`. Os campos escalares antigos `experiencia` e `habilidades` não existem no model
`Candidato` nem na tabela `candidatos`; por isso, não devem permanecer na lista de campos editáveis
nem no validador de `PUT /candidatos/:id`. O cadastro atual grava esses itens nas tabelas próprias.

## Tabela técnica de migrations

`migracoes_aplicadas` é criada pelo script `scripts/migrar.js`, não representa uma função de negócio
e não deve ser removida para reduzir a contagem. Ela impede que uma migration já aplicada seja
executada novamente. A perda desse controle pode causar tentativa de recriar objetos ou divergência
entre ambientes.

## Segurança e acesso

Todas as tabelas de `public` estão com RLS habilitado. No desenho atual, o backend faz a conexão com
a credencial definida no servidor e aplica autenticação/autorização nas rotas e services. Não há
políticas RLS de usuário final definidas nas tabelas da aplicação. Portanto:

- nunca coloque credenciais do banco ou a chave privilegiada do servidor no frontend;
- mantenha as operações do banco no backend;
- qualquer mudança para acesso direto do cliente via Supabase exige políticas RLS específicas,
  revisadas e testadas para cada tabela.

## Onde conferir a implementação

- Estrutura física e constraints: `migrations/0001_esquema_inicial.sql` e migrations incrementais.
- Models e associações ORM: `src/models/` e `src/models/index.js`.
- Regra de negócio: `src/services/`.
- Endpoints: `src/routes/` e `src/controllers/`.
- Histórico de evolução: [README das migrations](migrations/README.md).
