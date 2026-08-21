-- =====================================================================
-- 0015_autenticacao_dois_fatores.sql
-- Autenticação de dois fatores (2FA) por usuário — 1:1.
--
-- `metodo` já nasce pronto para 'sms' no futuro (Fase 6 optou por TOTP
-- agora, sem provedor externo); `segredo_totp` guarda o segredo TOTP
-- (base32) já cifrado pela aplicação — nunca em texto puro no banco.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.autenticacao_dois_fatores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID NOT NULL UNIQUE,
    metodo          VARCHAR(10) NOT NULL DEFAULT 'totp',
    segredo_totp    TEXT,
    ativado         BOOLEAN NOT NULL DEFAULT FALSE,
    ativado_em      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_2fa_usuario FOREIGN KEY (usuario_id)
        REFERENCES public.usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT ck_2fa_metodo CHECK (metodo IN ('totp', 'sms'))
);

DROP TRIGGER IF EXISTS trg_2fa_updated_at ON public.autenticacao_dois_fatores;
CREATE TRIGGER trg_2fa_updated_at BEFORE UPDATE ON public.autenticacao_dois_fatores
    FOR EACH ROW EXECUTE FUNCTION public.acesso_set_updated_at();
