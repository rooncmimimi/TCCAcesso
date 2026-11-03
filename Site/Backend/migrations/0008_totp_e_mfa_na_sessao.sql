-- =====================================================================
-- 0008_totp_e_mfa_na_sessao.sql
--
-- Verificação em duas etapas por aplicativo autenticador (TOTP, RFC 6238): obrigatória para
-- administradores e opcional para as demais contas. Não usa SMS, WhatsApp nem serviço pago.
--
-- 1. `autenticacao_totp`: uma linha por conta que TEM o TOTP ativo (linha presente = ativo; nunca há
--    "configuração pela metade" no banco, porque o segredo ainda não confirmado viaja cifrado com o
--    cliente e só é gravado depois de ele provar que o aplicativo gera o código certo).
--      - `segredo_cifrado`: AES-256-GCM, com a conta no contexto da cifra. Nunca em claro.
--      - `confirmado_em`: quando o TOTP foi ativado ou trocado. Uma sessão de administrador só vale
--        se a verificação dela for igual ou posterior a esta data (reiniciar o TOTP derruba na hora
--        todos os access tokens antigos).
--      - `ultimo_passo`: último intervalo de 30 s aceito. Um código usado não vale de novo.
--      - `tentativas_falhas` e `bloqueado_ate`: espera progressiva depois de erros seguidos.
--
-- 2. `codigos_recuperacao_totp`: códigos de uso único para quem perdeu o aplicativo. Só o HMAC fica
--    guardado (o valor em claro aparece uma única vez, na ativação); `usado_em` marca o uso.
--
-- 3. `sessoes.mfa_verificado_em`: quando a sessão passou pelo segundo fator. Vai junto na renovação
--    do refresh token, para a sessão não perder a verificação ao renovar o access token.
--
-- Contas que já existem não têm TOTP, e nada muda para elas até a chave `MFA_TOTP_HABILITADO` ser
-- ligada. Com ela ligada, o administrador sem TOTP continua entrando, mas só alcança a tela de
-- configuração (o servidor nega todo o resto até ele ativar).
--
-- COMO VOLTAR ATRÁS (nada depende destas estruturas fora do TOTP):
--     ALTER TABLE public.sessoes DROP COLUMN IF EXISTS mfa_verificado_em;
--     DROP TABLE IF EXISTS public.codigos_recuperacao_totp;
--     DROP TABLE IF EXISTS public.autenticacao_totp;
-- Desligue `MFA_TOTP_HABILITADO` no Render antes de reverter.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.autenticacao_totp (
    usuario_id         uuid NOT NULL,
    segredo_cifrado    text NOT NULL,
    ultimo_passo       bigint,
    tentativas_falhas  smallint NOT NULL DEFAULT 0,
    bloqueado_ate      timestamptz,
    confirmado_em      timestamptz NOT NULL DEFAULT now(),
    criado_em          timestamptz NOT NULL DEFAULT now(),
    atualizado_em      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_autenticacao_totp PRIMARY KEY (usuario_id),
    CONSTRAINT fk_autenticacao_totp_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE,
    CONSTRAINT ck_autenticacao_totp_tentativas CHECK (tentativas_falhas >= 0)
);

CREATE TABLE IF NOT EXISTS public.codigos_recuperacao_totp (
    id           uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id   uuid NOT NULL,
    codigo_hash  varchar(64) NOT NULL,
    usado_em     timestamptz,
    criado_em    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_codigos_recuperacao_totp PRIMARY KEY (id),
    CONSTRAINT uq_codigos_recuperacao_totp_codigo_hash UNIQUE (codigo_hash),
    CONSTRAINT fk_codigos_recuperacao_totp_usuario_id FOREIGN KEY (usuario_id) REFERENCES public.usuarios (id) ON DELETE CASCADE
);

-- "Quantos códigos ainda restam?" e "este código serve?" só olham os que não foram usados.
CREATE INDEX IF NOT EXISTS idx_codigos_recuperacao_totp_livres
    ON public.codigos_recuperacao_totp (usuario_id)
 WHERE usado_em IS NULL;

ALTER TABLE public.sessoes
    ADD COLUMN IF NOT EXISTS mfa_verificado_em timestamptz;

DROP TRIGGER IF EXISTS trg_autenticacao_totp_atualizado_em ON public.autenticacao_totp;
CREATE TRIGGER trg_autenticacao_totp_atualizado_em
    BEFORE UPDATE ON public.autenticacao_totp
    FOR EACH ROW EXECUTE FUNCTION public.acesso_definir_atualizado_em();

-- Mesmo padrão das demais tabelas: só o servidor (papel de serviço) acessa; a API pública do Supabase não.
ALTER TABLE public.autenticacao_totp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codigos_recuperacao_totp ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.autenticacao_totp FROM anon, authenticated;
REVOKE ALL ON TABLE public.codigos_recuperacao_totp FROM anon, authenticated;

COMMENT ON TABLE public.autenticacao_totp IS 'Conta com verificação em duas etapas (TOTP) ativa. Linha presente = ativo.';
COMMENT ON COLUMN public.autenticacao_totp.segredo_cifrado IS 'Segredo TOTP cifrado (AES-256-GCM) com a conta no contexto. Nunca em claro.';
COMMENT ON COLUMN public.autenticacao_totp.confirmado_em IS 'Quando o TOTP foi ativado ou trocado; sessões de administrador verificadas antes disso deixam de valer.';
COMMENT ON COLUMN public.autenticacao_totp.ultimo_passo IS 'Último intervalo de 30 s aceito; impede reutilizar um código.';
COMMENT ON TABLE public.codigos_recuperacao_totp IS 'Códigos de recuperação do TOTP, de uso único. Só o HMAC é guardado.';
COMMENT ON COLUMN public.sessoes.mfa_verificado_em IS 'Quando a sessão passou pelo segundo fator (TOTP ou código de recuperação). Nulo = não passou.';
