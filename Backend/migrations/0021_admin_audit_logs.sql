-- =====================================================================
-- 0021_admin_audit_logs.sql
-- Auditoria administrativa.
--
-- Tabela deliberadamente IMUTÁVEL: sem coluna updated_at, sem trigger
-- de atualização. A aplicação nunca terá endpoint de UPDATE/DELETE
-- para esta tabela.
--
-- admin_id usa ON DELETE SET NULL (não CASCADE): o histórico
-- administrativo deve sobreviver mesmo que a conta do admin que
-- executou a ação seja excluída depois.
--
-- acao e entidade_tipo ficam como VARCHAR (não ENUM), decisão aprovada:
-- a lista de ações administrativas cresce conforme novas capacidades
-- são criadas, e cada ALTER TYPE ADD VALUE seria uma migration própria.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id       UUID,
    acao           VARCHAR(50) NOT NULL,
    entidade_tipo  VARCHAR(30),
    entidade_id    UUID,
    descricao      TEXT,
    metadata       JSONB,
    ip             VARCHAR(64),
    user_agent     VARCHAR(255),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_audit_log_admin FOREIGN KEY (admin_id)
        REFERENCES public.usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin
    ON public.admin_audit_logs (admin_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entidade
    ON public.admin_audit_logs (entidade_tipo, entidade_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON public.admin_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_acao
    ON public.admin_audit_logs (acao);
