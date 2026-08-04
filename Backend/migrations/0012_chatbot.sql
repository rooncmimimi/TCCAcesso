-- =====================================================================
-- 0012_chatbot.sql
-- Histórico persistido do assistente do ACESSO (preparado para IA).
-- =====================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'papel_chatbot') THEN
        CREATE TYPE public.papel_chatbot AS ENUM ('usuario', 'assistente');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.chatbot_conversas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID NOT NULL,
    titulo          VARCHAR(150),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_chatbot_conversa_usuario FOREIGN KEY (usuario_id)
        REFERENCES public.usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.chatbot_mensagens (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversa_id         UUID NOT NULL,
    papel               public.papel_chatbot NOT NULL,
    conteudo            TEXT NOT NULL,
    contexto            JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_chatbot_mensagem_conversa FOREIGN KEY (conversa_id)
        REFERENCES public.chatbot_conversas (id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversas_usuario
    ON public.chatbot_conversas (usuario_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chatbot_mensagens_conversa
    ON public.chatbot_mensagens (conversa_id, created_at);

DROP TRIGGER IF EXISTS trg_chatbot_conversas_updated_at ON public.chatbot_conversas;
CREATE TRIGGER trg_chatbot_conversas_updated_at BEFORE UPDATE ON public.chatbot_conversas
    FOR EACH ROW EXECUTE FUNCTION public.acesso_set_updated_at();
