import sequelize from "../config/bancoDeDados.js";

import Usuario from "./Usuario.js";
import Administrador from "./Administrador.js";
import Sessao from "./Sessao.js";
import TokenPush from "./TokenPush.js";
import CodigoRecuperacaoSenha from "./CodigoRecuperacaoSenha.js";
import CodigoVerificacaoEmail from "./CodigoVerificacaoEmail.js";
import PreferenciaAcessibilidade from "./PreferenciaAcessibilidade.js";
import PreferenciaNotificacao from "./PreferenciaNotificacao.js";
import Candidato from "./Candidato.js";
import Deficiencia from "./Deficiencia.js";
import CandidatoDeficiencia from "./CandidatoDeficiencia.js";
import CandidatoExperiencia from "./CandidatoExperiencia.js";
import CandidatoFormacao from "./CandidatoFormacao.js";
import CandidatoCertificado from "./CandidatoCertificado.js";
import CandidatoHabilidade from "./CandidatoHabilidade.js";
import Empresa from "./Empresa.js";
import Vaga from "./Vaga.js";
import Candidatura from "./Candidatura.js";
import FavoritoVaga from "./FavoritoVaga.js";
import EmpresaSeguida from "./EmpresaSeguida.js";
import UsuarioSeguido from "./UsuarioSeguido.js";
import SolicitacaoSeguimento from "./SolicitacaoSeguimento.js";
import UsuarioBloqueado from "./UsuarioBloqueado.js";
import Postagem from "./Postagem.js";
import PostagemAnexo from "./PostagemAnexo.js";
import Comentario from "./Comentario.js";
import Curtida from "./Curtida.js";
import Compartilhamento from "./Compartilhamento.js";
import Conversa from "./Conversa.js";
import Mensagem from "./Mensagem.js";
import Notificacao from "./Notificacao.js";
import Denuncia from "./Denuncia.js";
import RegistroAuditoria from "./RegistroAuditoria.js";
import ChatbotConversa from "./ChatbotConversa.js";
import ChatbotMensagem from "./ChatbotMensagem.js";

/**
 * Registro central dos models e das associações.
 *
 * As chaves estrangeiras e a regra de exclusão de cada uma ficam em
 * `migrations/0001_esquema_inicial.sql`; aqui só declaramos como o Sequelize navega entre elas.
 */

/* Perfis do usuário (1:1) */

Usuario.hasOne(Candidato, { foreignKey: "usuarioId", as: "candidato" });
Candidato.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

Usuario.hasOne(Empresa, { foreignKey: "usuarioId", as: "empresa" });
Empresa.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

Usuario.hasOne(Administrador, { foreignKey: "usuarioId", as: "administrador" });
Administrador.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

/* Sessões, códigos e preferências da conta */

Usuario.hasMany(Sessao, { foreignKey: "usuarioId", as: "sessoes" });
Sessao.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

Usuario.hasMany(TokenPush, { foreignKey: "usuarioId", as: "tokensPush" });
TokenPush.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

Usuario.hasMany(CodigoRecuperacaoSenha, { foreignKey: "usuarioId", as: "codigosRecuperacao" });
CodigoRecuperacaoSenha.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

Usuario.hasMany(CodigoVerificacaoEmail, { foreignKey: "usuarioId", as: "codigosVerificacaoEmail" });
CodigoVerificacaoEmail.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

Usuario.hasOne(PreferenciaAcessibilidade, { foreignKey: "usuarioId", as: "preferenciasAcessibilidade" });
PreferenciaAcessibilidade.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

Usuario.hasOne(PreferenciaNotificacao, { foreignKey: "usuarioId", as: "preferenciasNotificacao" });
PreferenciaNotificacao.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

/* Perfil detalhado do candidato */

Candidato.hasMany(CandidatoExperiencia, { foreignKey: "candidatoId", as: "experiencias" });
CandidatoExperiencia.belongsTo(Candidato, { foreignKey: "candidatoId", as: "candidato" });

Candidato.hasMany(CandidatoFormacao, { foreignKey: "candidatoId", as: "formacoes" });
CandidatoFormacao.belongsTo(Candidato, { foreignKey: "candidatoId", as: "candidato" });

Candidato.hasMany(CandidatoCertificado, { foreignKey: "candidatoId", as: "certificados" });
CandidatoCertificado.belongsTo(Candidato, { foreignKey: "candidatoId", as: "candidato" });

Candidato.hasMany(CandidatoHabilidade, { foreignKey: "candidatoId", as: "habilidades" });
CandidatoHabilidade.belongsTo(Candidato, { foreignKey: "candidatoId", as: "candidato" });

/* Deficiências (N:N) */

Candidato.belongsToMany(Deficiencia, {
    through: CandidatoDeficiencia,
    foreignKey: "candidatoId",
    otherKey: "deficienciaId",
    as: "deficiencias"
});
Deficiencia.belongsToMany(Candidato, {
    through: CandidatoDeficiencia,
    foreignKey: "deficienciaId",
    otherKey: "candidatoId",
    as: "candidatos"
});

Candidato.hasMany(CandidatoDeficiencia, { foreignKey: "candidatoId", as: "vinculosDeficiencia" });
CandidatoDeficiencia.belongsTo(Candidato, { foreignKey: "candidatoId", as: "candidato" });
CandidatoDeficiencia.belongsTo(Deficiencia, { foreignKey: "deficienciaId", as: "deficiencia" });

/* Vagas e candidaturas */

Empresa.hasMany(Vaga, { foreignKey: "empresaId", as: "vagas" });
Vaga.belongsTo(Empresa, { foreignKey: "empresaId", as: "empresa" });

Vaga.hasMany(Candidatura, { foreignKey: "vagaId", as: "candidaturas" });
Candidatura.belongsTo(Vaga, { foreignKey: "vagaId", as: "vaga" });

Candidato.hasMany(Candidatura, { foreignKey: "candidatoId", as: "candidaturas" });
Candidatura.belongsTo(Candidato, { foreignKey: "candidatoId", as: "candidato" });

/* Favoritos e empresas seguidas (N:N) */

Vaga.belongsToMany(Candidato, {
    through: FavoritoVaga,
    foreignKey: "vagaId",
    otherKey: "candidatoId",
    as: "favoritadaPor"
});
Candidato.belongsToMany(Vaga, {
    through: FavoritoVaga,
    foreignKey: "candidatoId",
    otherKey: "vagaId",
    as: "vagasFavoritas"
});

Empresa.belongsToMany(Candidato, {
    through: EmpresaSeguida,
    foreignKey: "empresaId",
    otherKey: "candidatoId",
    as: "seguidores"
});
Candidato.belongsToMany(Empresa, {
    through: EmpresaSeguida,
    foreignKey: "candidatoId",
    otherKey: "empresaId",
    as: "empresasSeguidas"
});

// Associações diretas na tabela de junção: necessárias para listar favoritos e empresas seguidas
// com os dados completos numa consulta só.
FavoritoVaga.belongsTo(Vaga, { foreignKey: "vagaId", as: "vaga" });
FavoritoVaga.belongsTo(Candidato, { foreignKey: "candidatoId", as: "candidato" });
EmpresaSeguida.belongsTo(Empresa, { foreignKey: "empresaId", as: "empresa" });
EmpresaSeguida.belongsTo(Candidato, { foreignKey: "candidatoId", as: "candidato" });

/* Rede entre usuários */

Usuario.belongsToMany(Usuario, {
    through: UsuarioSeguido,
    as: "seguindoUsuarios",
    foreignKey: "seguidorId",
    otherKey: "seguidoId"
});
Usuario.belongsToMany(Usuario, {
    through: UsuarioSeguido,
    as: "seguidoresUsuarios",
    foreignKey: "seguidoId",
    otherKey: "seguidorId"
});
UsuarioSeguido.belongsTo(Usuario, { foreignKey: "seguidorId", as: "seguidor" });
UsuarioSeguido.belongsTo(Usuario, { foreignKey: "seguidoId", as: "seguido" });

Usuario.hasMany(SolicitacaoSeguimento, { foreignKey: "solicitanteId", as: "solicitacoesEnviadas" });
SolicitacaoSeguimento.belongsTo(Usuario, { foreignKey: "solicitanteId", as: "solicitante" });

Usuario.hasMany(SolicitacaoSeguimento, { foreignKey: "destinatarioId", as: "solicitacoesRecebidas" });
SolicitacaoSeguimento.belongsTo(Usuario, { foreignKey: "destinatarioId", as: "destinatario" });

Usuario.hasMany(UsuarioBloqueado, { foreignKey: "usuarioId", as: "bloqueios" });
UsuarioBloqueado.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });
UsuarioBloqueado.belongsTo(Usuario, { foreignKey: "bloqueadoId", as: "bloqueado" });

/* Feed */

Usuario.hasMany(Postagem, { foreignKey: "usuarioId", as: "postagens" });
Postagem.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

Postagem.hasMany(PostagemAnexo, { foreignKey: "postagemId", as: "anexos" });
PostagemAnexo.belongsTo(Postagem, { foreignKey: "postagemId", as: "postagem" });

Postagem.hasMany(Comentario, { foreignKey: "postagemId", as: "comentarios" });
Comentario.belongsTo(Postagem, { foreignKey: "postagemId", as: "postagem" });

Usuario.hasMany(Comentario, { foreignKey: "usuarioId", as: "comentarios" });
Comentario.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

Comentario.hasMany(Comentario, { foreignKey: "comentarioPaiId", as: "respostas" });
Comentario.belongsTo(Comentario, { foreignKey: "comentarioPaiId", as: "comentarioPai" });

Postagem.hasMany(Curtida, { foreignKey: "postagemId", as: "curtidas" });
Curtida.belongsTo(Postagem, { foreignKey: "postagemId", as: "postagem" });

Usuario.hasMany(Curtida, { foreignKey: "usuarioId", as: "curtidas" });
Curtida.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

Postagem.hasMany(Compartilhamento, { foreignKey: "postagemId", as: "compartilhamentos" });
Compartilhamento.belongsTo(Postagem, { foreignKey: "postagemId", as: "postagem" });

Usuario.hasMany(Compartilhamento, { foreignKey: "usuarioId", as: "compartilhamentos" });
Compartilhamento.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

/* Mensagens */

Usuario.hasMany(Conversa, { foreignKey: "usuarioAId", as: "conversasComoA" });
Conversa.belongsTo(Usuario, { foreignKey: "usuarioAId", as: "usuarioA" });

Usuario.hasMany(Conversa, { foreignKey: "usuarioBId", as: "conversasComoB" });
Conversa.belongsTo(Usuario, { foreignKey: "usuarioBId", as: "usuarioB" });

Conversa.hasMany(Mensagem, { foreignKey: "conversaId", as: "mensagens" });
Mensagem.belongsTo(Conversa, { foreignKey: "conversaId", as: "conversa" });

Usuario.hasMany(Mensagem, { foreignKey: "remetenteId", as: "mensagens" });
Mensagem.belongsTo(Usuario, { foreignKey: "remetenteId", as: "remetente" });

/* Notificações */

Usuario.hasMany(Notificacao, { foreignKey: "usuarioId", as: "notificacoes" });
Notificacao.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

// Quem praticou a ação. Sem `hasMany` recíproco: nenhuma tela lista "notificações que eu causei".
Notificacao.belongsTo(Usuario, { foreignKey: "atorId", as: "ator" });

/* Moderação */

Usuario.hasMany(Denuncia, { foreignKey: "denuncianteId", as: "denunciasFeitas" });
Denuncia.belongsTo(Usuario, { foreignKey: "denuncianteId", as: "denunciante" });

Usuario.hasMany(Denuncia, { foreignKey: "administradorResponsavelId", as: "denunciasResolvidas" });
Denuncia.belongsTo(Usuario, { foreignKey: "administradorResponsavelId", as: "administradorResponsavel" });

Usuario.hasMany(RegistroAuditoria, { foreignKey: "administradorId", as: "registrosAuditoria" });
RegistroAuditoria.belongsTo(Usuario, { foreignKey: "administradorId", as: "administrador" });

/* Assistente virtual */

Usuario.hasMany(ChatbotConversa, { foreignKey: "usuarioId", as: "chatbotConversas" });
ChatbotConversa.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

ChatbotConversa.hasMany(ChatbotMensagem, { foreignKey: "conversaId", as: "mensagens" });
ChatbotMensagem.belongsTo(ChatbotConversa, { foreignKey: "conversaId", as: "conversa" });

export {
    sequelize,
    Usuario,
    Administrador,
    Sessao,
    TokenPush,
    CodigoRecuperacaoSenha,
    CodigoVerificacaoEmail,
    PreferenciaAcessibilidade,
    PreferenciaNotificacao,
    Candidato,
    Deficiencia,
    CandidatoDeficiencia,
    CandidatoExperiencia,
    CandidatoFormacao,
    CandidatoCertificado,
    CandidatoHabilidade,
    Empresa,
    Vaga,
    Candidatura,
    FavoritoVaga,
    EmpresaSeguida,
    UsuarioSeguido,
    SolicitacaoSeguimento,
    UsuarioBloqueado,
    Postagem,
    PostagemAnexo,
    Comentario,
    Curtida,
    Compartilhamento,
    Conversa,
    Mensagem,
    Notificacao,
    Denuncia,
    RegistroAuditoria,
    ChatbotConversa,
    ChatbotMensagem
};
