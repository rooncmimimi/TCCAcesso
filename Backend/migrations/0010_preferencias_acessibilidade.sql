-- =====================================================================
-- 0010_preferencias_acessibilidade.sql
-- Preferências de acessibilidade persistidas por usuário (1:1).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.preferencias_acessibilidade (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id              UUID NOT NULL UNIQUE,
    tema                    VARCHAR(20) NOT NULL DEFAULT 'sistema',
    alto_contraste          BOOLEAN NOT NULL DEFAULT FALSE,
    fonte_dislexia          BOOLEAN NOT NULL DEFAULT FALSE,
    escala_fonte            SMALLINT NOT NULL DEFAULT 100,
    espacamento_texto       BOOLEAN NOT NULL DEFAULT FALSE,
    reduzir_animacoes       BOOLEAN NOT NULL DEFAULT FALSE,
    leitura_por_voz         BOOLEAN NOT NULL DEFAULT FALSE,
    consentimento_voz       BOOLEAN NOT NULL DEFAULT FALSE,
    velocidade_voz          NUMERIC(3,1) NOT NULL DEFAULT 1.0,
    linguagem_simplificada  BOOLEAN NOT NULL DEFAULT FALSE,
    libras                  BOOLEAN NOT NULL DEFAULT TRUE,
    destaque_foco           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_preferencias_usuario FOREIGN KEY (usuario_id)
        REFERENCES public.usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT ck_preferencias_tema CHECK (tema IN ('claro', 'escuro', 'sistema')),
    CONSTRAINT ck_preferencias_escala CHECK (escala_fonte BETWEEN 80 AND 200),
    CONSTRAINT ck_preferencias_velocidade CHECK (velocidade_voz BETWEEN 0.5 AND 2.0)
);

DROP TRIGGER IF EXISTS trg_preferencias_updated_at ON public.preferencias_acessibilidade;
CREATE TRIGGER trg_preferencias_updated_at BEFORE UPDATE ON public.preferencias_acessibilidade
    FOR EACH ROW EXECUTE FUNCTION public.acesso_set_updated_at();
