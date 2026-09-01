-- =====================================================================
-- 0040_conversas_mensagens_preservar_historico.sql
-- Fase 8 — histórico de conversas sobrevive à exclusão de um participante.
--
-- Hoje `conversas.usuario_a_id`/`usuario_b_id` e `mensagens.remetente_id`
-- são NOT NULL com `ON DELETE CASCADE`: quando QUALQUER um dos dois
-- participantes exclui a conta, a conversa inteira e todas as mensagens
-- desaparecem também para o outro participante, que nada fez.
--
-- Depois desta migration, excluir a conta apenas desassocia a linha
-- (`ON DELETE SET NULL`) em vez de apagar a conversa/mensagem. O outro
-- participante continua vendo o histórico completo; o backend
-- (`ConversaService.enviarMensagem`) passa a recusar novas mensagens
-- quando um dos lados é nulo, e o frontend resolve o nome do lado nulo
-- como "Usuário removido" (`components/mensagens/utils.ts`).
--
-- Auditado antes de propor esta migration (ver Fase 8, auditoria):
-- - `chk_conversa_ordem_canonica` (usuario_a_id < usuario_b_id) e
--   `chk_conversa_participantes_distintos` (usuario_a_id <> usuario_b_id)
--   avaliam para NULL quando um dos lados é NULL — o Postgres trata uma
--   expressão CHECK que resulta em NULL como SATISFEITA, nunca violada.
--   Nenhuma das duas precisa mudar.
-- - `idx_conversas_par_unico` (UNIQUE em usuario_a_id, usuario_b_id):
--   NULL nunca é considerado igual a outro NULL para fins de unicidade —
--   sem risco de colisão entre duas conversas que compartilhem o lado
--   nulo. Não precisa virar índice parcial.
-- - `mensagens.conversa_id` (FK para conversas) permanece CASCADE — só a
--   referência ao USUÁRIO remetente muda de comportamento; a mensagem
--   continua pertencendo à conversa normalmente.
--
-- Rollback: reverter para NOT NULL só é seguro se, no momento do
-- rollback, nenhuma linha estiver com o campo NULL (senão o ALTER falha
-- com dado inconsistente); refazer o CASCADE original também apagaria de
-- volta o histórico já preservado por esta migration — avaliar caso a
-- caso, não é uma reversão automática/idempotente.
-- =====================================================================

ALTER TABLE public.conversas
    ALTER COLUMN usuario_a_id DROP NOT NULL,
    ALTER COLUMN usuario_b_id DROP NOT NULL;

ALTER TABLE public.mensagens
    ALTER COLUMN remetente_id DROP NOT NULL;

ALTER TABLE public.conversas
    DROP CONSTRAINT IF EXISTS fk_conversa_usuario_a;
ALTER TABLE public.conversas
    ADD CONSTRAINT fk_conversa_usuario_a FOREIGN KEY (usuario_a_id)
        REFERENCES public.usuarios (id) ON DELETE SET NULL;

ALTER TABLE public.conversas
    DROP CONSTRAINT IF EXISTS fk_conversa_usuario_b;
ALTER TABLE public.conversas
    ADD CONSTRAINT fk_conversa_usuario_b FOREIGN KEY (usuario_b_id)
        REFERENCES public.usuarios (id) ON DELETE SET NULL;

ALTER TABLE public.mensagens
    DROP CONSTRAINT IF EXISTS fk_mensagem_usuario;
ALTER TABLE public.mensagens
    ADD CONSTRAINT fk_mensagem_usuario FOREIGN KEY (remetente_id)
        REFERENCES public.usuarios (id) ON UPDATE CASCADE ON DELETE SET NULL;
