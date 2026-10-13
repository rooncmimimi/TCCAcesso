-- =====================================================================
-- 0003_remover_chatbot_e_administradores.sql
--
-- Remove o chatbot e a tabela `administradores`.
--
-- `administradores` era uma extensão 1:1 de `usuarios` que nenhum fluxo do backend chegava a
-- preencher: a autorização sempre olhou `usuarios.tipo_usuario` (`utils/autorizacao.js`), e a
-- coluna `nivel` nunca foi lida em lugar nenhum. Sai sem substituto.
--
-- O chatbot era uma base de conhecimento local, sem IA externa; o histórico dele vivia nestas duas
-- tabelas. A Central de Ajuda que o hospedava saiu junto, para ser refeita depois; o contato com a
-- equipe passou a ser o "Fale conosco" do rodapé.
--
-- Atenção: `OPENROUTER_*` e o `OpenRouterService` NÃO têm relação com o chatbot e continuam —
-- servem à descrição automática de imagens (`SugestaoDescricaoService`), que é acessibilidade.
--
-- A ordem respeita as dependências: a tabela que aponta sai antes da apontada, e o enum sai depois
-- da coluna que o usa. `IF EXISTS` deixa a migration repetível.
-- =====================================================================

-- 1. Dependente primeiro: `chatbot_mensagens` tem FK para `chatbot_conversas`.
DROP TABLE IF EXISTS public.chatbot_mensagens;

-- 2. Agora a tabela apontada. (As triggers de `atualizado_em` caem junto com cada tabela.)
DROP TABLE IF EXISTS public.chatbot_conversas;

-- 3. Extensão 1:1 sem uso.
DROP TABLE IF EXISTS public.administradores;

-- 4. Por último o enum, que só era usado por `chatbot_mensagens.papel`.
DROP TYPE IF EXISTS public.papel_chatbot;
