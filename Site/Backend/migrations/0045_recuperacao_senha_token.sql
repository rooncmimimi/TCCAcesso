-- =====================================================================
-- 0045_recuperacao_senha_token.sql  (Auditoria do Site — Item 1)
--
-- Recuperação de senha passa a ter um TOKEN OPACO (alta entropia, gerado
-- por `gerarTokenOpaco()` — 48 bytes aleatórios) como mecanismo PRINCIPAL,
-- entregue por link no e-mail (`/redefinir-senha?token=...`). O código
-- numérico de 6 dígitos existente (migration 0008) é MANTIDO como
-- fallback documentado — é o único mecanismo que o aplicativo mobile usa
-- (não há deep link de redefinição no app), então não pode ser removido.
--
-- Os dois segredos (código e token) são gerados JUNTOS em `solicitar()` e
-- guardados na MESMA linha de `codigos_recuperacao_senha` — resgatar um
-- invalida o outro automaticamente (ambos disparam `utilizado_em`), sem
-- precisar de nenhuma lógica nova de invalidação cruzada.
--
-- Auditoria pré-migration (estrutura em produção, Supabase):
--   - Tabela `codigos_recuperacao_senha` (migration 0008): id UUID PK,
--     usuario_id UUID NOT NULL, codigo_hash VARCHAR(255) NOT NULL,
--     expira_em TIMESTAMP NOT NULL, tentativas SMALLINT NOT NULL DEFAULT 0,
--     utilizado_em TIMESTAMP NULL, ip_solicitante VARCHAR(64) NULL,
--     created_at TIMESTAMP NOT NULL. Sem coluna própria para um segundo
--     segredo — por isso esta migration só ADICIONA uma coluna nova.
--   - Nenhuma linha existente será alterada por esta migration (nenhum
--     UPDATE/DELETE). Linhas emitidas antes do deploy continuam válidas
--     via `codigo_hash` (o e-mail já enviado ainda tem o código de 6
--     dígitos) até expirarem naturalmente em até 15 minutos — não têm
--     `token_hash` e por isso não são resgatáveis pelo novo endpoint
--     baseado em token, só pelo fluxo de código já existente. Estratégia
--     de compatibilidade: nenhuma ação manual é necessária, a janela de
--     validade de 15 min já presente no `RecuperacaoSenhaService` cobre
--     a transição sozinha.
--   - Nada aqui apaga nem altera tabela/coluna existente — só cria. Segura
--     de rodar mais de uma vez (`IF NOT EXISTS`).
--
-- Depende de: 0008 (tabela codigos_recuperacao_senha).
-- =====================================================================

ALTER TABLE public.codigos_recuperacao_senha
    ADD COLUMN IF NOT EXISTS token_hash VARCHAR(255) NULL;

COMMENT ON COLUMN public.codigos_recuperacao_senha.token_hash IS
    'Hash SHA-256 do token opaco (link de e-mail). NULL para linhas que só '
    'guardam o código de 6 dígitos (fallback do app). Único quando presente '
    '— ver índice idx_codigos_recuperacao_senha_token_hash.';

-- Lookup direto por token (o endpoint com token não recebe e-mail — o hash
-- já identifica a linha sozinho) e garante, a nível de banco, que dois
-- tokens nunca colidam (na prática, com 48 bytes aleatórios, a chance é
-- desprezível — o índice único é defesa em profundidade, não uma
-- mitigação necessária).
CREATE UNIQUE INDEX IF NOT EXISTS idx_codigos_recuperacao_senha_token_hash
    ON public.codigos_recuperacao_senha (token_hash)
    WHERE token_hash IS NOT NULL;
