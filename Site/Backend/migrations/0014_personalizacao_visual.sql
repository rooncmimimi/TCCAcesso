-- =====================================================================
-- 0014_personalizacao_visual.sql
--
-- A personalização visual para daltonismo passa a morar na conta, e não só no navegador.
--
-- O QUE FAZ
--   `preferencias_acessibilidade` ganha:
--        `visual`  jsonb  o padrão escolhido e os ajustes de quem usa
--
-- POR QUE UMA COLUNA SÓ, E JSONB
--   São sete coisas hoje (padrão, intensidade, saturação, brilho, contraste mínimo e as cores
--   escolhidas por significado) e o conjunto vai crescer — cada ajuste novo como coluna própria
--   seria uma migration nova. O projeto já usa jsonb em cinco modelos (adaptações da candidatura,
--   rascunhos, eventos de segurança, auditoria e vaga), então não é um padrão novo aqui.
--
--   Nulo quer dizer "nunca personalizou", que é diferente de "escolheu o padrão nenhum". Por isso
--   a coluna NÃO tem valor padrão.
--
-- O QUE O BACKEND GUARDA
--   O JSON nunca entra como veio do cliente: `AcessibilidadeService` só aceita as chaves que
--   conhece, cor só em `#rrggbb`, número só dentro da faixa e padrão só da lista. É o que impede
--   uma preferência de virar CSS arbitrário na tela de alguém.
--
-- SEGURANÇA DE APLICAÇÃO
--   A coluna só é declarada no model com `VISUAL_NA_CONTA_HABILITADO=true`. O Sequelize seleciona e
--   insere TODAS as colunas declaradas, então declarar antes de rodar esta migration derrubaria as
--   preferências de acessibilidade inteiras — foi o cuidado que a 0011 (idioma) já teve.
--
--   Ordem certa: rodar esta migration → ligar a chave → publicar.
--
-- COMO DESFAZER
--   Desligar `VISUAL_NA_CONTA_HABILITADO` já devolve o comportamento anterior (a personalização
--   volta a valer só no navegador). A coluna, se for mesmo para sair:
--        ALTER TABLE preferencias_acessibilidade DROP COLUMN visual;
--   Aditiva e opcional: nada mais depende dela.
-- =====================================================================

ALTER TABLE preferencias_acessibilidade
    ADD COLUMN IF NOT EXISTS visual jsonb;

COMMENT ON COLUMN preferencias_acessibilidade.visual IS
    'Personalização visual para daltonismo: padrão escolhido e ajustes. Nulo = nunca personalizou.';
