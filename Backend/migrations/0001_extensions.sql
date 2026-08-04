-- =====================================================================
-- 0001_extensions.sql
-- Extensões necessárias para UUID, busca textual sem acento e trigram.
-- Idempotente: pode ser executada mais de uma vez sem efeito colateral.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Função imutável de normalização usada nos índices de busca global.
CREATE OR REPLACE FUNCTION public.acesso_normalizar(texto TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT lower(public.unaccent('public.unaccent'::regdictionary, coalesce(texto, '')));
$$;

-- Trigger genérica de updated_at (reutilizada pelas próximas migrations).
CREATE OR REPLACE FUNCTION public.acesso_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;
