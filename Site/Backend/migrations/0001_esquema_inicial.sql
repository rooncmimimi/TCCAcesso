-- =====================================================================
-- 0001_esquema_inicial.sql
--
-- Schema completo da aplicação ACESSO no PostgreSQL (Supabase), em português.
-- Roda num banco sem as tabelas da aplicação. Não mexe em nada gerenciado pelo
-- Supabase (auth, storage, realtime, vault, extensions).
--
-- Convenções:
-- - tabelas no plural e colunas em snake_case; chave estrangeira sempre com `_id`;
-- - `criado_em` em toda tabela e `atualizado_em` só onde a linha muda;
-- - datas e horas sempre em `timestamptz`;
-- - valores de enum em minúsculas, com `_` entre palavras;
-- - nomes de objetos: pk_, fk_, uq_, ck_, idx_ e trg_ seguidos da tabela e das colunas.
--
-- Segurança: RLS ligado em todas as tabelas e sem políticas. O Backend conecta
-- como `postgres`, que ignora RLS; `anon` e `authenticated` (a API REST do
-- Supabase) não leem nem gravam nada.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Extensões
-- ---------------------------------------------------------------------

-- `unaccent` e `pg_trgm` ficam em `public` porque `acesso_normalizar` e os
-- índices de busca usam `public.unaccent`.
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


-- ---------------------------------------------------------------------
-- Funções
-- ---------------------------------------------------------------------

-- Texto sem acento e em minúsculas. É imutável para poder entrar em índice: a
-- busca aplica a mesma função ao termo digitado e à coluna.
CREATE OR REPLACE FUNCTION public.acesso_normalizar(texto text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
    SELECT lower(public.unaccent('public.unaccent'::regdictionary, coalesce(texto, '')));
$$;

-- Mantém `atualizado_em` certo também em alterações feitas fora do Sequelize.
CREATE OR REPLACE FUNCTION public.acesso_definir_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.atualizado_em := now();
    RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------

CREATE TYPE public.tipo_usuario AS ENUM ('candidato', 'empresa', 'administrador');
CREATE TYPE public.preferencia_mensagens_usuario AS ENUM ('todos', 'seguidores', 'seguindo', 'mutuo', 'empresas', 'ninguem');
CREATE TYPE public.porte_empresa AS ENUM ('mei', 'micro', 'pequena', 'media', 'grande');
CREATE TYPE public.status_aprovacao_empresa AS ENUM ('pendente', 'aprovada', 'reprovada', 'suspensa');
CREATE TYPE public.modalidade_vaga AS ENUM ('presencial', 'hibrido', 'remoto');
CREATE TYPE public.contrato_vaga AS ENUM ('clt', 'pj', 'estagio', 'jovem_aprendiz', 'temporario');
CREATE TYPE public.status_vaga AS ENUM ('aberta', 'pausada', 'encerrada');
CREATE TYPE public.publico_alvo_vaga AS ENUM ('geral', 'pcd', 'cinquenta_mais', 'pcd_cinquenta_mais');
CREATE TYPE public.status_candidatura AS ENUM ('pendente', 'visualizada', 'em_analise', 'aprovada', 'rejeitada', 'cancelada');
CREATE TYPE public.tipo_anexo_postagem AS ENUM ('imagem', 'documento', 'video');
CREATE TYPE public.tipo_notificacao AS ENUM ('sistema', 'mensagem', 'vaga', 'candidatura', 'feed', 'moderacao');
CREATE TYPE public.tipo_entidade_denuncia AS ENUM ('postagem', 'comentario', 'usuario', 'mensagem', 'vaga', 'empresa');
CREATE TYPE public.motivo_denuncia AS ENUM ('spam', 'conteudo_ofensivo', 'discurso_odio', 'assedio', 'fraude', 'informacao_falsa', 'conteudo_inadequado', 'outro');
CREATE TYPE public.status_denuncia AS ENUM ('pendente', 'em_analise', 'resolvida', 'rejeitada', 'arquivada');
CREATE TYPE public.status_solicitacao_seguimento AS ENUM ('pendente', 'aceita', 'recusada');
CREATE TYPE public.papel_chatbot AS ENUM ('usuario', 'assistente');
CREATE TYPE public.plataforma_dispositivo AS ENUM ('android', 'ios');
CREATE TYPE public.tema_interface AS ENUM ('claro', 'escuro', 'sistema');


-- ---------------------------------------------------------------------
-- Contas
-- ---------------------------------------------------------------------

CREATE TABLE public.usuarios (
    id                     uuid NOT NULL DEFAULT gen_random_uuid(),
    nome                   varchar(150) NOT NULL,
    email                  varchar(150) NOT NULL,
    senha_hash             varchar(255) NOT NULL,
    telefone               varchar(20),
    foto_perfil            text,
    capa_perfil            text,
    tipo_usuario           public.tipo_usuario NOT NULL,
    ativo                  boolean NOT NULL DEFAULT true,
    bloqueado              boolean NOT NULL DEFAULT false,
    bloqueado_em           timestamptz,
    motivo_bloqueio        text,
    pausado_pelo_usuario   boolean NOT NULL DEFAULT false,
    pausado_em             timestamptz,
    perfil_publico         boolean NOT NULL DEFAULT true,
    preferencia_mensagens  public.preferencia_mensagens_usuario NOT NULL DEFAULT 'todos',
    email_verificado       boolean NOT NULL DEFAULT true,
    ultimo_login           timestamptz,
    senha_alterada_em      timestamptz,
    criado_em              timestamptz NOT NULL DEFAULT now(),
    atualizado_em          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_usuarios PRIMARY KEY (id),
    CONSTRAINT uq_usuarios_email UNIQUE (email)
);

CREATE TABLE public.administradores (
    id             uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id     uuid NOT NULL,
    nivel          smallint NOT NULL DEFAULT 1,
    criado_em      timestamptz NOT NULL DEFAULT now(),
    atualizado_em  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_administradores PRIMARY KEY (id),
    CONSTRAINT uq_administradores_usuario_id UNIQUE (usuario_id),
    CONSTRAINT fk_administradores_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE
);

CREATE TABLE public.sessoes (
    id                  uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id          uuid NOT NULL,
    token_hash          varchar(255) NOT NULL,
    expira_em           timestamptz NOT NULL,
    revogada_em         timestamptz,
    substituida_por_id  uuid,
    user_agent          varchar(255),
    ip                  varchar(64),
    criado_em           timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_sessoes PRIMARY KEY (id),
    CONSTRAINT uq_sessoes_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_sessoes_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_sessoes_substituida_por_id FOREIGN KEY (substituida_por_id) REFERENCES public.sessoes (id) ON DELETE SET NULL
);

CREATE TABLE public.tokens_push (
    id             uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id     uuid NOT NULL,
    token          text NOT NULL,
    plataforma     public.plataforma_dispositivo NOT NULL,
    criado_em      timestamptz NOT NULL DEFAULT now(),
    atualizado_em  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_tokens_push PRIMARY KEY (id),
    CONSTRAINT uq_tokens_push_token UNIQUE (token),
    CONSTRAINT fk_tokens_push_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE
);

CREATE TABLE public.codigos_recuperacao_senha (
    id              uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id      uuid NOT NULL,
    codigo_hash     varchar(255) NOT NULL,
    token_hash      varchar(255),
    expira_em       timestamptz NOT NULL,
    tentativas      smallint NOT NULL DEFAULT 0,
    utilizado_em    timestamptz,
    ip_solicitante  varchar(64),
    criado_em       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_codigos_recuperacao_senha PRIMARY KEY (id),
    CONSTRAINT ck_codigos_recuperacao_senha_tentativas CHECK (tentativas BETWEEN 0 AND 10),
    CONSTRAINT fk_codigos_recuperacao_senha_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE
);

CREATE TABLE public.codigos_verificacao_email (
    id            uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id    uuid NOT NULL,
    novo_email    varchar(150) NOT NULL,
    codigo_hash   varchar(255) NOT NULL,
    expira_em     timestamptz NOT NULL,
    tentativas    smallint NOT NULL DEFAULT 0,
    utilizado_em  timestamptz,
    criado_em     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_codigos_verificacao_email PRIMARY KEY (id),
    CONSTRAINT ck_codigos_verificacao_email_tentativas CHECK (tentativas BETWEEN 0 AND 10),
    CONSTRAINT fk_codigos_verificacao_email_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE
);

CREATE TABLE public.preferencias_acessibilidade (
    id                      uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id              uuid NOT NULL,
    tema                    public.tema_interface NOT NULL DEFAULT 'sistema',
    alto_contraste          boolean NOT NULL DEFAULT false,
    fonte_dislexia          boolean NOT NULL DEFAULT false,
    escala_fonte            smallint NOT NULL DEFAULT 100,
    espacamento_texto       boolean NOT NULL DEFAULT false,
    reduzir_animacoes       boolean NOT NULL DEFAULT false,
    leitura_por_voz         boolean NOT NULL DEFAULT false,
    consentimento_voz       boolean,
    velocidade_voz          numeric(3, 1) NOT NULL DEFAULT 1.0,
    linguagem_simplificada  boolean NOT NULL DEFAULT false,
    libras                  boolean NOT NULL DEFAULT true,
    destaque_foco           boolean NOT NULL DEFAULT true,
    criado_em               timestamptz NOT NULL DEFAULT now(),
    atualizado_em           timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_preferencias_acessibilidade PRIMARY KEY (id),
    CONSTRAINT uq_preferencias_acessibilidade_usuario_id UNIQUE (usuario_id),
    CONSTRAINT ck_preferencias_acessibilidade_escala_fonte CHECK (escala_fonte BETWEEN 80 AND 200),
    CONSTRAINT ck_preferencias_acessibilidade_velocidade_voz CHECK (velocidade_voz BETWEEN 0.5 AND 2.0),
    CONSTRAINT fk_preferencias_acessibilidade_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE
);

CREATE TABLE public.preferencias_notificacao (
    id                       uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id               uuid NOT NULL,
    vagas_candidaturas       boolean NOT NULL DEFAULT true,
    mensagens                boolean NOT NULL DEFAULT true,
    publicacoes_comentarios  boolean NOT NULL DEFAULT true,
    rede_seguidores          boolean NOT NULL DEFAULT true,
    criado_em                timestamptz NOT NULL DEFAULT now(),
    atualizado_em            timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_preferencias_notificacao PRIMARY KEY (id),
    CONSTRAINT uq_preferencias_notificacao_usuario_id UNIQUE (usuario_id),
    CONSTRAINT fk_preferencias_notificacao_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE
);


-- ---------------------------------------------------------------------
-- Candidatos
-- ---------------------------------------------------------------------

CREATE TABLE public.candidatos (
    id                           uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id                   uuid NOT NULL,
    cpf_cifrado                  text,
    cpf_hash                     varchar(64),
    data_nascimento              date,
    genero                       varchar(40),
    titulo_profissional          varchar(150),
    biografia                    text,
    escolaridade                 varchar(120),
    necessidades_acessibilidade  text,
    curriculo                    text,
    curriculo_nome               varchar(255),
    curriculo_atualizado_em      timestamptz,
    linkedin                     varchar(255),
    github                       varchar(255),
    cidade                       varchar(100),
    estado                       varchar(2),
    endereco                     text,
    cep                          varchar(8),
    disponibilidade              varchar(100),
    pretensao_salarial           numeric(10, 2),
    criado_em                    timestamptz NOT NULL DEFAULT now(),
    atualizado_em                timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_candidatos PRIMARY KEY (id),
    CONSTRAINT uq_candidatos_usuario_id UNIQUE (usuario_id),
    CONSTRAINT uq_candidatos_cpf_hash UNIQUE (cpf_hash),
    CONSTRAINT fk_candidatos_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE
);

CREATE TABLE public.deficiencias (
    id             uuid NOT NULL DEFAULT gen_random_uuid(),
    nome           varchar(100) NOT NULL,
    descricao      text,
    criado_em      timestamptz NOT NULL DEFAULT now(),
    atualizado_em  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_deficiencias PRIMARY KEY (id),
    CONSTRAINT uq_deficiencias_nome UNIQUE (nome)
);

CREATE TABLE public.candidato_deficiencias (
    id              uuid NOT NULL DEFAULT gen_random_uuid(),
    candidato_id    uuid NOT NULL,
    deficiencia_id  uuid NOT NULL,
    observacoes     text,
    criado_em       timestamptz NOT NULL DEFAULT now(),
    atualizado_em   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_candidato_deficiencias PRIMARY KEY (id),
    CONSTRAINT uq_candidato_deficiencias_candidato_id_deficiencia_id UNIQUE (candidato_id, deficiencia_id),
    CONSTRAINT fk_candidato_deficiencias_candidato_id FOREIGN KEY (candidato_id) REFERENCES public.candidatos (id) ON DELETE CASCADE,
    CONSTRAINT fk_candidato_deficiencias_deficiencia_id FOREIGN KEY (deficiencia_id) REFERENCES public.deficiencias (id) ON DELETE CASCADE
);

CREATE TABLE public.candidato_experiencias (
    id             uuid NOT NULL DEFAULT gen_random_uuid(),
    candidato_id   uuid NOT NULL,
    cargo          varchar(150) NOT NULL,
    empresa        varchar(150) NOT NULL,
    local          varchar(150),
    modalidade     varchar(50),
    data_inicio    date NOT NULL,
    data_fim       date,
    atual          boolean NOT NULL DEFAULT false,
    descricao      text,
    criado_em      timestamptz NOT NULL DEFAULT now(),
    atualizado_em  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_candidato_experiencias PRIMARY KEY (id),
    CONSTRAINT ck_candidato_experiencias_periodo CHECK (data_fim IS NULL OR data_fim >= data_inicio),
    CONSTRAINT fk_candidato_experiencias_candidato_id FOREIGN KEY (candidato_id) REFERENCES public.candidatos (id) ON DELETE CASCADE
);

CREATE TABLE public.candidato_formacoes (
    id             uuid NOT NULL DEFAULT gen_random_uuid(),
    candidato_id   uuid NOT NULL,
    instituicao    varchar(180) NOT NULL,
    curso          varchar(180) NOT NULL,
    nivel          varchar(80),
    data_inicio    date,
    data_fim       date,
    em_andamento   boolean NOT NULL DEFAULT false,
    descricao      text,
    criado_em      timestamptz NOT NULL DEFAULT now(),
    atualizado_em  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_candidato_formacoes PRIMARY KEY (id),
    CONSTRAINT ck_candidato_formacoes_periodo CHECK (data_fim IS NULL OR data_inicio IS NULL OR data_fim >= data_inicio),
    CONSTRAINT fk_candidato_formacoes_candidato_id FOREIGN KEY (candidato_id) REFERENCES public.candidatos (id) ON DELETE CASCADE
);

CREATE TABLE public.candidato_certificados (
    id              uuid NOT NULL DEFAULT gen_random_uuid(),
    candidato_id    uuid NOT NULL,
    titulo          varchar(180) NOT NULL,
    instituicao     varchar(180),
    emitido_em      date,
    expira_em       date,
    credencial_url  varchar(500),
    criado_em       timestamptz NOT NULL DEFAULT now(),
    atualizado_em   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_candidato_certificados PRIMARY KEY (id),
    CONSTRAINT fk_candidato_certificados_candidato_id FOREIGN KEY (candidato_id) REFERENCES public.candidatos (id) ON DELETE CASCADE
);

CREATE TABLE public.candidato_habilidades (
    id             uuid NOT NULL DEFAULT gen_random_uuid(),
    candidato_id   uuid NOT NULL,
    nome           varchar(80) NOT NULL,
    nivel          varchar(30),
    criado_em      timestamptz NOT NULL DEFAULT now(),
    atualizado_em  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_candidato_habilidades PRIMARY KEY (id),
    CONSTRAINT uq_candidato_habilidades_candidato_id_nome UNIQUE (candidato_id, nome),
    CONSTRAINT fk_candidato_habilidades_candidato_id FOREIGN KEY (candidato_id) REFERENCES public.candidatos (id) ON DELETE CASCADE
);


-- ---------------------------------------------------------------------
-- Empresas e vagas
-- ---------------------------------------------------------------------

CREATE TABLE public.empresas (
    id                  uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id          uuid NOT NULL,
    razao_social        varchar(200) NOT NULL,
    nome_fantasia       varchar(200),
    cnpj_cifrado        text,
    cnpj_hash           varchar(64),
    descricao           text,
    cultura_inclusiva   text,
    setor               varchar(120),
    porte               public.porte_empresa,
    site                varchar(255),
    cidade              varchar(100),
    estado              varchar(2),
    endereco            text,
    cep                 varchar(8),
    logo                text,
    capa                text,
    empresa_verificada  boolean NOT NULL DEFAULT false,
    status_aprovacao    public.status_aprovacao_empresa NOT NULL DEFAULT 'pendente',
    motivo_reprovacao   text,
    avaliado_em         timestamptz,
    avaliado_por_id     uuid,
    suspenso_em         timestamptz,
    suspenso_por_id     uuid,
    motivo_suspensao    text,
    criado_em           timestamptz NOT NULL DEFAULT now(),
    atualizado_em       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_empresas PRIMARY KEY (id),
    CONSTRAINT uq_empresas_usuario_id UNIQUE (usuario_id),
    CONSTRAINT uq_empresas_cnpj_hash UNIQUE (cnpj_hash),
    CONSTRAINT fk_empresas_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_empresas_avaliado_por_id FOREIGN KEY (avaliado_por_id) REFERENCES public.usuarios (id) ON DELETE SET NULL,
    CONSTRAINT fk_empresas_suspenso_por_id FOREIGN KEY (suspenso_por_id) REFERENCES public.usuarios (id) ON DELETE SET NULL
);

CREATE TABLE public.vagas (
    id                       uuid NOT NULL DEFAULT gen_random_uuid(),
    empresa_id               uuid NOT NULL,
    titulo                   varchar(200) NOT NULL,
    descricao                text NOT NULL,
    requisitos               text,
    beneficios               text,
    salario                  numeric(10, 2),
    modalidade               public.modalidade_vaga,
    contrato                 public.contrato_vaga,
    cidade                   varchar(100),
    estado                   varchar(2),
    carga_horaria            varchar(50),
    publico_alvo             public.publico_alvo_vaga NOT NULL DEFAULT 'geral',
    acessibilidade           text,
    recursos_acessibilidade  text[] NOT NULL DEFAULT '{}',
    status                   public.status_vaga NOT NULL DEFAULT 'aberta',
    oculta                   boolean NOT NULL DEFAULT false,
    data_encerramento        date,
    criado_em                timestamptz NOT NULL DEFAULT now(),
    atualizado_em            timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_vagas PRIMARY KEY (id),
    CONSTRAINT fk_vagas_empresa_id FOREIGN KEY (empresa_id) REFERENCES public.empresas (id) ON DELETE CASCADE
);

CREATE TABLE public.candidaturas (
    id             uuid NOT NULL DEFAULT gen_random_uuid(),
    vaga_id        uuid NOT NULL,
    candidato_id   uuid NOT NULL,
    status         public.status_candidatura NOT NULL DEFAULT 'pendente',
    mensagem       text,
    criado_em      timestamptz NOT NULL DEFAULT now(),
    atualizado_em  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_candidaturas PRIMARY KEY (id),
    CONSTRAINT uq_candidaturas_vaga_id_candidato_id UNIQUE (vaga_id, candidato_id),
    CONSTRAINT fk_candidaturas_vaga_id FOREIGN KEY (vaga_id) REFERENCES public.vagas (id) ON DELETE CASCADE,
    CONSTRAINT fk_candidaturas_candidato_id FOREIGN KEY (candidato_id) REFERENCES public.candidatos (id) ON DELETE CASCADE
);

CREATE TABLE public.favoritos_vaga (
    id            uuid NOT NULL DEFAULT gen_random_uuid(),
    candidato_id  uuid NOT NULL,
    vaga_id       uuid NOT NULL,
    criado_em     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_favoritos_vaga PRIMARY KEY (id),
    CONSTRAINT uq_favoritos_vaga_candidato_id_vaga_id UNIQUE (candidato_id, vaga_id),
    CONSTRAINT fk_favoritos_vaga_candidato_id FOREIGN KEY (candidato_id) REFERENCES public.candidatos (id) ON DELETE CASCADE,
    CONSTRAINT fk_favoritos_vaga_vaga_id FOREIGN KEY (vaga_id) REFERENCES public.vagas (id) ON DELETE CASCADE
);

CREATE TABLE public.empresas_seguidas (
    id            uuid NOT NULL DEFAULT gen_random_uuid(),
    candidato_id  uuid NOT NULL,
    empresa_id    uuid NOT NULL,
    criado_em     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_empresas_seguidas PRIMARY KEY (id),
    CONSTRAINT uq_empresas_seguidas_candidato_id_empresa_id UNIQUE (candidato_id, empresa_id),
    CONSTRAINT fk_empresas_seguidas_candidato_id FOREIGN KEY (candidato_id) REFERENCES public.candidatos (id) ON DELETE CASCADE,
    CONSTRAINT fk_empresas_seguidas_empresa_id FOREIGN KEY (empresa_id) REFERENCES public.empresas (id) ON DELETE CASCADE
);


-- ---------------------------------------------------------------------
-- Rede entre usuários
-- ---------------------------------------------------------------------

CREATE TABLE public.usuarios_seguidos (
    id           uuid NOT NULL DEFAULT gen_random_uuid(),
    seguidor_id  uuid NOT NULL,
    seguido_id   uuid NOT NULL,
    criado_em    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_usuarios_seguidos PRIMARY KEY (id),
    CONSTRAINT uq_usuarios_seguidos_seguidor_id_seguido_id UNIQUE (seguidor_id, seguido_id),
    CONSTRAINT ck_usuarios_seguidos_sem_autosseguimento CHECK (seguidor_id <> seguido_id),
    CONSTRAINT fk_usuarios_seguidos_seguidor_id FOREIGN KEY (seguidor_id) REFERENCES public.usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_usuarios_seguidos_seguido_id FOREIGN KEY (seguido_id) REFERENCES public.usuarios (id) ON DELETE CASCADE
);

-- A linha só existe enquanto o pedido está pendente: aceitar ou recusar apaga o pedido, e o
-- seguimento aceito vai para `usuarios_seguidos`.
CREATE TABLE public.solicitacoes_seguimento (
    id               uuid NOT NULL DEFAULT gen_random_uuid(),
    solicitante_id   uuid NOT NULL,
    destinatario_id  uuid NOT NULL,
    status           public.status_solicitacao_seguimento NOT NULL DEFAULT 'pendente',
    criado_em        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_solicitacoes_seguimento PRIMARY KEY (id),
    CONSTRAINT ck_solicitacoes_seguimento_sem_autossolicitacao CHECK (solicitante_id <> destinatario_id),
    CONSTRAINT fk_solicitacoes_seguimento_solicitante_id FOREIGN KEY (solicitante_id) REFERENCES public.usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_solicitacoes_seguimento_destinatario_id FOREIGN KEY (destinatario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE
);

CREATE TABLE public.usuarios_bloqueados (
    id            uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id    uuid NOT NULL,
    bloqueado_id  uuid NOT NULL,
    criado_em     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_usuarios_bloqueados PRIMARY KEY (id),
    CONSTRAINT uq_usuarios_bloqueados_usuario_id_bloqueado_id UNIQUE (usuario_id, bloqueado_id),
    CONSTRAINT ck_usuarios_bloqueados_sem_autobloqueio CHECK (usuario_id <> bloqueado_id),
    CONSTRAINT fk_usuarios_bloqueados_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_usuarios_bloqueados_bloqueado_id FOREIGN KEY (bloqueado_id) REFERENCES public.usuarios (id) ON DELETE CASCADE
);


-- ---------------------------------------------------------------------
-- Feed
-- ---------------------------------------------------------------------

CREATE TABLE public.postagens (
    id             uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id     uuid NOT NULL,
    conteudo       text NOT NULL,
    publica        boolean NOT NULL DEFAULT true,
    ativo          boolean NOT NULL DEFAULT true,
    editado_em     timestamptz,
    criado_em      timestamptz NOT NULL DEFAULT now(),
    atualizado_em  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_postagens PRIMARY KEY (id),
    CONSTRAINT fk_postagens_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE
);

-- `url` guarda o caminho do arquivo no bucket privado, nunca a URL assinada.
CREATE TABLE public.postagem_anexos (
    id             uuid NOT NULL DEFAULT gen_random_uuid(),
    postagem_id    uuid NOT NULL,
    tipo           public.tipo_anexo_postagem NOT NULL,
    url            text NOT NULL,
    nome_original  varchar(255),
    tipo_mime      varchar(120),
    tamanho_bytes  bigint,
    descricao      varchar(500),
    ordem          smallint NOT NULL DEFAULT 0,
    criado_em      timestamptz NOT NULL DEFAULT now(),
    atualizado_em  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_postagem_anexos PRIMARY KEY (id),
    CONSTRAINT ck_postagem_anexos_tamanho_bytes CHECK (tamanho_bytes IS NULL OR tamanho_bytes >= 0),
    CONSTRAINT fk_postagem_anexos_postagem_id FOREIGN KEY (postagem_id) REFERENCES public.postagens (id) ON DELETE CASCADE
);

CREATE TABLE public.comentarios (
    id                 uuid NOT NULL DEFAULT gen_random_uuid(),
    postagem_id        uuid NOT NULL,
    usuario_id         uuid NOT NULL,
    comentario_pai_id  uuid,
    comentario         text NOT NULL,
    ativo              boolean NOT NULL DEFAULT true,
    editado_em         timestamptz,
    criado_em          timestamptz NOT NULL DEFAULT now(),
    atualizado_em      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_comentarios PRIMARY KEY (id),
    CONSTRAINT fk_comentarios_postagem_id FOREIGN KEY (postagem_id) REFERENCES public.postagens (id) ON DELETE CASCADE,
    CONSTRAINT fk_comentarios_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_comentarios_comentario_pai_id FOREIGN KEY (comentario_pai_id) REFERENCES public.comentarios (id) ON DELETE CASCADE
);

CREATE TABLE public.curtidas (
    id           uuid NOT NULL DEFAULT gen_random_uuid(),
    postagem_id  uuid NOT NULL,
    usuario_id   uuid NOT NULL,
    criado_em    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_curtidas PRIMARY KEY (id),
    CONSTRAINT uq_curtidas_postagem_id_usuario_id UNIQUE (postagem_id, usuario_id),
    CONSTRAINT fk_curtidas_postagem_id FOREIGN KEY (postagem_id) REFERENCES public.postagens (id) ON DELETE CASCADE,
    CONSTRAINT fk_curtidas_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE
);

CREATE TABLE public.compartilhamentos (
    id           uuid NOT NULL DEFAULT gen_random_uuid(),
    postagem_id  uuid NOT NULL,
    usuario_id   uuid NOT NULL,
    comentario   text,
    criado_em    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_compartilhamentos PRIMARY KEY (id),
    CONSTRAINT fk_compartilhamentos_postagem_id FOREIGN KEY (postagem_id) REFERENCES public.postagens (id) ON DELETE CASCADE,
    CONSTRAINT fk_compartilhamentos_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE
);


-- ---------------------------------------------------------------------
-- Mensagens
-- ---------------------------------------------------------------------

-- O par de participantes fica em ordem canônica (`usuario_a_id < usuario_b_id`), então cada dupla
-- tem uma única conversa. Quando uma conta é excluída, o lado dela vira NULL e o histórico fica.
CREATE TABLE public.conversas (
    id                      uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_a_id            uuid,
    usuario_b_id            uuid,
    ultima_mensagem_em      timestamptz,
    ultima_mensagem_previa  varchar(180),
    criado_em               timestamptz NOT NULL DEFAULT now(),
    atualizado_em           timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_conversas PRIMARY KEY (id),
    CONSTRAINT uq_conversas_usuario_a_id_usuario_b_id UNIQUE (usuario_a_id, usuario_b_id),
    CONSTRAINT ck_conversas_ordem_canonica CHECK (usuario_a_id < usuario_b_id),
    CONSTRAINT fk_conversas_usuario_a_id FOREIGN KEY (usuario_a_id) REFERENCES public.usuarios (id) ON DELETE SET NULL,
    CONSTRAINT fk_conversas_usuario_b_id FOREIGN KEY (usuario_b_id) REFERENCES public.usuarios (id) ON DELETE SET NULL
);

CREATE TABLE public.mensagens (
    id             uuid NOT NULL DEFAULT gen_random_uuid(),
    conversa_id    uuid NOT NULL,
    remetente_id   uuid,
    conteudo       text NOT NULL,
    lida           boolean NOT NULL DEFAULT false,
    criado_em      timestamptz NOT NULL DEFAULT now(),
    atualizado_em  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_mensagens PRIMARY KEY (id),
    CONSTRAINT fk_mensagens_conversa_id FOREIGN KEY (conversa_id) REFERENCES public.conversas (id) ON DELETE CASCADE,
    CONSTRAINT fk_mensagens_remetente_id FOREIGN KEY (remetente_id) REFERENCES public.usuarios (id) ON DELETE SET NULL
);


-- ---------------------------------------------------------------------
-- Notificações, denúncias e auditoria
-- ---------------------------------------------------------------------

CREATE TABLE public.notificacoes (
    id             uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id     uuid NOT NULL,
    tipo           public.tipo_notificacao NOT NULL,
    subtipo        varchar(50),
    titulo         varchar(200) NOT NULL,
    descricao      text,
    lida           boolean NOT NULL DEFAULT false,
    entidade_tipo  varchar(30),
    entidade_id    uuid,
    ator_id        uuid,
    criado_em      timestamptz NOT NULL DEFAULT now(),
    atualizado_em  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_notificacoes PRIMARY KEY (id),
    CONSTRAINT fk_notificacoes_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_notificacoes_ator_id FOREIGN KEY (ator_id) REFERENCES public.usuarios (id) ON DELETE SET NULL
);

-- Referência polimórfica (`entidade_tipo` + `entidade_id`) sem FK: a denúncia continua na fila
-- mesmo depois que o conteúdo denunciado é removido.
CREATE TABLE public.denuncias (
    id                            uuid NOT NULL DEFAULT gen_random_uuid(),
    denunciante_id                uuid,
    entidade_tipo                 public.tipo_entidade_denuncia NOT NULL,
    entidade_id                   uuid NOT NULL,
    motivo                        public.motivo_denuncia NOT NULL,
    descricao                     text,
    status                        public.status_denuncia NOT NULL DEFAULT 'pendente',
    administrador_responsavel_id  uuid,
    observacao_administrador      text,
    resolvido_em                  timestamptz,
    criado_em                     timestamptz NOT NULL DEFAULT now(),
    atualizado_em                 timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_denuncias PRIMARY KEY (id),
    CONSTRAINT fk_denuncias_denunciante_id FOREIGN KEY (denunciante_id) REFERENCES public.usuarios (id) ON DELETE SET NULL,
    CONSTRAINT fk_denuncias_administrador_responsavel_id FOREIGN KEY (administrador_responsavel_id) REFERENCES public.usuarios (id) ON DELETE SET NULL
);

-- Registro imutável das ações administrativas. O administrador vira NULL se a conta dele for
-- excluída, para o histórico continuar legível.
CREATE TABLE public.registros_auditoria (
    id                uuid NOT NULL DEFAULT gen_random_uuid(),
    administrador_id  uuid,
    acao              varchar(50) NOT NULL,
    entidade_tipo     varchar(30),
    entidade_id       uuid,
    descricao         text,
    metadados         jsonb,
    ip                varchar(64),
    user_agent        varchar(255),
    criado_em         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_registros_auditoria PRIMARY KEY (id),
    CONSTRAINT fk_registros_auditoria_administrador_id FOREIGN KEY (administrador_id) REFERENCES public.usuarios (id) ON DELETE SET NULL
);


-- ---------------------------------------------------------------------
-- Assistente virtual
-- ---------------------------------------------------------------------

CREATE TABLE public.chatbot_conversas (
    id             uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id     uuid NOT NULL,
    titulo         varchar(150),
    criado_em      timestamptz NOT NULL DEFAULT now(),
    atualizado_em  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_chatbot_conversas PRIMARY KEY (id),
    CONSTRAINT fk_chatbot_conversas_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE
);

CREATE TABLE public.chatbot_mensagens (
    id           uuid NOT NULL DEFAULT gen_random_uuid(),
    conversa_id  uuid NOT NULL,
    papel        public.papel_chatbot NOT NULL,
    conteudo     text NOT NULL,
    contexto     jsonb,
    criado_em    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_chatbot_mensagens PRIMARY KEY (id),
    CONSTRAINT fk_chatbot_mensagens_conversa_id FOREIGN KEY (conversa_id) REFERENCES public.chatbot_conversas (id) ON DELETE CASCADE
);


-- ---------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------

-- Busca global: o termo digitado passa por `acesso_normalizar` antes de comparar.
CREATE INDEX idx_usuarios_nome_normalizado ON public.usuarios USING gin (public.acesso_normalizar(nome) gin_trgm_ops);
CREATE INDEX idx_usuarios_tipo_usuario_ativo ON public.usuarios (tipo_usuario, ativo);

CREATE INDEX idx_sessoes_usuario_id_ativas ON public.sessoes (usuario_id) WHERE revogada_em IS NULL;
CREATE INDEX idx_tokens_push_usuario_id ON public.tokens_push (usuario_id);

CREATE UNIQUE INDEX uq_codigos_recuperacao_senha_token_hash ON public.codigos_recuperacao_senha (token_hash) WHERE token_hash IS NOT NULL;
CREATE INDEX idx_codigos_recuperacao_senha_usuario_id_validos ON public.codigos_recuperacao_senha (usuario_id, expira_em DESC) WHERE utilizado_em IS NULL;
CREATE INDEX idx_codigos_verificacao_email_usuario_id_validos ON public.codigos_verificacao_email (usuario_id, expira_em DESC) WHERE utilizado_em IS NULL;

CREATE INDEX idx_candidatos_cidade ON public.candidatos (cidade);
CREATE INDEX idx_candidatos_estado ON public.candidatos (estado);
CREATE INDEX idx_candidato_deficiencias_deficiencia_id ON public.candidato_deficiencias (deficiencia_id);
CREATE INDEX idx_candidato_experiencias_candidato_id_data_inicio ON public.candidato_experiencias (candidato_id, data_inicio DESC);
CREATE INDEX idx_candidato_formacoes_candidato_id_data_inicio ON public.candidato_formacoes (candidato_id, data_inicio DESC);
CREATE INDEX idx_candidato_certificados_candidato_id ON public.candidato_certificados (candidato_id);

CREATE INDEX idx_empresas_status_aprovacao ON public.empresas (status_aprovacao);
CREATE INDEX idx_empresas_cidade ON public.empresas (cidade);
CREATE INDEX idx_empresas_estado ON public.empresas (estado);
CREATE INDEX idx_empresas_nome_normalizado ON public.empresas USING gin (public.acesso_normalizar(coalesce(nome_fantasia, razao_social)) gin_trgm_ops);

CREATE INDEX idx_vagas_empresa_id_criado_em ON public.vagas (empresa_id, criado_em DESC);
CREATE INDEX idx_vagas_status_criado_em ON public.vagas (status, criado_em DESC);
CREATE INDEX idx_vagas_estado ON public.vagas (estado);
CREATE INDEX idx_vagas_modalidade ON public.vagas (modalidade);
CREATE INDEX idx_vagas_contrato ON public.vagas (contrato);
CREATE INDEX idx_vagas_publico_alvo ON public.vagas (publico_alvo);
CREATE INDEX idx_vagas_recursos_acessibilidade ON public.vagas USING gin (recursos_acessibilidade);
CREATE INDEX idx_vagas_titulo_normalizado ON public.vagas USING gin (public.acesso_normalizar(titulo) gin_trgm_ops);

CREATE INDEX idx_candidaturas_candidato_id_criado_em ON public.candidaturas (candidato_id, criado_em DESC);
CREATE INDEX idx_candidaturas_vaga_id_status ON public.candidaturas (vaga_id, status);
CREATE INDEX idx_favoritos_vaga_vaga_id ON public.favoritos_vaga (vaga_id);
CREATE INDEX idx_empresas_seguidas_empresa_id ON public.empresas_seguidas (empresa_id);

CREATE INDEX idx_usuarios_seguidos_seguido_id ON public.usuarios_seguidos (seguido_id);
-- Só um pedido pendente por dupla: é a trava real contra dois pedidos simultâneos.
CREATE UNIQUE INDEX uq_solicitacoes_seguimento_pendente ON public.solicitacoes_seguimento (solicitante_id, destinatario_id) WHERE status = 'pendente';
CREATE INDEX idx_solicitacoes_seguimento_destinatario_id ON public.solicitacoes_seguimento (destinatario_id);
CREATE INDEX idx_usuarios_bloqueados_bloqueado_id ON public.usuarios_bloqueados (bloqueado_id);

CREATE INDEX idx_postagens_ativo_criado_em ON public.postagens (ativo, criado_em DESC);
CREATE INDEX idx_postagens_usuario_id_criado_em ON public.postagens (usuario_id, criado_em DESC);
CREATE INDEX idx_postagens_conteudo_normalizado ON public.postagens USING gin (public.acesso_normalizar(conteudo) gin_trgm_ops);
CREATE INDEX idx_postagem_anexos_postagem_id_ordem ON public.postagem_anexos (postagem_id, ordem);
CREATE INDEX idx_comentarios_postagem_id_criado_em ON public.comentarios (postagem_id, criado_em);
CREATE INDEX idx_comentarios_comentario_pai_id ON public.comentarios (comentario_pai_id);
CREATE INDEX idx_comentarios_usuario_id ON public.comentarios (usuario_id);
CREATE INDEX idx_curtidas_usuario_id ON public.curtidas (usuario_id);
CREATE INDEX idx_compartilhamentos_postagem_id ON public.compartilhamentos (postagem_id);
CREATE INDEX idx_compartilhamentos_usuario_id_criado_em ON public.compartilhamentos (usuario_id, criado_em DESC);

CREATE INDEX idx_conversas_usuario_b_id ON public.conversas (usuario_b_id);
CREATE INDEX idx_conversas_ultima_mensagem_em ON public.conversas (ultima_mensagem_em DESC NULLS LAST);
CREATE INDEX idx_mensagens_conversa_id_criado_em ON public.mensagens (conversa_id, criado_em DESC);
CREATE INDEX idx_mensagens_remetente_id ON public.mensagens (remetente_id);
CREATE INDEX idx_mensagens_conversa_id_nao_lidas ON public.mensagens (conversa_id) WHERE lida = false;

CREATE INDEX idx_notificacoes_usuario_id_criado_em ON public.notificacoes (usuario_id, criado_em DESC);
CREATE INDEX idx_notificacoes_usuario_id_nao_lidas ON public.notificacoes (usuario_id, criado_em DESC) WHERE lida = false;
CREATE INDEX idx_notificacoes_ator_id ON public.notificacoes (ator_id);

-- Uma denúncia aberta (pendente ou em análise) por pessoa e conteúdo.
CREATE UNIQUE INDEX uq_denuncias_aberta_por_denunciante ON public.denuncias (denunciante_id, entidade_tipo, entidade_id) WHERE status IN ('pendente', 'em_analise');
CREATE INDEX idx_denuncias_status_criado_em ON public.denuncias (status, criado_em DESC);
CREATE INDEX idx_denuncias_entidade_tipo_entidade_id ON public.denuncias (entidade_tipo, entidade_id);
CREATE INDEX idx_denuncias_motivo ON public.denuncias (motivo);
CREATE INDEX idx_denuncias_administrador_responsavel_id ON public.denuncias (administrador_responsavel_id);

CREATE INDEX idx_registros_auditoria_criado_em ON public.registros_auditoria (criado_em DESC);
CREATE INDEX idx_registros_auditoria_administrador_id ON public.registros_auditoria (administrador_id);
CREATE INDEX idx_registros_auditoria_acao ON public.registros_auditoria (acao);
CREATE INDEX idx_registros_auditoria_entidade_tipo_entidade_id ON public.registros_auditoria (entidade_tipo, entidade_id);

CREATE INDEX idx_chatbot_conversas_usuario_id_atualizado_em ON public.chatbot_conversas (usuario_id, atualizado_em DESC);
CREATE INDEX idx_chatbot_mensagens_conversa_id_criado_em ON public.chatbot_mensagens (conversa_id, criado_em);


-- ---------------------------------------------------------------------
-- Gatilhos de `atualizado_em`
-- ---------------------------------------------------------------------

DO $$
DECLARE
    tabela text;
BEGIN
    FOREACH tabela IN ARRAY ARRAY[
        'usuarios', 'administradores', 'tokens_push', 'preferencias_acessibilidade', 'preferencias_notificacao',
        'candidatos', 'deficiencias', 'candidato_deficiencias', 'candidato_experiencias', 'candidato_formacoes',
        'candidato_certificados', 'candidato_habilidades', 'empresas', 'vagas', 'candidaturas', 'postagens',
        'postagem_anexos', 'comentarios', 'conversas', 'mensagens', 'notificacoes', 'denuncias', 'chatbot_conversas'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.acesso_definir_atualizado_em()',
            'trg_' || tabela || '_atualizado_em',
            tabela
        );
    END LOOP;
END;
$$;


-- ---------------------------------------------------------------------
-- Segurança
-- ---------------------------------------------------------------------

DO $$
DECLARE
    tabela text;
BEGIN
    FOREACH tabela IN ARRAY ARRAY[
        'usuarios', 'administradores', 'sessoes', 'tokens_push', 'codigos_recuperacao_senha', 'codigos_verificacao_email',
        'preferencias_acessibilidade', 'preferencias_notificacao', 'candidatos', 'deficiencias', 'candidato_deficiencias',
        'candidato_experiencias', 'candidato_formacoes', 'candidato_certificados', 'candidato_habilidades', 'empresas',
        'vagas', 'candidaturas', 'favoritos_vaga', 'empresas_seguidas', 'usuarios_seguidos', 'solicitacoes_seguimento',
        'usuarios_bloqueados', 'postagens', 'postagem_anexos', 'comentarios', 'curtidas', 'compartilhamentos',
        'conversas', 'mensagens', 'notificacoes', 'denuncias', 'registros_auditoria', 'chatbot_conversas', 'chatbot_mensagens'
    ]
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabela);
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', tabela);
    END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.acesso_normalizar(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.acesso_definir_atualizado_em() FROM PUBLIC, anon, authenticated;


-- ---------------------------------------------------------------------
-- Comentários
-- ---------------------------------------------------------------------

COMMENT ON TABLE public.usuarios IS 'Contas da plataforma: candidatos, empresas e administradores.';
COMMENT ON COLUMN public.usuarios.pausado_pelo_usuario IS 'Pausa pedida pelo próprio usuário, diferente do bloqueio administrativo.';
COMMENT ON COLUMN public.usuarios.email_verificado IS 'Falso só enquanto um cadastro novo espera a confirmação do e-mail.';
COMMENT ON COLUMN public.usuarios.senha_alterada_em IS 'Tokens de acesso emitidos antes desta data deixam de valer.';
COMMENT ON TABLE public.administradores IS 'Dados extras das contas de administrador.';
COMMENT ON TABLE public.sessoes IS 'Sessões de login: cada linha guarda só o hash do refresh token e é trocada a cada renovação.';
COMMENT ON COLUMN public.sessoes.substituida_por_id IS 'Sessão que substituiu esta na renovação; permite aceitar uma renovação atrasada por alguns segundos.';
COMMENT ON TABLE public.tokens_push IS 'Expo push token de cada aparelho com sessão ativa no app.';
COMMENT ON TABLE public.codigos_recuperacao_senha IS 'Pedidos de redefinição de senha: hash do link (token) e do código de 6 dígitos.';
COMMENT ON TABLE public.codigos_verificacao_email IS 'Códigos para confirmar o cadastro e a troca de e-mail.';
COMMENT ON TABLE public.preferencias_acessibilidade IS 'Preferências de acessibilidade salvas na conta.';
COMMENT ON TABLE public.preferencias_notificacao IS 'Categorias de notificação que o usuário aceita receber.';
COMMENT ON TABLE public.candidatos IS 'Perfil de candidato de uma conta.';
COMMENT ON COLUMN public.candidatos.cpf_cifrado IS 'CPF cifrado com AES-256-GCM pela aplicação.';
COMMENT ON COLUMN public.candidatos.cpf_hash IS 'SHA-256 do CPF, só para impedir cadastro duplicado.';
COMMENT ON COLUMN public.candidatos.curriculo IS 'Caminho do currículo no bucket privado.';
COMMENT ON TABLE public.deficiencias IS 'Catálogo de deficiências que o candidato pode informar.';
COMMENT ON TABLE public.candidato_deficiencias IS 'Deficiências informadas por cada candidato.';
COMMENT ON TABLE public.candidato_experiencias IS 'Experiências profissionais do candidato.';
COMMENT ON TABLE public.candidato_formacoes IS 'Formação acadêmica do candidato.';
COMMENT ON TABLE public.candidato_certificados IS 'Certificados do candidato.';
COMMENT ON TABLE public.candidato_habilidades IS 'Habilidades do candidato.';
COMMENT ON TABLE public.empresas IS 'Perfil de empresa de uma conta, com a aprovação feita pela moderação.';
COMMENT ON COLUMN public.empresas.cnpj_cifrado IS 'CNPJ cifrado com AES-256-GCM pela aplicação.';
COMMENT ON COLUMN public.empresas.cnpj_hash IS 'SHA-256 do CNPJ, só para impedir cadastro duplicado.';
COMMENT ON TABLE public.vagas IS 'Vagas publicadas pelas empresas.';
COMMENT ON COLUMN public.vagas.recursos_acessibilidade IS 'Recursos de uma lista fechada, validada pela aplicação.';
COMMENT ON COLUMN public.vagas.oculta IS 'Escondida pela moderação, sem apagar a vaga.';
COMMENT ON TABLE public.candidaturas IS 'Candidaturas de candidatos a vagas.';
COMMENT ON TABLE public.favoritos_vaga IS 'Vagas salvas pelo candidato.';
COMMENT ON TABLE public.empresas_seguidas IS 'Empresas que cada candidato segue.';
COMMENT ON TABLE public.usuarios_seguidos IS 'Seguimento aprovado entre usuários.';
COMMENT ON TABLE public.solicitacoes_seguimento IS 'Pedidos pendentes para seguir perfis privados.';
COMMENT ON TABLE public.usuarios_bloqueados IS 'Bloqueios entre usuários; valem nos dois sentidos para a aplicação.';
COMMENT ON TABLE public.postagens IS 'Publicações do feed.';
COMMENT ON COLUMN public.postagens.publica IS 'Visível para visitantes sem login na página inicial.';
COMMENT ON COLUMN public.postagens.ativo IS 'Falso quando a publicação foi removida (exclusão lógica).';
COMMENT ON TABLE public.postagem_anexos IS 'Imagens e vídeos de uma publicação, guardados no bucket privado.';
COMMENT ON TABLE public.comentarios IS 'Comentários e respostas (um nível) das publicações.';
COMMENT ON TABLE public.curtidas IS 'Curtidas das publicações.';
COMMENT ON TABLE public.compartilhamentos IS 'Compartilhamentos de publicações na linha do tempo de quem compartilhou.';
COMMENT ON TABLE public.conversas IS 'Conversas privadas entre dois usuários.';
COMMENT ON TABLE public.mensagens IS 'Mensagens das conversas.';
COMMENT ON TABLE public.notificacoes IS 'Notificações exibidas no app e no site.';
COMMENT ON COLUMN public.notificacoes.subtipo IS 'Código do evento (como curtida_postagem), usado para ícone e destino.';
COMMENT ON TABLE public.denuncias IS 'Denúncias de conteúdo e contas para a moderação.';
COMMENT ON TABLE public.registros_auditoria IS 'Ações administrativas registradas para auditoria.';
COMMENT ON TABLE public.chatbot_conversas IS 'Conversas com o assistente da Central de Ajuda.';
COMMENT ON TABLE public.chatbot_mensagens IS 'Mensagens trocadas com o assistente.';
