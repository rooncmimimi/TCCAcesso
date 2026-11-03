-- =====================================================================
-- 0010_dispositivos_confiaveis_e_eventos_de_seguranca.sql
--
-- Bloco 3: verificação por e-mail em dispositivo novo e recuperação de conta comprometida. Só CRIA tabelas novas; não
-- altera nenhuma tabela nem dado existente.
--
-- 1. `dispositivos_confiaveis`: aparelhos que a pessoa marcou como de confiança depois de confirmar o código do e-mail. O
--    Site guarda um token aleatório; aqui fica **só o hash dele**. Vale por tempo limitado (`expira_em`) e pode ser revogado.
-- 2. `desafios_de_dispositivo`: cada código de 6 dígitos enviado por e-mail ao entrar de um aparelho novo. Só o HMAC do código
--    fica guardado, com prazo, contagem de tentativas e de reenvios; um novo envio invalida o anterior.
-- 3. `links_de_seguranca`: os links de uso único dos e-mails "Acho que invadiram minha conta" e "Não fui eu". Só o hash do
--    token fica guardado, com prazo e marca de uso.
-- 4. `eventos_de_seguranca`: o histórico de segurança de cada conta (dispositivo novo confirmado, dispositivo revogado,
--    conta protegida, senha ou TOTP alterados...), sem segredo nem código. Alimenta a tela "Atividade de segurança".
--
-- Todas apagam junto com a conta (`ON DELETE CASCADE`) e seguem o padrão das demais: RLS ligada e sem acesso para a API
-- pública do Supabase.
--
-- COMO VOLTAR ATRÁS (nada depende destas tabelas fora do Bloco 3):
--     DROP TABLE IF EXISTS public.eventos_de_seguranca;
--     DROP TABLE IF EXISTS public.links_de_seguranca;
--     DROP TABLE IF EXISTS public.desafios_de_dispositivo;
--     DROP TABLE IF EXISTS public.dispositivos_confiaveis;
-- Desligue `DISPOSITIVOS_CONFIAVEIS_HABILITADO` no Render antes de reverter.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.dispositivos_confiaveis (
    id             uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id     uuid NOT NULL,
    token_hash     varchar(64) NOT NULL,
    rotulo         varchar(120),
    ip             varchar(64),
    criado_em      timestamptz NOT NULL DEFAULT now(),
    ultimo_uso_em  timestamptz NOT NULL DEFAULT now(),
    expira_em      timestamptz NOT NULL,
    revogado_em    timestamptz,
    CONSTRAINT pk_dispositivos_confiaveis PRIMARY KEY (id),
    CONSTRAINT uq_dispositivos_confiaveis_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_dispositivos_confiaveis_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dispositivos_confiaveis_ativos
    ON public.dispositivos_confiaveis (usuario_id)
 WHERE revogado_em IS NULL;

CREATE TABLE IF NOT EXISTS public.desafios_de_dispositivo (
    id             uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id     uuid NOT NULL,
    codigo_hash    varchar(64) NOT NULL,
    expira_em      timestamptz NOT NULL,
    tentativas     smallint NOT NULL DEFAULT 0,
    reenvios       smallint NOT NULL DEFAULT 0,
    utilizado_em   timestamptz,
    substituido_em timestamptz,
    ip             varchar(64),
    user_agent     varchar(255),
    criado_em      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_desafios_de_dispositivo PRIMARY KEY (id),
    CONSTRAINT fk_desafios_de_dispositivo_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE,
    CONSTRAINT ck_desafios_de_dispositivo_contagens CHECK (tentativas >= 0 AND reenvios >= 0)
);

CREATE INDEX IF NOT EXISTS idx_desafios_de_dispositivo_usuario
    ON public.desafios_de_dispositivo (usuario_id, criado_em DESC);

CREATE TABLE IF NOT EXISTS public.links_de_seguranca (
    id            uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id    uuid NOT NULL,
    tipo          varchar(20) NOT NULL,
    token_hash    varchar(64) NOT NULL,
    expira_em     timestamptz NOT NULL,
    utilizado_em  timestamptz,
    ip            varchar(64),
    criado_em     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_links_de_seguranca PRIMARY KEY (id),
    CONSTRAINT uq_links_de_seguranca_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_links_de_seguranca_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE,
    CONSTRAINT ck_links_de_seguranca_tipo CHECK (tipo IN ('comprometida', 'nao_fui_eu'))
);

CREATE INDEX IF NOT EXISTS idx_links_de_seguranca_usuario
    ON public.links_de_seguranca (usuario_id, criado_em DESC);

CREATE TABLE IF NOT EXISTS public.eventos_de_seguranca (
    id          uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id  uuid NOT NULL,
    tipo        varchar(50) NOT NULL,
    ip          varchar(64),
    user_agent  varchar(255),
    metadados   jsonb,
    criado_em   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_eventos_de_seguranca PRIMARY KEY (id),
    CONSTRAINT fk_eventos_de_seguranca_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_eventos_de_seguranca_usuario
    ON public.eventos_de_seguranca (usuario_id, criado_em DESC);

ALTER TABLE public.dispositivos_confiaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desafios_de_dispositivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links_de_seguranca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_de_seguranca ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.dispositivos_confiaveis FROM anon, authenticated;
REVOKE ALL ON TABLE public.desafios_de_dispositivo FROM anon, authenticated;
REVOKE ALL ON TABLE public.links_de_seguranca FROM anon, authenticated;
REVOKE ALL ON TABLE public.eventos_de_seguranca FROM anon, authenticated;

COMMENT ON TABLE public.dispositivos_confiaveis IS 'Aparelhos marcados como de confiança após o código do e-mail. Só o hash do token fica guardado.';
COMMENT ON TABLE public.desafios_de_dispositivo IS 'Códigos de 6 dígitos enviados por e-mail ao entrar de um aparelho novo. Só o HMAC do código fica guardado.';
COMMENT ON TABLE public.links_de_seguranca IS 'Links de uso único dos e-mails "Acho que invadiram minha conta" e "Não fui eu". Só o hash do token fica guardado.';
COMMENT ON TABLE public.eventos_de_seguranca IS 'Histórico de segurança de cada conta. Nunca guarda segredo nem código.';
