-- =====================================================================
-- 0020_denuncias.sql
-- Sistema de denúncias — tabela única polimórfica.
--
-- entidade_id NÃO tem FK real: a estrutura é polimórfica (pode apontar
-- para postagens, comentarios, usuarios, mensagens, vagas ou empresas).
-- A existência e o tipo da entidade são validados na service layer no
-- momento da criação da denúncia — mesmo padrão que o projeto já usa
-- para validar IDs sem depender de FK (ex.: BloqueioService).
-- =====================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_entidade_denuncia') THEN
        CREATE TYPE public.tipo_entidade_denuncia AS ENUM (
            'postagem', 'comentario', 'usuario', 'mensagem', 'vaga', 'empresa'
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'motivo_denuncia') THEN
        CREATE TYPE public.motivo_denuncia AS ENUM (
            'spam', 'conteudo_ofensivo', 'discurso_odio', 'assedio',
            'fraude', 'informacao_falsa', 'conteudo_inadequado', 'outro'
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_denuncia') THEN
        CREATE TYPE public.status_denuncia AS ENUM (
            'pendente', 'em_analise', 'resolvida', 'rejeitada', 'arquivada'
        );
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.denuncias (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    denunciante_id         UUID NOT NULL,
    entidade_tipo          public.tipo_entidade_denuncia NOT NULL,
    entidade_id            UUID NOT NULL,
    motivo                 public.motivo_denuncia NOT NULL,
    descricao              TEXT,
    status                 public.status_denuncia NOT NULL DEFAULT 'pendente',
    admin_responsavel_id   UUID,
    observacao_admin       TEXT,
    resolvido_em           TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_denuncia_denunciante FOREIGN KEY (denunciante_id)
        REFERENCES public.usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_denuncia_admin_responsavel FOREIGN KEY (admin_responsavel_id)
        REFERENCES public.usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_denuncias_status
    ON public.denuncias (status);

CREATE INDEX IF NOT EXISTS idx_denuncias_entidade
    ON public.denuncias (entidade_tipo, entidade_id);

CREATE INDEX IF NOT EXISTS idx_denuncias_motivo
    ON public.denuncias (motivo);

CREATE INDEX IF NOT EXISTS idx_denuncias_admin_responsavel
    ON public.denuncias (admin_responsavel_id);

CREATE INDEX IF NOT EXISTS idx_denuncias_denunciante
    ON public.denuncias (denunciante_id);

CREATE INDEX IF NOT EXISTS idx_denuncias_created_at
    ON public.denuncias (created_at DESC);

-- Anti-spam: um mesmo denunciante não pode ter duas denúncias ATIVAS
-- (pendente/em_analise) contra a mesma entidade ao mesmo tempo.
-- Pode denunciar de novo depois que a anterior for decidida.
CREATE UNIQUE INDEX IF NOT EXISTS idx_denuncias_ativa_unica
    ON public.denuncias (denunciante_id, entidade_tipo, entidade_id)
    WHERE status IN ('pendente', 'em_analise');

DROP TRIGGER IF EXISTS trg_denuncias_updated_at ON public.denuncias;
CREATE TRIGGER trg_denuncias_updated_at BEFORE UPDATE ON public.denuncias
    FOR EACH ROW EXECUTE FUNCTION public.acesso_set_updated_at();
