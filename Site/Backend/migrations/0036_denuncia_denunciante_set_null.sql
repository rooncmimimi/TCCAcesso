-- =====================================================================
-- 0036_denuncia_denunciante_set_null.sql
-- Fase 5 — exclusão de conta consistente.
--
-- `denuncias.denunciante_id` era NOT NULL + ON DELETE CASCADE: se a
-- pessoa que registrou uma denúncia excluísse a própria conta, a
-- denúncia inteira desaparecia — motivo, entidade denunciada e a
-- resolução do admin junto, mesmo quando a denúncia era contra outra
-- pessoa e já tinha sido resolvida com uma ação de moderação real.
--
-- Passa a seguir o mesmo padrão já usado em `admin_responsavel_id`
-- (também FK para usuarios, também SET NULL): a denúncia sobrevive à
-- exclusão do denunciante, só perde a referência a ele.
--
-- Nenhum dado existente é apagado ou alterado — só a constraint muda de
-- comportamento para exclusões futuras.
-- =====================================================================

ALTER TABLE public.denuncias
    ALTER COLUMN denunciante_id DROP NOT NULL;

ALTER TABLE public.denuncias
    DROP CONSTRAINT IF EXISTS fk_denuncia_denunciante;

ALTER TABLE public.denuncias
    ADD CONSTRAINT fk_denuncia_denunciante FOREIGN KEY (denunciante_id)
        REFERENCES public.usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE;
