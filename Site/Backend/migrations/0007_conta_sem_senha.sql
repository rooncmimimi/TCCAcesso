-- =====================================================================
-- 0007_conta_sem_senha.sql
--
-- Permite uma conta **sem senha**, desde que ela tenha um Google vinculado. É o que sustenta criar a
-- conta direto no retorno do Google (etapa 6 da auditoria do login com Google): quem entra pelo
-- Google não precisa inventar uma senha só para existir.
--
-- 1. `usuarios.senha_hash` deixa de ser `NOT NULL`. Nulo = a conta ainda não tem senha.
--
-- 2. `ck_usuarios_senha_ou_google` garante que nenhuma conta fique **sem nenhum jeito de entrar**:
--    ou tem senha, ou tem `google_id`. Sem esta regra, qualquer caminho que apagasse o vínculo
--    com o Google de uma conta sem senha (ou criasse uma conta vazia por engano) deixaria uma conta
--    que ninguém consegue abrir. A aplicação também recusa desvincular o Google de quem não tem
--    senha (`GoogleAuthService.desvincular`), e esta regra é a segunda barreira, no banco.
--
-- Contas que já existem têm todas uma senha, então a regra nasce válida e nada muda para elas.
--
-- COMO VOLTAR ATRÁS (só enquanto não houver conta sem senha):
--     ALTER TABLE public.usuarios DROP CONSTRAINT ck_usuarios_senha_ou_google;
--     ALTER TABLE public.usuarios ALTER COLUMN senha_hash SET NOT NULL;
-- O segundo comando falha se existir alguma conta sem senha. Nesse caso, defina uma senha para cada
-- uma (ou exclua a conta) antes. A aplicação só cria contas assim com `GOOGLE_CONTA_SEM_SENHA=true`;
-- desligar essa variável no Render para a criação de novas contas, sem tocar nas que já existem.
-- =====================================================================

ALTER TABLE public.usuarios
    ALTER COLUMN senha_hash DROP NOT NULL;

COMMENT ON COLUMN public.usuarios.senha_hash IS
    'Hash bcrypt da senha. Nulo = a conta entra só pelo Google e ainda não definiu senha (exige google_id).';

ALTER TABLE public.usuarios
    DROP CONSTRAINT IF EXISTS ck_usuarios_senha_ou_google;

ALTER TABLE public.usuarios
    ADD CONSTRAINT ck_usuarios_senha_ou_google
    CHECK (senha_hash IS NOT NULL OR google_id IS NOT NULL);
