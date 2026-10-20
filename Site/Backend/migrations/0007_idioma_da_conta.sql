-- =====================================================================
-- 0007_idioma_da_conta.sql
--
-- `usuarios.idioma` — o idioma da interface que a pessoa escolheu (`pt`, `en` ou `es`).
--
-- O Site passou a funcionar em três idiomas, e o servidor também fala: mensagens de erro e de
-- validação saem no idioma pedido pela requisição (`Accept-Language`), mas há textos que não são
-- resposta a uma requisição — o e-mail de bloqueio de conta, o aviso de empresa suspensa, o push de
-- uma notificação — e esses precisam de um idioma guardado para saber em que língua escrever.
-- Também é o que faz a escolha acompanhar a pessoa de um aparelho para outro.
--
-- Guarda o código de duas letras e não o nome, pelo mesmo motivo de `candidatos.pais`: o código não
-- muda com o idioma da interface. `NOT NULL DEFAULT 'pt'`: as contas que já existem são anteriores à
-- escolha e a plataforma sempre foi em português, então `pt` é o valor correto para elas, e não um
-- palpite. O app Android não manda idioma e continua em `pt`.
--
-- A lista fica num CHECK, e não num enum, para um quarto idioma entrar com uma migration pequena
-- (trocar o CHECK) em vez de mexer em tipo enumerado.
--
-- Para desfazer (migrations não têm "down"; este é o caminho manual):
--   ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS ck_usuarios_idioma;
--   ALTER TABLE public.usuarios DROP COLUMN IF EXISTS idioma;
-- =====================================================================

ALTER TABLE public.usuarios
    ADD COLUMN IF NOT EXISTS idioma varchar(2) NOT NULL DEFAULT 'pt';

COMMENT ON COLUMN public.usuarios.idioma IS
    'Idioma da interface escolhido pela pessoa: pt, en ou es. Define a língua dos e-mails e avisos que o servidor envia por conta própria.';

ALTER TABLE public.usuarios
    DROP CONSTRAINT IF EXISTS ck_usuarios_idioma;

ALTER TABLE public.usuarios
    ADD CONSTRAINT ck_usuarios_idioma CHECK (idioma IN ('pt', 'en', 'es'));
