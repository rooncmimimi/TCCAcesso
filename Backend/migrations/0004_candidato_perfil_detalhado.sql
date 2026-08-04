-- =====================================================================
-- 0004_candidato_perfil_detalhado.sql
-- Experiências, formações, certificados e habilidades normalizadas.
-- Substitui os campos texto livre "experiencia" e "habilidades".
-- =====================================================================

/* ---------------- Experiências ---------------- */
CREATE TABLE IF NOT EXISTS public.candidato_experiencias (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidato_id    UUID NOT NULL,
    cargo           VARCHAR(150) NOT NULL,
    empresa         VARCHAR(150) NOT NULL,
    local           VARCHAR(150),
    modalidade      VARCHAR(50),
    data_inicio     DATE NOT NULL,
    data_fim        DATE,
    atual           BOOLEAN NOT NULL DEFAULT FALSE,
    descricao       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_experiencias_candidato FOREIGN KEY (candidato_id)
        REFERENCES public.candidatos (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT ck_experiencias_periodo CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

CREATE INDEX IF NOT EXISTS idx_experiencias_candidato
    ON public.candidato_experiencias (candidato_id, data_inicio DESC);

/* ---------------- Formações ---------------- */
CREATE TABLE IF NOT EXISTS public.candidato_formacoes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidato_id    UUID NOT NULL,
    instituicao     VARCHAR(180) NOT NULL,
    curso           VARCHAR(180) NOT NULL,
    nivel           VARCHAR(80),
    data_inicio     DATE,
    data_fim        DATE,
    em_andamento    BOOLEAN NOT NULL DEFAULT FALSE,
    descricao       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_formacoes_candidato FOREIGN KEY (candidato_id)
        REFERENCES public.candidatos (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT ck_formacoes_periodo CHECK (data_fim IS NULL OR data_inicio IS NULL OR data_fim >= data_inicio)
);

CREATE INDEX IF NOT EXISTS idx_formacoes_candidato
    ON public.candidato_formacoes (candidato_id, data_inicio DESC);

/* ---------------- Certificados ---------------- */
CREATE TABLE IF NOT EXISTS public.candidato_certificados (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidato_id    UUID NOT NULL,
    titulo          VARCHAR(180) NOT NULL,
    instituicao     VARCHAR(180),
    emitido_em      DATE,
    expira_em       DATE,
    credencial_url  VARCHAR(500),
    arquivo         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_certificados_candidato FOREIGN KEY (candidato_id)
        REFERENCES public.candidatos (id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_certificados_candidato
    ON public.candidato_certificados (candidato_id);

/* ---------------- Habilidades ---------------- */
CREATE TABLE IF NOT EXISTS public.candidato_habilidades (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidato_id    UUID NOT NULL,
    nome            VARCHAR(80) NOT NULL,
    nivel           VARCHAR(30),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_habilidades_candidato FOREIGN KEY (candidato_id)
        REFERENCES public.candidatos (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_habilidade_por_candidato UNIQUE (candidato_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_habilidades_candidato
    ON public.candidato_habilidades (candidato_id);

/* ---------------- Campos extras no candidato ---------------- */
ALTER TABLE public.candidatos
    ADD COLUMN IF NOT EXISTS titulo_profissional VARCHAR(150),
    ADD COLUMN IF NOT EXISTS necessidades_acessibilidade TEXT,
    ADD COLUMN IF NOT EXISTS curriculo_nome VARCHAR(255),
    ADD COLUMN IF NOT EXISTS curriculo_atualizado_em TIMESTAMPTZ;

/* ---------------- Triggers updated_at ---------------- */
DROP TRIGGER IF EXISTS trg_experiencias_updated_at ON public.candidato_experiencias;
CREATE TRIGGER trg_experiencias_updated_at BEFORE UPDATE ON public.candidato_experiencias
    FOR EACH ROW EXECUTE FUNCTION public.acesso_set_updated_at();

DROP TRIGGER IF EXISTS trg_formacoes_updated_at ON public.candidato_formacoes;
CREATE TRIGGER trg_formacoes_updated_at BEFORE UPDATE ON public.candidato_formacoes
    FOR EACH ROW EXECUTE FUNCTION public.acesso_set_updated_at();

DROP TRIGGER IF EXISTS trg_certificados_updated_at ON public.candidato_certificados;
CREATE TRIGGER trg_certificados_updated_at BEFORE UPDATE ON public.candidato_certificados
    FOR EACH ROW EXECUTE FUNCTION public.acesso_set_updated_at();

DROP TRIGGER IF EXISTS trg_habilidades_updated_at ON public.candidato_habilidades;
CREATE TRIGGER trg_habilidades_updated_at BEFORE UPDATE ON public.candidato_habilidades
    FOR EACH ROW EXECUTE FUNCTION public.acesso_set_updated_at();
