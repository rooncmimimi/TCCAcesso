-- =====================================================================
-- ACESSO (app Android) - Fase 1: tabela de perfis
-- Rodar no Supabase > SQL Editor. Pode ser executado mais de uma vez.
--
-- As senhas NÃO ficam aqui: quem guarda e protege a senha é o
-- Supabase Auth (tabela auth.users). Esta tabela guarda só o perfil.
-- Nomes que aparecem em inglês (auth.users, raw_user_meta_data,
-- authenticated, anon) são do próprio Supabase/PostgreSQL.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.perfis (
    id                 UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    nome               TEXT NOT NULL CHECK (char_length(nome) BETWEEN 2 AND 120),
    email              TEXT NOT NULL,
    url_foto_perfil    TEXT,
    url_foto_capa      TEXT,
    cidade             TEXT CHECK (char_length(cidade) <= 120),
    data_nascimento    DATE,
    biografia          TEXT CHECK (char_length(biografia) <= 1000),
    cargo              TEXT CHECK (char_length(cargo) <= 120),
    formacao           TEXT CHECK (char_length(formacao) <= 300),
    url_portfolio      TEXT,
    termos_aceitos_em  TIMESTAMPTZ,
    criado_em          TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.perfis IS
    'Perfil profissional dos usuários do app ACESSO. O id é o mesmo UUID do Supabase Auth.';

-- ---------------------------------------------------------------------
-- atualizado_em automático
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_definir_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS perfis_definir_atualizado_em ON public.perfis;
CREATE TRIGGER perfis_definir_atualizado_em
    BEFORE UPDATE ON public.perfis
    FOR EACH ROW EXECUTE FUNCTION public.app_definir_atualizado_em();

-- ---------------------------------------------------------------------
-- Criação do perfil logo após o cadastro
--
-- O app envia nome, cidade, data de nascimento e o aceite dos termos
-- junto com o cadastro (campo "data" do Supabase Auth). Este gatilho
-- lê esses dados e cria a linha em perfis com o mesmo UUID do usuário.
--
-- Por que no banco e não no app? Quando a confirmação de e-mail está
-- ligada, o usuário ainda não tem sessão logo após o cadastro, e o RLS
-- impediria o app de inserir o perfil. Fazendo aqui, o perfil sempre
-- é criado, junto com a conta, na mesma transação.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_criar_perfil_novo_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_data_nascimento DATE;
BEGIN
    -- Data opcional: se vier em formato inválido, é ignorada em vez de impedir o cadastro.
    BEGIN
        v_data_nascimento := NULLIF(NEW.raw_user_meta_data ->> 'data_nascimento', '')::DATE;
    EXCEPTION WHEN others THEN
        v_data_nascimento := NULL;
    END;

    INSERT INTO public.perfis (id, nome, email, cidade, data_nascimento, termos_aceitos_em)
    VALUES (
        NEW.id,
        COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'nome'), ''), split_part(NEW.email, '@', 1)),
        NEW.email,
        NULLIF(trim(NEW.raw_user_meta_data ->> 'cidade'), ''),
        v_data_nascimento,
        CASE WHEN NEW.raw_user_meta_data ->> 'aceitou_termos' = 'true' THEN now() END
    );
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.app_criar_perfil_novo_usuario() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ao_criar_usuario_auth ON auth.users;
CREATE TRIGGER ao_criar_usuario_auth
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.app_criar_perfil_novo_usuario();

-- ---------------------------------------------------------------------
-- Segurança (RLS)
-- Usuário logado pode ver os perfis e editar somente o próprio.
-- Visitantes sem login (anon) não enxergam nada.
-- ---------------------------------------------------------------------
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- O Supabase libera tudo para anon/authenticated por padrão; começamos do zero
-- e liberamos só o necessário, coluna por coluna.
REVOKE ALL ON TABLE public.perfis FROM anon, authenticated;

-- Colunas públicas entre usuários logados. E-mail, data de nascimento e aceite
-- dos termos ficam de fora para não expor dados pessoais (LGPD).
GRANT SELECT (id, nome, url_foto_perfil, url_foto_capa, cidade, biografia, cargo,
              formacao, url_portfolio, criado_em, atualizado_em)
    ON public.perfis TO authenticated;

-- Colunas que o próprio usuário pode alterar. id, e-mail e datas de controle não.
GRANT UPDATE (nome, url_foto_perfil, url_foto_capa, cidade, data_nascimento, biografia,
              cargo, formacao, url_portfolio)
    ON public.perfis TO authenticated;

DROP POLICY IF EXISTS "perfis: usuários logados podem ver" ON public.perfis;
CREATE POLICY "perfis: usuários logados podem ver"
    ON public.perfis FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "perfis: cada um edita o próprio" ON public.perfis;
CREATE POLICY "perfis: cada um edita o próprio"
    ON public.perfis FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);
