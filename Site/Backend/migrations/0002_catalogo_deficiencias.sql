-- =====================================================================
-- 0002_catalogo_deficiencias.sql
--
-- Popula `deficiencias`, o catálogo que o candidato usa para declarar suas
-- deficiências no perfil (`SecaoDeficiencias` no App e no Site). Sem estas
-- linhas a tela abre vazia e ninguém consegue se declarar PCD, que é a base
-- do cruzamento entre candidato e vaga.
--
-- As categorias seguem o Decreto 5.296/2004 (art. 4º), a Lei 13.146/2015
-- (Estatuto da Pessoa com Deficiência) e a Lei 12.764/2012, que equipara a
-- pessoa com Transtorno do Espectro Autista à pessoa com deficiência para
-- todos os efeitos legais.
--
-- O detalhe de cada caso não fica aqui: o candidato escreve em
-- `candidato_deficiencias.observacoes` ao vincular uma categoria.
--
-- `ON CONFLICT (nome) DO NOTHING` deixa a migration repetível e preserva
-- qualquer categoria que a moderação tenha cadastrado por conta própria.
-- =====================================================================

INSERT INTO public.deficiencias (nome, descricao) VALUES
    (
        'Deficiência física',
        'Alteração completa ou parcial de um ou mais segmentos do corpo que comprometa a função física. Inclui, entre outras, paraplegia, tetraplegia, amputação, paralisia cerebral, nanismo e ostomia.'
    ),
    (
        'Deficiência auditiva',
        'Perda bilateral, parcial ou total, da audição.'
    ),
    (
        'Deficiência visual',
        'Cegueira ou baixa visão, consideradas a acuidade visual e a amplitude do campo visual.'
    ),
    (
        'Surdocegueira',
        'Perda auditiva e visual ao mesmo tempo, com necessidades de comunicação e mobilidade próprias, distintas das de cada deficiência isolada.'
    ),
    (
        'Deficiência intelectual',
        'Limitações no funcionamento intelectual e no comportamento adaptativo, manifestadas antes dos 18 anos.'
    ),
    (
        'Deficiência psicossocial',
        'Condição de saúde mental de longo prazo que, em interação com barreiras, limita a participação plena no trabalho e na sociedade.'
    ),
    (
        'Transtorno do Espectro Autista',
        'Equiparado à pessoa com deficiência para todos os efeitos legais (Lei 12.764/2012).'
    ),
    (
        'Deficiência múltipla',
        'Associação de duas ou mais deficiências na mesma pessoa.'
    )
ON CONFLICT (nome) DO NOTHING;
