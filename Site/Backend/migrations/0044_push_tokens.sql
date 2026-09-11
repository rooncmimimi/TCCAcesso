-- =====================================================================
-- 0044_push_tokens.sql  (Fase R5 — notificações push nativas)
--
-- Guarda o Expo push token de cada dispositivo em que um usuário está
-- logado. Um token pertence ao DISPOSITIVO, não à conta: se a conta A sai
-- e a conta B entra no mesmo aparelho, o mesmo token passa a ser da conta
-- B (o registro é um UPSERT por `token`, ver `PushTokenService.registrar`).
--
-- Nada aqui apaga nem altera tabela existente — só cria uma nova. Segura
-- de rodar mais de uma vez (`IF NOT EXISTS` / `CREATE OR REPLACE`).
--
-- Depende de: 0001 (extensão pgcrypto p/ gen_random_uuid, função
-- acesso_set_updated_at) e da tabela public.usuarios.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.push_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID NOT NULL,
    token       TEXT NOT NULL UNIQUE,
    plataforma  TEXT NOT NULL CHECK (plataforma IN ('android', 'ios')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_push_tokens_usuario FOREIGN KEY (usuario_id)
        REFERENCES public.usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Consulta principal: "todos os tokens deste usuário" na hora de enviar um push.
CREATE INDEX IF NOT EXISTS idx_push_tokens_usuario ON public.push_tokens (usuario_id);

DROP TRIGGER IF EXISTS trg_push_tokens_updated_at ON public.push_tokens;
CREATE TRIGGER trg_push_tokens_updated_at BEFORE UPDATE ON public.push_tokens
    FOR EACH ROW EXECUTE FUNCTION public.acesso_set_updated_at();
