-- Migration 0033: notificações detalhadas e acionáveis (aditiva).
--
-- Hoje uma notificação é só texto solto (usuario_id, tipo, titulo,
-- descricao, lida) — não existe nenhum campo que aponte para o que ela é
-- sobre, então não há como montar um link/ação para o conteúdo
-- relacionado nem mostrar avatar de quem praticou a ação. Os 4 campos
-- abaixo são 100% nullable/aditivos: nenhuma coluna existente muda de
-- forma, nenhuma notificação já criada quebra, nenhum código antigo
-- para de funcionar.
--
-- `entidade_tipo`/`entidade_id`: ponteiro polimórfico SEM FK real —
-- mesmo padrão já usado em `denuncias.entidade_id` (migration 0020) e
-- `admin_audit_logs.entidade_id` (migration 0021): a entidade referenciada
-- (postagem, vaga, conversa, usuário...) pode ser apagada depois sem
-- travar nada, porque não há constraint de integridade nela. Existência e
-- posse continuam validadas na camada de aplicação, nunca pelo banco.
--
-- `ator_id`: quem praticou a ação (para buscar avatar/nome atuais em
-- tempo de leitura) — com ON DELETE SET NULL, mesmo padrão já usado em
-- `admin_audit_logs.admin_id` (migration 0021) e `empresas.avaliado_por`/
-- `suspenso_por` (migrations 0003/0024): se a conta do ator for excluída
-- depois, a notificação sobrevive (o texto em titulo/descricao já está
-- congelado), só perde o link/avatar ao vivo.
--
-- `subtipo`: string livre (sem ENUM), mesmo padrão já usado em
-- `admin_audit_logs.acao` (migration 0021) — permite adicionar um subtipo
-- novo (ex.: "resposta_comentario") no futuro sem precisar de outra
-- migration.

ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS subtipo VARCHAR(50);
ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS entidade_tipo VARCHAR(30);
ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS entidade_id UUID;
ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS ator_id UUID
    REFERENCES usuarios(id) ON DELETE SET NULL;
