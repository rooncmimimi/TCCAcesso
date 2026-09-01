-- Migration 0034: solicitações de seguimento (perfil privado).
--
-- Hoje "seguir" é um toggle binário (usuarios_seguidos) sem noção de
-- "pendente" — necessário para perfil privado exigir aprovação antes do
-- seguimento existir de fato. Tabela nova, aditiva: nenhuma tabela
-- existente muda de forma.
--
-- Diferente de denuncias (que precisa de trilha para auditoria), uma
-- solicitação de seguir não tem valor de histórico depois de resolvida —
-- o estado durável que importa ("Pedro segue João") já fica registrado em
-- usuarios_seguidos, exatamente como o app já trata "deixar de seguir" e
-- "desbloquear" (exclusão física, sem histórico). Por isso o código da
-- aplicação vai APAGAR a linha ao aceitar/recusar, nunca fazer
-- UPDATE status=... e deixar — status/updated_at ficam no schema por
-- clareza e para não fechar a porta a mudar de ideia depois sem nova
-- migration.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_solicitacao_seguimento') THEN
        CREATE TYPE public.status_solicitacao_seguimento AS ENUM ('pendente', 'aceita', 'recusada');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.solicitacoes_seguimento (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitante_id   UUID NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
    destinatario_id  UUID NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
    status           public.status_solicitacao_seguimento NOT NULL DEFAULT 'pendente',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_solicitacao_sem_auto CHECK (solicitante_id <> destinatario_id)
);

-- Só uma solicitação PENDENTE por par ao mesmo tempo — trava de corrida no
-- próprio banco (duplo clique, duas abas), mesmo padrão de denuncias (0020).
CREATE UNIQUE INDEX IF NOT EXISTS idx_solicitacao_seguimento_pendente_unica
    ON public.solicitacoes_seguimento (solicitante_id, destinatario_id)
    WHERE status = 'pendente';

DROP TRIGGER IF EXISTS trg_solicitacoes_seguimento_updated_at ON public.solicitacoes_seguimento;
CREATE TRIGGER trg_solicitacoes_seguimento_updated_at BEFORE UPDATE ON public.solicitacoes_seguimento
    FOR EACH ROW EXECUTE FUNCTION public.acesso_set_updated_at();
