-- =====================================================================
-- 0013_ambiente_entrevista_e_midia_da_vaga.sql
--
-- Bloco 3 da acessibilidade avançada: empresas e ambientes de trabalho.
--
-- Tudo aqui é informação SOBRE A VAGA, escrita pela empresa, sem dado pessoal de ninguém. Todas as colunas são
-- opcionais: o que a empresa não preencher aparece como "a empresa não informou", nunca como valor inventado.
--
-- O QUE FAZ
--   1. `vagas` ganha:
--        `entrevista_adaptacoes`  text[]  as adaptações que a entrevista oferece (chaves do catálogo de adaptações)
--        `entrevista_observacao`  varchar(500)
--        `ambiente_sensorial`     jsonb   prévia sensorial (ruído, iluminação, espaço, interrupções, pausas, comunicação, rotina)
--        `acessibilidade_fisica`  jsonb   mapa físico: por item, situação, origem (declarado ou verificado) e detalhe
--        `atividades`, `requisitos_desejaveis`, `etapas_selecao`  texto  (os requisitos de sempre passam a ser lidos como
--                                 "obrigatórios"; estes três fecham a lacuna do resumo em linguagem simples)
--   2. `vaga_midias`: o vídeo da vaga em Libras, com transcrição (obrigatória) e legenda WebVTT (opcional, guardada como
--      texto na própria linha). Um vídeo por vaga. Nada é traduzido automaticamente para Libras.
--
-- SÓ ACRESCENTA: nenhuma linha existente é alterada nem apagada. A tabela nova tem RLS e nenhum acesso para
-- anon/authenticated (o backend controla o acesso, como no resto do projeto).
--
-- ORDEM DE IMPLANTAÇÃO: aplique esta migration ANTES de publicar o código que a usa; o model `Vaga` passa a ler as
-- colunas novas, e sem elas toda consulta de vaga falha.
--
-- COMO VOLTAR ATRÁS (nada fora do Bloco 3 depende destes objetos). Publique antes o código anterior:
--     DROP TABLE IF EXISTS public.vaga_midias;
--     ALTER TABLE public.vagas
--         DROP COLUMN IF EXISTS entrevista_adaptacoes, DROP COLUMN IF EXISTS entrevista_observacao,
--         DROP COLUMN IF EXISTS ambiente_sensorial, DROP COLUMN IF EXISTS acessibilidade_fisica,
--         DROP COLUMN IF EXISTS atividades, DROP COLUMN IF EXISTS requisitos_desejaveis,
--         DROP COLUMN IF EXISTS etapas_selecao;
-- =====================================================================

ALTER TABLE public.vagas
    ADD COLUMN IF NOT EXISTS entrevista_adaptacoes text[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS entrevista_observacao varchar(500),
    ADD COLUMN IF NOT EXISTS ambiente_sensorial jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS acessibilidade_fisica jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS atividades text,
    ADD COLUMN IF NOT EXISTS requisitos_desejaveis text,
    ADD COLUMN IF NOT EXISTS etapas_selecao text;

ALTER TABLE public.vagas DROP CONSTRAINT IF EXISTS ck_vagas_entrevista_quantidade;
ALTER TABLE public.vagas ADD CONSTRAINT ck_vagas_entrevista_quantidade CHECK (cardinality(entrevista_adaptacoes) <= 20);

ALTER TABLE public.vagas DROP CONSTRAINT IF EXISTS ck_vagas_ambiente_sensorial_objeto;
ALTER TABLE public.vagas ADD CONSTRAINT ck_vagas_ambiente_sensorial_objeto CHECK (jsonb_typeof(ambiente_sensorial) = 'object');

ALTER TABLE public.vagas DROP CONSTRAINT IF EXISTS ck_vagas_acessibilidade_fisica_objeto;
ALTER TABLE public.vagas ADD CONSTRAINT ck_vagas_acessibilidade_fisica_objeto CHECK (jsonb_typeof(acessibilidade_fisica) = 'object');

COMMENT ON COLUMN public.vagas.entrevista_adaptacoes IS 'Adaptações que a entrevista desta vaga oferece (chaves do catálogo de adaptações). Vazio: a empresa não informou.';
COMMENT ON COLUMN public.vagas.ambiente_sensorial IS 'Prévia sensorial do ambiente, escrita pela empresa: chaves fechadas (ruido, iluminacao, espaco, interrupcoes, pausas, comunicacao) e rotina. Chave ausente: não informado.';
COMMENT ON COLUMN public.vagas.acessibilidade_fisica IS 'Mapa de acessibilidade física por item: situacao (sim, parcial, nao), origem (declarado, verificado) e detalhe. Só a moderação marca "verificado". Item ausente: não informado.';
COMMENT ON COLUMN public.vagas.atividades IS 'O que a pessoa vai fazer, separado da descrição geral.';
COMMENT ON COLUMN public.vagas.requisitos_desejaveis IS 'Requisitos desejáveis. A coluna requisitos passa a ser lida como os obrigatórios.';
COMMENT ON COLUMN public.vagas.etapas_selecao IS 'Etapas do processo seletivo, em texto.';

CREATE TABLE IF NOT EXISTS public.vaga_midias (
    id              uuid NOT NULL DEFAULT gen_random_uuid(),
    vaga_id         uuid NOT NULL,
    tipo            varchar(20) NOT NULL DEFAULT 'video_libras',
    -- Caminho no bucket privado; a URL é assinada e temporária, resolvida sob demanda (nunca uma URL permanente).
    video_caminho   text NOT NULL,
    video_tipo_mime varchar(20) NOT NULL,
    -- WebVTT guardado como texto (até 256 KB, conferido pela aplicação): dispensa um arquivo e o CORS do player.
    legenda_vtt     text,
    -- Obrigatória: o vídeo só é publicado com a transcrição.
    transcricao     text NOT NULL,
    descricao       varchar(300),
    criado_em       timestamptz NOT NULL DEFAULT now(),
    atualizado_em   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_vaga_midias PRIMARY KEY (id),
    CONSTRAINT uq_vaga_midias_vaga_tipo UNIQUE (vaga_id, tipo),
    CONSTRAINT fk_vaga_midias_vaga_id FOREIGN KEY (vaga_id) REFERENCES public.vagas (id) ON DELETE CASCADE,
    CONSTRAINT ck_vaga_midias_tipo CHECK (tipo IN ('video_libras')),
    CONSTRAINT ck_vaga_midias_mime CHECK (video_tipo_mime IN ('video/mp4', 'video/webm')),
    CONSTRAINT ck_vaga_midias_transcricao CHECK (char_length(btrim(transcricao)) >= 20),
    CONSTRAINT ck_vaga_midias_legenda CHECK (legenda_vtt IS NULL OR (legenda_vtt LIKE 'WEBVTT%' AND char_length(legenda_vtt) <= 262144))
);

COMMENT ON TABLE public.vaga_midias IS 'Vídeo da vaga em Libras, com transcrição obrigatória e legenda WebVTT opcional. Sem tradução automática para Libras.';

DROP TRIGGER IF EXISTS trg_vaga_midias_atualizado_em ON public.vaga_midias;
CREATE TRIGGER trg_vaga_midias_atualizado_em BEFORE UPDATE ON public.vaga_midias FOR EACH ROW EXECUTE FUNCTION public.acesso_definir_atualizado_em();

ALTER TABLE public.vaga_midias ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.vaga_midias FROM anon, authenticated;
