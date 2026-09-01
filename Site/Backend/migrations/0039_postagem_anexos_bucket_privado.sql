-- =====================================================================
-- 0039_postagem_anexos_bucket_privado.sql
-- Fase 7 — segurança e privacidade dos anexos de publicações.
--
-- Rastreia em qual bucket do Supabase Storage cada anexo efetivamente
-- vive. DEFAULT false reflete a realidade atual confirmada por
-- inventário (todo anexo hoje está no bucket público) — nenhum dado
-- existente muda de comportamento só por causa desta coluna; o
-- comportamento novo (privado=true) só passa a valer para uploads
-- feitos DEPOIS que o código da Fase 7 entrar no ar.
--
-- `postagens.imagem` NÃO ganha uma coluna irmã (`imagem_privada`):
-- verificado que `imagem` sempre é uma cópia do caminho de um dos
-- registros em `postagem_anexos` (mesmo array de arquivos, mesma
-- requisição, nunca editado depois) — manter duas colunas seria
-- duplicação sem nenhum caso real de divergência. A privacidade de
-- `imagem` é resolvida em runtime comparando o caminho bruto com o do
-- anexo correspondente.
--
-- Rollback: DROP COLUMN — seguro enquanto nenhum arquivo real tiver
-- sido efetivamente movido de bucket (ver Fase 7, seção 7 do plano).
-- =====================================================================

ALTER TABLE public.postagem_anexos
    ADD COLUMN IF NOT EXISTS privado BOOLEAN NOT NULL DEFAULT false;
