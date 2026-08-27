-- =====================================================================
-- 0026_postagem_anexos_video.sql
-- Adiciona "video" ao ENUM tipo_anexo_postagem, para permitir vídeo como
-- anexo de publicação (substituindo "documento" na criação de novas
-- publicações — decisão feita apenas na camada de aplicação, não aqui).
--
-- Aditivo e seguro:
-- - não remove "imagem" nem "documento" do ENUM;
-- - não apaga nem altera nenhum registro existente de postagem_anexos;
-- - publicações antigas com anexo tipo "documento" continuam intactas e
--   continuam sendo exibidas normalmente pelo frontend (a aplicação só
--   deixa de OFERECER "documento" como opção ao CRIAR uma nova
--   publicação — o valor continua válido no banco).
-- =====================================================================

ALTER TYPE public.tipo_anexo_postagem ADD VALUE IF NOT EXISTS 'video';
