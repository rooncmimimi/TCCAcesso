-- =====================================================================
-- 0012_adaptacoes_rascunhos_e_privacidade_da_candidatura.sql
--
-- Bloco 2 da acessibilidade avançada: inclusão nas candidaturas, com a privacidade decidida pela própria pessoa.
--
-- O QUE FAZ
--   1. `candidatos.exibir_deficiencia_no_perfil` (boolean, padrão FALSO): a categoria de deficiência deixa de ser pública.
--      Só aparece no perfil público se a pessoa escolher, e essa escolha NÃO libera nenhuma outra informação.
--      ATENÇÃO: quem tinha categoria declarada passa a ficar com ela PRIVADA a partir daqui (privacidade por padrão).
--   2. `perfis_adaptacao`: as adaptações profissionais da pessoa (lista fechada de chaves + observação opcional). Privada.
--   3. `preferencias_comunicacao`: canal preferido, canais a evitar e melhor horário. Privada.
--   4. `candidatura_adaptacoes`: UMA CÓPIA, por candidatura, do que a pessoa autorizou compartilhar com aquela empresa
--      (JSONB, porque é um retrato fechado e heterogêneo que nunca é consultado por conteúdo). Independente do perfil: mudar
--      o perfil depois não muda a cópia. Ao retirar a autorização o conteúdo é APAGADO (`itens` fica nulo) e só o registro
--      mínimo (datas, versão, quantidade) permanece.
--   5. `candidatura_rascunhos`: a candidatura em andamento, guardada no servidor. Fica numa tabela à parte (e não como
--      "status = rascunho" em `candidaturas`) para que NENHUMA consulta existente de empresa, contagem ou notificação
--      consiga enxergar um rascunho por engano: o que não está em `candidaturas` não é uma candidatura.
--
-- SÓ ACRESCENTA: não altera nem apaga linha existente. Todas as tabelas novas têm RLS ligada e sem acesso para anon/authenticated
-- (o backend é quem controla o acesso, como no resto do projeto).
--
-- ORDEM DE IMPLANTAÇÃO: aplique esta migration ANTES de publicar o código que a usa. O model `Candidato` passa a ler
-- `exibir_deficiencia_no_perfil`; sem a coluna, toda consulta de candidato falha.
--
-- COMO VOLTAR ATRÁS (nada fora do Bloco 2 depende destes objetos). Publique antes o código anterior:
--     DROP TABLE IF EXISTS public.candidatura_rascunhos;
--     DROP TABLE IF EXISTS public.candidatura_adaptacoes;
--     DROP TABLE IF EXISTS public.preferencias_comunicacao;
--     DROP TABLE IF EXISTS public.perfis_adaptacao;
--     ALTER TABLE public.candidatos DROP COLUMN IF EXISTS exibir_deficiencia_no_perfil;
-- =====================================================================

-- 1. Categoria de deficiência: privada por padrão ----------------------------------------------------------------

ALTER TABLE public.candidatos
    ADD COLUMN IF NOT EXISTS exibir_deficiencia_no_perfil boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.candidatos.exibir_deficiencia_no_perfil IS 'A pessoa escolheu mostrar a categoria de deficiência no perfil público. Falso por padrão e independente de qualquer autorização por candidatura.';

-- 2. Perfil de adaptações ----------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.perfis_adaptacao (
    id            uuid NOT NULL DEFAULT gen_random_uuid(),
    candidato_id  uuid NOT NULL,
    adaptacoes    text[] NOT NULL DEFAULT '{}',
    observacao    varchar(500),
    criado_em     timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_perfis_adaptacao PRIMARY KEY (id),
    CONSTRAINT uq_perfis_adaptacao_candidato_id UNIQUE (candidato_id),
    CONSTRAINT fk_perfis_adaptacao_candidato_id FOREIGN KEY (candidato_id) REFERENCES public.candidatos (id) ON DELETE CASCADE,
    CONSTRAINT ck_perfis_adaptacao_quantidade CHECK (cardinality(adaptacoes) <= 40)
);

COMMENT ON TABLE public.perfis_adaptacao IS 'Adaptações profissionais da pessoa candidata (chaves de uma lista fechada). Privado: só a própria pessoa lê e edita. Não exige nem guarda diagnóstico.';
COMMENT ON COLUMN public.perfis_adaptacao.observacao IS 'Texto livre opcional da própria pessoa. Nunca compartilhado sem autorização específica da candidatura.';

-- 3. Preferências de comunicação ---------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.preferencias_comunicacao (
    id                 uuid NOT NULL DEFAULT gen_random_uuid(),
    candidato_id       uuid NOT NULL,
    canais_preferidos  text[] NOT NULL DEFAULT '{}',
    canais_a_evitar    text[] NOT NULL DEFAULT '{}',
    melhor_horario     varchar(120),
    observacao         varchar(300),
    criado_em          timestamptz NOT NULL DEFAULT now(),
    atualizado_em      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_preferencias_comunicacao PRIMARY KEY (id),
    CONSTRAINT uq_preferencias_comunicacao_candidato_id UNIQUE (candidato_id),
    CONSTRAINT fk_preferencias_comunicacao_candidato_id FOREIGN KEY (candidato_id) REFERENCES public.candidatos (id) ON DELETE CASCADE,
    CONSTRAINT ck_preferencias_comunicacao_quantidade CHECK (cardinality(canais_preferidos) <= 12 AND cardinality(canais_a_evitar) <= 12),
    -- Um canal não pode ser, ao mesmo tempo, o preferido e o evitado.
    CONSTRAINT ck_preferencias_comunicacao_sem_conflito CHECK (NOT (canais_preferidos && canais_a_evitar))
);

COMMENT ON TABLE public.preferencias_comunicacao IS 'Como a pessoa prefere ser contatada. Privado. Uma preferência de comunicação não é diagnóstico.';

-- 4. Cópia autorizada por candidatura ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.candidatura_adaptacoes (
    id                  uuid NOT NULL DEFAULT gen_random_uuid(),
    candidatura_id      uuid NOT NULL,
    estado              varchar(10) NOT NULL DEFAULT 'ativa',
    finalidade          varchar(30) NOT NULL DEFAULT 'processo_seletivo',
    termo_versao        varchar(30) NOT NULL,
    versao              integer NOT NULL DEFAULT 1,
    -- O que a empresa recebe. Nulo depois da retirada: o conteúdo sensível não é mantido.
    itens               jsonb,
    total_itens         smallint NOT NULL DEFAULT 0,
    autorizado_em       timestamptz NOT NULL DEFAULT now(),
    retirado_em         timestamptz,
    -- Resposta da empresa à solicitação.
    resposta            varchar(30),
    resposta_mensagem   varchar(500),
    respondido_em       timestamptz,
    criado_em           timestamptz NOT NULL DEFAULT now(),
    atualizado_em       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_candidatura_adaptacoes PRIMARY KEY (id),
    CONSTRAINT uq_candidatura_adaptacoes_candidatura_id UNIQUE (candidatura_id),
    CONSTRAINT fk_candidatura_adaptacoes_candidatura_id FOREIGN KEY (candidatura_id) REFERENCES public.candidaturas (id) ON DELETE CASCADE,
    CONSTRAINT ck_candidatura_adaptacoes_estado CHECK (estado IN ('ativa', 'retirada')),
    CONSTRAINT ck_candidatura_adaptacoes_finalidade CHECK (finalidade IN ('processo_seletivo')),
    CONSTRAINT ck_candidatura_adaptacoes_resposta CHECK (
        resposta IS NULL OR resposta IN ('podemos_oferecer', 'podemos_providenciar', 'precisamos_verificar', 'podemos_conversar')
    ),
    CONSTRAINT ck_candidatura_adaptacoes_total CHECK (total_itens >= 0),
    -- A regra do conteúdo: ativa tem conteúdo e não tem data de retirada; retirada não tem conteúdo nem resposta.
    CONSTRAINT ck_candidatura_adaptacoes_conteudo CHECK (
        (estado = 'ativa' AND itens IS NOT NULL AND retirado_em IS NULL)
        OR (estado = 'retirada' AND itens IS NULL AND retirado_em IS NOT NULL AND resposta IS NULL AND resposta_mensagem IS NULL)
    )
);

COMMENT ON TABLE public.candidatura_adaptacoes IS 'Cópia, por candidatura, do que a pessoa autorizou compartilhar com a empresa dona da vaga. Independente do perfil. Retirar a autorização apaga o conteúdo (`itens`).';

-- 5. Rascunho da candidatura -------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.candidatura_rascunhos (
    id            uuid NOT NULL DEFAULT gen_random_uuid(),
    candidato_id  uuid NOT NULL,
    vaga_id       uuid NOT NULL,
    mensagem      text,
    -- O que a pessoa marcou para compartilhar (só as escolhas, nunca uma cópia do perfil).
    selecao       jsonb NOT NULL DEFAULT '{}'::jsonb,
    etapa         varchar(12) NOT NULL DEFAULT 'mensagem',
    expira_em     timestamptz NOT NULL,
    criado_em     timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_candidatura_rascunhos PRIMARY KEY (id),
    -- Um rascunho por pessoa e vaga: evita duplicidade.
    CONSTRAINT uq_candidatura_rascunhos_candidato_vaga UNIQUE (candidato_id, vaga_id),
    CONSTRAINT fk_candidatura_rascunhos_candidato_id FOREIGN KEY (candidato_id) REFERENCES public.candidatos (id) ON DELETE CASCADE,
    CONSTRAINT fk_candidatura_rascunhos_vaga_id FOREIGN KEY (vaga_id) REFERENCES public.vagas (id) ON DELETE CASCADE,
    CONSTRAINT ck_candidatura_rascunhos_etapa CHECK (etapa IN ('mensagem', 'adaptacoes', 'revisao')),
    CONSTRAINT ck_candidatura_rascunhos_selecao CHECK (jsonb_typeof(selecao) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_candidatura_rascunhos_expira_em ON public.candidatura_rascunhos (expira_em);

COMMENT ON TABLE public.candidatura_rascunhos IS 'Candidatura em preenchimento, salva no servidor. Visível só à pessoa dona; nunca à empresa, e não gera notificação. Expira (`expira_em`) e é apagada periodicamente.';

-- Gatilhos de `atualizado_em`, RLS e privilégios (obrigatórios em toda tabela nova) --------------------------------

DO $$
DECLARE
    tabela text;
BEGIN
    FOREACH tabela IN ARRAY ARRAY['perfis_adaptacao', 'preferencias_comunicacao', 'candidatura_adaptacoes', 'candidatura_rascunhos']
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'trg_' || tabela || '_atualizado_em', tabela);
        EXECUTE format(
            'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.acesso_definir_atualizado_em()',
            'trg_' || tabela || '_atualizado_em',
            tabela
        );
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabela);
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', tabela);
    END LOOP;
END;
$$;
