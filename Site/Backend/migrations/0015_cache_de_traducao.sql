-- =====================================================================
-- 0015_cache_de_traducao.sql
--
-- Guarda a tradução já feita, para o mesmo texto não ser traduzido duas vezes.
--
-- O QUE FAZ
--   Cria `traducoes`:
--        `hash`            char(64)   sha256 de "origem|destino|texto"  (chave de busca)
--        `idioma_origem`   varchar(5) pt, en ou es
--        `idioma_destino`  varchar(5) pt, en ou es
--        `texto`           text       a tradução
--        `motor`           varchar    quem traduziu (deepl)
--        `caracteres`      integer    tamanho do original, para acompanhar a cota do mês
--        `usado_em`        timestamptz última vez que esta linha foi servida
--
-- POR QUE EXISTE
--   Até agora cada leitor que clicava em "Traduzir" disparava uma tradução nova do MESMO texto: dez
--   pessoas lendo a mesma vaga custavam dez traduções. Com o cache, uma publicação é traduzida UMA
--   vez por idioma e servida do banco daí em diante. É isso que faz caber na camada gratuita do
--   DeepL (500 mil caracteres por mês) com folga larga.
--
-- POR QUE A CHAVE É UM HASH DO TEXTO, E NÃO O ID DA PUBLICAÇÃO
--   Porque assim não existe o problema de invalidar. Editou a publicação, o texto mudou, o hash
--   mudou: a linha velha simplesmente deixa de ser encontrada, e nenhuma tradução desatualizada
--   aparece para alguém. Também serve para publicação, comentário e vaga sem precisar saber de qual
--   deles o texto veio.
--
-- O QUE PODE ENTRAR AQUI
--   Só conteúdo PÚBLICO: publicação do feed, comentário e vaga. É o que `useTraducao` traduz hoje
--   no Site, e a rota não tem outro caminho. Mensagem de conversa é privada e **não** passa por
--   aqui — se um dia alguém quiser traduzir mensagem, o cache compartilhado é exatamente a parte
--   que não pode ser reaproveitada.
--
-- TEXTO ORIGINAL NÃO É GUARDADO
--   Só o hash dele. Para servir o cache basta comparar hashes, e guardar o original seria uma
--   segunda cópia do conteúdo sem utilidade nenhuma.
--
-- SEGURANÇA DE APLICAÇÃO
--   Sem `DEEPL_API_KEY` a rota responde 503 e o Site cai para o tradutor gratuito de antes: esta
--   tabela pode existir vazia sem incomodar ninguém.
--
--   A ordem certa continua sendo migration primeiro, chave depois. Trocar a ordem não quebra nada
--   para quem está lendo — com a chave ligada e a tabela ainda ausente, a rota responde 500 e o Site
--   usa a reserva gratuita —, mas enche o log de erro de banco sem necessidade.
--
-- COMO DESFAZER
--   Nada depende desta tabela: sem ela a rota de tradução falha e o Site usa a reserva.
--        DROP TABLE IF EXISTS public.traducoes;
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.traducoes (
    id             uuid NOT NULL DEFAULT gen_random_uuid(),
    -- sha256 de "origem|destino|texto": encontra a tradução sem guardar o texto de origem.
    hash           char(64) NOT NULL,
    idioma_origem  varchar(5) NOT NULL,
    idioma_destino varchar(5) NOT NULL,
    texto          text NOT NULL,
    motor          varchar(20) NOT NULL,
    -- Quantos caracteres o original tinha: é por aqui que dá para ver quanto da cota do mês foi usado.
    caracteres     integer NOT NULL DEFAULT 0,
    -- Última vez que esta linha foi servida. O que nunca mais é lido pode ser limpo um dia.
    usado_em       timestamptz NOT NULL DEFAULT now(),
    criado_em      timestamptz NOT NULL DEFAULT now(),
    atualizado_em  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_traducoes PRIMARY KEY (id),
    CONSTRAINT uq_traducoes_hash UNIQUE (hash),
    CONSTRAINT ck_traducoes_idioma_origem CHECK (idioma_origem IN ('pt', 'en', 'es')),
    CONSTRAINT ck_traducoes_idioma_destino CHECK (idioma_destino IN ('pt', 'en', 'es')),
    CONSTRAINT ck_traducoes_idiomas_diferentes CHECK (idioma_origem <> idioma_destino)
);

-- Para a limpeza do que ninguém lê há muito tempo.
CREATE INDEX IF NOT EXISTS idx_traducoes_usado_em ON public.traducoes (usado_em);

COMMENT ON TABLE public.traducoes IS
    'Tradução já feita de um texto público (publicação, comentário, vaga), guardada para não traduzir o mesmo texto duas vezes. A chave é o sha256 de origem|destino|texto: editar o conteúdo muda o hash e a linha velha deixa de ser encontrada. O texto original NÃO é guardado.';

COMMENT ON COLUMN public.traducoes.hash IS 'sha256 de "idioma_origem|idioma_destino|texto_original", em hexadecimal.';
COMMENT ON COLUMN public.traducoes.caracteres IS 'Tamanho do texto original, para acompanhar o consumo da cota mensal do tradutor.';
COMMENT ON COLUMN public.traducoes.usado_em IS 'Última vez que esta tradução foi servida a alguém.';

DO $$
BEGIN
    DROP TRIGGER IF EXISTS trg_traducoes_atualizado_em ON public.traducoes;

    CREATE TRIGGER trg_traducoes_atualizado_em
        BEFORE UPDATE ON public.traducoes
        FOR EACH ROW EXECUTE FUNCTION public.acesso_definir_atualizado_em();

    ALTER TABLE public.traducoes ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.traducoes FROM anon, authenticated;
END;
$$;
