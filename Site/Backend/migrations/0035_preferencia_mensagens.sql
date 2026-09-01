-- =====================================================================
-- 0035_preferencia_mensagens.sql
-- Fase 4 — privacidade de mensagens: quem pode iniciar uma nova conversa
-- com o usuário.
-- =====================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'preferencia_mensagens_usuario') THEN
        CREATE TYPE public.preferencia_mensagens_usuario AS ENUM (
            'todos',
            'seguidores',
            'seguindo',
            'mutuo',
            'empresas',
            'ninguem'
        );
    END IF;
END
$$;

-- DEFAULT 'todos' preserva o comportamento atual pra todas as contas já
-- existentes (hoje, qualquer usuário não bloqueado pode iniciar uma
-- conversa com qualquer outro) — nenhuma conta perde a capacidade de
-- receber mensagens por causa desta migration.
ALTER TABLE public.usuarios
    ADD COLUMN IF NOT EXISTS preferencia_mensagens public.preferencia_mensagens_usuario NOT NULL DEFAULT 'todos';
