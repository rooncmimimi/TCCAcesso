import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";
import { resolverUrlExibicao } from "../utils/supabaseStorage.js";
import { IDIOMAS } from "../i18n/idioma.js";

/** Tabela `usuarios`: toda conta da plataforma (candidato, empresa ou administrador). */
const Usuario = sequelize.define(
    "Usuario",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        nome: {
            type: DataTypes.STRING(150),
            allowNull: false,
            validate: {
                len: [3, 150]
            }
        },

        email: {
            type: DataTypes.STRING(150),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },

        senhaHash: {
            type: DataTypes.STRING(255),
            allowNull: false
        },

        telefone: {
            type: DataTypes.STRING(20)
        },

        fotoPerfil: {
            type: DataTypes.TEXT,
            get() {
                return resolverUrlExibicao(this.getDataValue("fotoPerfil"));
            }
        },

        capaPerfil: {
            type: DataTypes.TEXT,
            get() {
                return resolverUrlExibicao(this.getDataValue("capaPerfil"));
            }
        },

        tipoUsuario: {
            type: DataTypes.ENUM("candidato", "empresa", "administrador"),
            allowNull: false
        },

        ativo: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },

        bloqueado: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },

        bloqueadoEm: {
            type: DataTypes.DATE
        },

        motivoBloqueio: {
            type: DataTypes.TEXT
        },

        pausadoPeloUsuario: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },

        pausadoEm: {
            type: DataTypes.DATE
        },

        perfilPublico: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },

        // Quem pode iniciar uma nova conversa com este usuário, independente de `perfilPublico`; a
        // regra fica só em `ConversaService.podeIniciarConversa`. Nunca inclua este campo nos
        // `attributes` de endpoints consultados por outros usuários (perfil, resumo): só o dono e o
        // administrador veem a configuração, e os demais recebem apenas o resultado ("pode iniciar
        // conversa?").
        preferenciaMensagens: {
            type: DataTypes.ENUM("todos", "seguidores", "seguindo", "mutuo", "empresas", "ninguem"),
            allowNull: false,
            defaultValue: "todos"
        },

        // Os cadastros gravam `false` quando o provedor de e-mail está disponível, exigindo a
        // confirmação antes do primeiro login. Sem provedor, a conta já nasce confirmada.
        emailVerificado: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },

        ultimoLogin: {
            type: DataTypes.DATE
        },

        // Tokens de acesso emitidos antes deste momento são recusados (`autenticacaoMiddleware` e o
        // handshake do socket), então trocar ou redefinir a senha derruba a conta em todo aparelho.
        senhaAlteradaEm: {
            type: DataTypes.DATE
        },

        // Nulo significa cadastro começado e não terminado: é o que permite oferecer "retomar
        // cadastro" depois da confirmação de e-mail, já que a confirmação quebra o fluxo em dois.
        // Não dá para deduzir isso de `preferencias_acessibilidade`, cuja linha nasce na primeira
        // leitura (`AcessibilidadeService.obter` usa `findOrCreate`).
        cadastroConcluidoEm: {
            type: DataTypes.DATE
        },

        // Claim `sub` do ID token do Google: identificador estável da conta, que é o que vincula
        // uma conta Google a uma conta ACESSO. É `sub`, e não o e-mail, porque o e-mail de uma
        // conta Google pode mudar e pode ser reaproveitado por outra pessoa; `sub` não.
        googleId: {
            type: DataTypes.STRING(255),
            unique: true
        },

        // Qual versão dos documentos legais foi aceita e quando. Sem isso o aceite seria só um
        // booleano que ninguém guarda, e não haveria como saber o que foi aceito quando o texto mudar.
        termosAceitosEm: {
            type: DataTypes.DATE
        },

        termosVersao: {
            type: DataTypes.STRING(20)
        },

        // Idioma da interface escolhido pela pessoa. Define a língua do que o servidor escreve por
        // conta própria (e-mails de moderação, push) e acompanha a conta entre aparelhos.
        idioma: {
            type: DataTypes.STRING(2),
            allowNull: false,
            defaultValue: "pt",
            validate: {
                isIn: [IDIOMAS]
            }
        }
    },
    {
        tableName: "usuarios",
        defaultScope: {
            attributes: {
                exclude: ["senhaHash"]
            }
        },
        scopes: {
            // Use Usuario.scope("comSenha") apenas no fluxo de login.
            comSenha: {
                attributes: {}
            }
        }
    }
);

export default Usuario;
