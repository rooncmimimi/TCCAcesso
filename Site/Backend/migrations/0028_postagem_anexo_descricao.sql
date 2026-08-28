-- =====================================================================
-- 0028_postagem_anexo_descricao.sql
-- Descrição acessível (texto alternativo) por anexo de postagem.
--
-- Uma descrição por ARQUIVO, não uma única descrição por postagem — cada
-- postagem_anexos já é uma linha própria por imagem/vídeo (migration
-- 0005), então o campo entra na mesma linha, sem tabela nova.
-- Aditiva, opcional (NULL permitido): anexos já existentes continuam
-- válidos sem descrição, e a ausência de descrição nunca bloqueia nada.
-- =====================================================================

ALTER TABLE public.postagem_anexos
    ADD COLUMN IF NOT EXISTS descricao VARCHAR(500);
