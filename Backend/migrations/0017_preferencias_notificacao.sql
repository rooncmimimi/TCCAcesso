-- =====================================================================
-- 0017_preferencias_notificacao.sql
-- Preferências de notificação por categoria (1:1 por usuário).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.preferencias_notificacao (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id               UUID NOT NULL UNIQUE,
    vagas_candidaturas       BOOLEAN NOT NULL DEFAULT TRUE,
    mensagens                BOOLEAN NOT NULL DEFAULT TRUE,
    publicacoes_comentarios  BOOLEAN NOT NULL DEFAULT TRUE,
    rede_seguidores          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_pref_notif_usuario FOREIGN KEY (usuario_id)
        REFERENCES public.usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
);

DROP TRIGGER IF EXISTS trg_pref_notif_updated_at ON public.preferencias_notificacao;
CREATE TRIGGER trg_pref_notif_updated_at BEFORE UPDATE ON public.preferencias_notificacao
    FOR EACH ROW EXECUTE FUNCTION public.acesso_set_updated_at();
