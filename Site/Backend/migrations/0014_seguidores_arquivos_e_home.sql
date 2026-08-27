-- =====================================================================
-- ACESSO — Migration 0014
-- Rede de seguidores entre usuários, catálogo de arquivos enviados
-- e índices de apoio para a busca global e a home dinâmica.
-- Idempotente: pode ser executada mais de uma vez com segurança.
-- =====================================================================

BEGIN;

/* ---------------------------------------------------------------
   1. SEGUIDORES ENTRE USUÁRIOS (candidato <-> candidato/empresa)
--------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS usuarios_seguidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seguidor_id UUID NOT NULL
        REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
    seguido_id UUID NOT NULL
        REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT usuarios_seguidos_unico UNIQUE (seguidor_id, seguido_id),
    CONSTRAINT usuarios_seguidos_sem_auto CHECK (seguidor_id <> seguido_id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_seguidos_seguidor
    ON usuarios_seguidos (seguidor_id);

CREATE INDEX IF NOT EXISTS idx_usuarios_seguidos_seguido
    ON usuarios_seguidos (seguido_id);

/* ---------------------------------------------------------------
   2. CATÁLOGO DE ARQUIVOS ENVIADOS
   Rastreia todo upload para auditoria e limpeza posterior.
--------------------------------------------------------------- */
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'arquivo_categoria') THEN
        CREATE TYPE arquivo_categoria AS ENUM (
            'foto_perfil',
            'capa_perfil',
            'logo_empresa',
            'capa_empresa',
            'postagem',
            'curriculo',
            'certificado',
            'documento'
        );
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS arquivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL
        REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
    categoria arquivo_categoria NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'imagem',
    url TEXT NOT NULL,
    nome_original VARCHAR(255),
    mime_type VARCHAR(120),
    tamanho_bytes BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arquivos_usuario
    ON arquivos (usuario_id, created_at DESC);

/* ---------------------------------------------------------------
   3. VISIBILIDADE PÚBLICA DAS POSTAGENS (home dinâmica)
--------------------------------------------------------------- */
ALTER TABLE postagens
    ADD COLUMN IF NOT EXISTS publica BOOLEAN NOT NULL DEFAULT TRUE;

/* ---------------------------------------------------------------
   4. ÍNDICES DE APOIO À BUSCA GLOBAL
--------------------------------------------------------------- */
CREATE INDEX IF NOT EXISTS idx_usuarios_nome_lower
    ON usuarios (LOWER(nome));

CREATE INDEX IF NOT EXISTS idx_empresas_nome_fantasia_lower
    ON empresas (LOWER(nome_fantasia));

CREATE INDEX IF NOT EXISTS idx_postagens_created_at
    ON postagens (created_at DESC);

COMMIT;
