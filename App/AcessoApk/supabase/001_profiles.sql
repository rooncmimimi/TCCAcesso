-- =====================================================================
-- ACESSO (app Android) - Fase 1: tabela de perfis
-- Rodar no Supabase > SQL Editor. Pode ser executado mais de uma vez.
--
-- As senhas NÃO ficam aqui: quem guarda e protege a senha é o
-- Supabase Auth (tabela auth.users). Esta tabela guarda só o perfil.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id                 UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    name               TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
    email              TEXT NOT NULL,
    profile_image_url  TEXT,
    cover_image_url    TEXT,
    city               TEXT CHECK (char_length(city) <= 120),
    birth_date         DATE,
    bio                TEXT CHECK (char_length(bio) <= 1000),
    job_title          TEXT CHECK (char_length(job_title) <= 120),
    education          TEXT CHECK (char_length(education) <= 300),
    portfolio_url      TEXT,
    terms_accepted_at  TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS
    'Perfil profissional dos usuários do app ACESSO. O id é o mesmo UUID do Supabase Auth.';

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- Criação do perfil logo após o cadastro
--
-- O app envia nome, cidade, data de nascimento e o aceite dos termos
-- junto com o cadastro (campo "data" do Supabase Auth). Este gatilho
-- lê esses dados e cria a linha em profiles com o mesmo UUID do usuário.
--
-- Por que no banco e não no app? Quando a confirmação de e-mail está
-- ligada, o usuário ainda não tem sessão logo após o cadastro, e o RLS
-- impediria o app de inserir o perfil. Fazendo aqui, o perfil sempre
-- é criado, junto com a conta, na mesma transação.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_birth_date DATE;
BEGIN
    -- Data opcional: se vier em formato inválido, é ignorada em vez de impedir o cadastro.
    BEGIN
        v_birth_date := NULLIF(NEW.raw_user_meta_data ->> 'birth_date', '')::DATE;
    EXCEPTION WHEN others THEN
        v_birth_date := NULL;
    END;

    INSERT INTO public.profiles (id, name, email, city, birth_date, terms_accepted_at)
    VALUES (
        NEW.id,
        COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'name'), ''), split_part(NEW.email, '@', 1)),
        NEW.email,
        NULLIF(trim(NEW.raw_user_meta_data ->> 'city'), ''),
        v_birth_date,
        CASE WHEN NEW.raw_user_meta_data ->> 'terms_accepted' = 'true' THEN now() END
    );
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------
-- Segurança (RLS)
-- Usuário logado pode ver os perfis e editar somente o próprio.
-- Visitantes sem login (anon) não enxergam nada.
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- O Supabase libera tudo para anon/authenticated por padrão; começamos do zero
-- e liberamos só o necessário, coluna por coluna.
REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;

-- Colunas públicas entre usuários logados. E-mail, data de nascimento e aceite
-- dos termos ficam de fora para não expor dados pessoais (LGPD).
GRANT SELECT (id, name, profile_image_url, cover_image_url, city, bio, job_title,
              education, portfolio_url, created_at, updated_at)
    ON public.profiles TO authenticated;

-- Colunas que o próprio usuário pode alterar. id, e-mail e datas de controle não.
GRANT UPDATE (name, profile_image_url, cover_image_url, city, birth_date, bio,
              job_title, education, portfolio_url)
    ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "profiles: usuários logados podem ver" ON public.profiles;
CREATE POLICY "profiles: usuários logados podem ver"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "profiles: cada um edita o próprio" ON public.profiles;
CREATE POLICY "profiles: cada um edita o próprio"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);
