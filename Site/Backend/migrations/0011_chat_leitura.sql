-- =====================================================================
-- 0011_chat_leitura.sql
-- Controle de leitura, contadores e ordenação por última mensagem.
-- =====================================================================

ALTER TABLE public.mensagens
    ADD COLUMN IF NOT EXISTS lida_em TIMESTAMPTZ;

ALTER TABLE public.conversas
    ADD COLUMN IF NOT EXISTS ultima_mensagem_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ultima_mensagem_previa VARCHAR(180);

CREATE INDEX IF NOT EXISTS idx_mensagens_conversa
    ON public.mensagens (conversa_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mensagens_nao_lidas
    ON public.mensagens (conversa_id)
    WHERE lida_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversas_recentes
    ON public.conversas (ultima_mensagem_em DESC NULLS LAST);

-- Mantém a prévia da conversa sempre sincronizada com a última mensagem.
CREATE OR REPLACE FUNCTION public.acesso_atualizar_previa_conversa()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.conversas
       SET ultima_mensagem_em = NEW.created_at,
           ultima_mensagem_previa = left(NEW.conteudo, 180)
     WHERE id = NEW.conversa_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mensagens_previa ON public.mensagens;
CREATE TRIGGER trg_mensagens_previa AFTER INSERT ON public.mensagens
    FOR EACH ROW EXECUTE FUNCTION public.acesso_atualizar_previa_conversa();
