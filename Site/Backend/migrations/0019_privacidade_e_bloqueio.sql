-- =====================================================================
-- 0019_privacidade_e_bloqueio.sql
-- Perfil público/privado + bloqueio de usuário-a-usuário.
-- =====================================================================

ALTER TABLE public.usuarios
    ADD COLUMN IF NOT EXISTS perfil_publico BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS public.usuarios_bloqueados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    bloqueado_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_bloqueio_usuario FOREIGN KEY (usuario_id)
        REFERENCES public.usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_bloqueio_bloqueado FOREIGN KEY (bloqueado_id)
        REFERENCES public.usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT ck_bloqueio_diferentes CHECK (usuario_id <> bloqueado_id),
    CONSTRAINT uq_bloqueio UNIQUE (usuario_id, bloqueado_id)
);

CREATE INDEX IF NOT EXISTS idx_bloqueados_usuario ON public.usuarios_bloqueados (usuario_id);
CREATE INDEX IF NOT EXISTS idx_bloqueados_bloqueado ON public.usuarios_bloqueados (bloqueado_id);
