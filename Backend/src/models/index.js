/**
 * Registro central de models e associações.
 *
 * Todas as chaves estrangeiras seguem exatamente o schema SQL do ACESSO
 * (ON DELETE CASCADE / ON UPDATE CASCADE no banco).
 */

import sequelize from "../config/database.js";

import Usuario from "./Usuario.js";
import Candidato from "./Candidato.js";
import Empresa from "./Empresa.js";
import Administrador from "./Administrador.js";

import Deficiencia from "./Deficiencia.js";
import CandidatoDeficiencia from "./CandidatoDeficiencia.js";

import Vaga from "./Vaga.js";
import Candidatura from "./Candidatura.js";
import EmpresaSeguida from "./EmpresaSeguida.js";
import FavoritoVaga from "./FavoritoVaga.js";

import Postagem from "./Postagem.js";
import Comentario from "./Comentario.js";
import Curtida from "./Curtida.js";

import Notificacao from "./Notificacao.js";
import Conversa from "./Conversa.js";
import Mensagem from "./Mensagem.js";

import CandidatoExperiencia from "./CandidatoExperiencia.js";
import CandidatoFormacao from "./CandidatoFormacao.js";
import CandidatoCertificado from "./CandidatoCertificado.js";
import CandidatoHabilidade from "./CandidatoHabilidade.js";
import PostagemAnexo from "./PostagemAnexo.js";
import Compartilhamento from "./Compartilhamento.js";
import PreferenciaAcessibilidade from "./PreferenciaAcessibilidade.js";
import CodigoRecuperacaoSenha from "./CodigoRecuperacaoSenha.js";
import RefreshToken from "./RefreshToken.js";
import ChatbotConversa from "./ChatbotConversa.js";
import ChatbotMensagem from "./ChatbotMensagem.js";
import UsuarioSeguido from "./UsuarioSeguido.js";
import Arquivo from "./Arquivo.js";


/* ======================================================
   PERFIS DO USUÁRIO (1:1)
====================================================== */

Usuario.hasOne(Candidato, { foreignKey: "usuarioId", as: "candidato" });
Candidato.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

Usuario.hasOne(Empresa, { foreignKey: "usuarioId", as: "empresa" });
Empresa.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

Usuario.hasOne(Administrador, {
    foreignKey: "usuarioId",
    as: "administrador"
});
Administrador.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

/* ======================================================
   DEFICIÊNCIAS (N:N)
====================================================== */

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

Candidato.hasMany(CandidatoDeficiencia, {
    foreignKey: "candidatoId",
    as: "vinculosDeficiencia"
});
CandidatoDeficiencia.belongsTo(Candidato, {
    foreignKey: "candidatoId",
    as: "candidato"
});
CandidatoDeficiencia.belongsTo(Deficiencia, {
    foreignKey: "deficienciaId",
    as: "deficiencia"
});

/* ======================================================
   VAGAS
====================================================== */

Empresa.hasMany(Vaga, { foreignKey: "empresaId", as: "vagas" });
Vaga.belongsTo(Empresa, { foreignKey: "empresaId", as: "empresa" });

/* ======================================================
   CANDIDATURAS
====================================================== */

Vaga.hasMany(Candidatura, { foreignKey: "vagaId", as: "candidaturas" });
Candidatura.belongsTo(Vaga, { foreignKey: "vagaId", as: "vaga" });

Candidato.hasMany(Candidatura, {
    foreignKey: "candidatoId",
    as: "candidaturas"
});
Candidatura.belongsTo(Candidato, {
    foreignKey: "candidatoId",
    as: "candidato"
});

/* ======================================================
   EMPRESAS SEGUIDAS (N:N)
====================================================== */

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

/* ======================================================
   FAVORITOS (N:N)
====================================================== */

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

/* ======================================================
   FEED
====================================================== */

Usuario.hasMany(Postagem, { foreignKey: "usuarioId", as: "postagens" });
Postagem.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

Postagem.hasMany(Comentario, { foreignKey: "postagemId", as: "comentarios" });
Comentario.belongsTo(Postagem, { foreignKey: "postagemId", as: "postagem" });

Usuario.hasMany(Comentario, { foreignKey: "usuarioId", as: "comentarios" });
Comentario.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

Postagem.hasMany(Curtida, { foreignKey: "postagemId", as: "curtidas" });
Curtida.belongsTo(Postagem, { foreignKey: "postagemId", as: "postagem" });

Usuario.hasMany(Curtida, { foreignKey: "usuarioId", as: "curtidas" });
Curtida.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

/* ======================================================
   NOTIFICAÇÕES
====================================================== */

Usuario.hasMany(Notificacao, {
    foreignKey: "usuarioId",
    as: "notificacoes"
});
Notificacao.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

/* ======================================================
   CHAT
====================================================== */

Empresa.hasMany(Conversa, { foreignKey: "empresaId", as: "conversas" });
Conversa.belongsTo(Empresa, { foreignKey: "empresaId", as: "empresa" });

Candidato.hasMany(Conversa, { foreignKey: "candidatoId", as: "conversas" });
Conversa.belongsTo(Candidato, { foreignKey: "candidatoId", as: "candidato" });

Conversa.hasMany(Mensagem, { foreignKey: "conversaId", as: "mensagens" });
Mensagem.belongsTo(Conversa, { foreignKey: "conversaId", as: "conversa" });

Usuario.hasMany(Mensagem, { foreignKey: "remetenteId", as: "mensagens" });
Mensagem.belongsTo(Usuario, { foreignKey: "remetenteId", as: "remetente" });

/* ======================================================
   PERFIL DETALHADO DO CANDIDATO
====================================================== */

Candidato.hasMany(CandidatoExperiencia, {
    foreignKey: "candidatoId",
    as: "experiencias"
});
CandidatoExperiencia.belongsTo(Candidato, {
    foreignKey: "candidatoId",
    as: "candidato"
});

Candidato.hasMany(CandidatoFormacao, {
    foreignKey: "candidatoId",
    as: "formacoes"
});
CandidatoFormacao.belongsTo(Candidato, {
    foreignKey: "candidatoId",
    as: "candidato"
});

Candidato.hasMany(CandidatoCertificado, {
    foreignKey: "candidatoId",
    as: "certificados"
});
CandidatoCertificado.belongsTo(Candidato, {
    foreignKey: "candidatoId",
    as: "candidato"
});

Candidato.hasMany(CandidatoHabilidade, {
    foreignKey: "candidatoId",
    as: "habilidades"
});
CandidatoHabilidade.belongsTo(Candidato, {
    foreignKey: "candidatoId",
    as: "candidato"
});

/* ======================================================
   ANEXOS, RESPOSTAS E COMPARTILHAMENTOS DO FEED
====================================================== */

Postagem.hasMany(PostagemAnexo, { foreignKey: "postagemId", as: "anexos" });
PostagemAnexo.belongsTo(Postagem, {
    foreignKey: "postagemId",
    as: "postagem"
});

Comentario.hasMany(Comentario, {
    foreignKey: "comentarioPaiId",
    as: "respostas"
});
Comentario.belongsTo(Comentario, {
    foreignKey: "comentarioPaiId",
    as: "comentarioPai"
});

Postagem.hasMany(Compartilhamento, {
    foreignKey: "postagemId",
    as: "compartilhamentos"
});
Compartilhamento.belongsTo(Postagem, {
    foreignKey: "postagemId",
    as: "postagem"
});

Usuario.hasMany(Compartilhamento, {
    foreignKey: "usuarioId",
    as: "compartilhamentos"
});
Compartilhamento.belongsTo(Usuario, {
    foreignKey: "usuarioId",
    as: "usuario"
});

/* ======================================================
   ACESSIBILIDADE, SESSÕES E RECUPERAÇÃO DE SENHA
====================================================== */

Usuario.hasOne(PreferenciaAcessibilidade, {
    foreignKey: "usuarioId",
    as: "preferenciasAcessibilidade"
});
PreferenciaAcessibilidade.belongsTo(Usuario, {
    foreignKey: "usuarioId",
    as: "usuario"
});

Usuario.hasMany(CodigoRecuperacaoSenha, {
    foreignKey: "usuarioId",
    as: "codigosRecuperacao"
});
CodigoRecuperacaoSenha.belongsTo(Usuario, {
    foreignKey: "usuarioId",
    as: "usuario"
});

Usuario.hasMany(RefreshToken, { foreignKey: "usuarioId", as: "refreshTokens" });
RefreshToken.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

/* ======================================================
   ASSISTENTE VIRTUAL
====================================================== */

Usuario.hasMany(ChatbotConversa, {
    foreignKey: "usuarioId",
    as: "chatbotConversas"
});
ChatbotConversa.belongsTo(Usuario, {
    foreignKey: "usuarioId",
    as: "usuario"
});

ChatbotConversa.hasMany(ChatbotMensagem, {
    foreignKey: "conversaId",
    as: "mensagens"
});
ChatbotMensagem.belongsTo(ChatbotConversa, {
    foreignKey: "conversaId",
    as: "conversa"
});

/* ======================================================
   REDE DE SEGUIDORES ENTRE USUÁRIOS (migration 0014)
====================================================== */

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

UsuarioSeguido.belongsTo(Usuario, {
    foreignKey: "seguidorId",
    as: "seguidor"
});
UsuarioSeguido.belongsTo(Usuario, {
    foreignKey: "seguidoId",
    as: "seguido"
});

/* ======================================================
   ARQUIVOS ENVIADOS (migration 0014)
====================================================== */

Usuario.hasMany(Arquivo, { foreignKey: "usuarioId", as: "arquivos" });
Arquivo.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

export {
    sequelize,
    UsuarioSeguido,
    Arquivo,
    Usuario,
    Candidato,
    Empresa,
    Administrador,
    Deficiencia,
    CandidatoDeficiencia,
    Vaga,
    Candidatura,
    EmpresaSeguida,
    FavoritoVaga,
    Postagem,
    Comentario,
    Curtida,
    Notificacao,
    Conversa,
    Mensagem,
    CandidatoExperiencia,
    CandidatoFormacao,
    CandidatoCertificado,
    CandidatoHabilidade,
    PostagemAnexo,
    Compartilhamento,
    PreferenciaAcessibilidade,
    CodigoRecuperacaoSenha,
    RefreshToken,
    ChatbotConversa,
    ChatbotMensagem
};

