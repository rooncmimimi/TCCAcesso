package com.acesso.app.repositorios;

import android.os.Handler;
import android.os.Looper;

import com.acesso.app.modelos.DadosCadastroEmpresa;
import com.acesso.app.modelos.DadosCadastroPessoa;
import com.acesso.app.modelos.ResultadoCadastro;
import com.acesso.app.modelos.ResultadoLogin;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.TipoConta;
import com.acesso.app.servicos.MensagensErro;

import java.util.Collections;
import java.util.Locale;
import java.util.UUID;

/**
 * SIMULAÇÃO - NÃO É AUTENTICAÇÃO REAL.
 *
 * Responde como um servidor responderia, sem rede e sem banco, para testar telas,
 * carregamento, erros e a navegação por tipo de conta. Só existe no build de debug
 * (FabricaRepositorios recusa no release) e o app mostra o aviso "Modo demonstração"
 * enquanto ela está ativa. Nada é gravado em servidor nenhum.
 *
 * Não aceita qualquer senha: só as contas abaixo entram, como num servidor de verdade.
 */
public class RepositorioAutenticacaoSimulado implements RepositorioAutenticacao {

    public static final String ORIGEM = "simulada";

    /** Senha das contas de demonstração (segue a regra de senha do Site). */
    public static final String SENHA_DEMONSTRACAO = "Acesso@2026";
    public static final String EMAIL_PESSOA = "pessoa@acesso.test";
    public static final String EMAIL_EMPRESA = "empresa@acesso.test";
    public static final String EMAIL_EMPRESA_PENDENTE = "empresa.pendente@acesso.test";
    public static final String EMAIL_NAO_CONFIRMADO = "nao.confirmado@acesso.test";
    public static final String EMAIL_PAUSADO = "pausado@acesso.test";
    /** Simula queda de conexão com o servidor. */
    public static final String EMAIL_FALHA_REDE = "falha.rede@acesso.test";

    private static final long ATRASO_MILLIS = 900;
    private static final long VALIDADE_SESSAO_MILLIS = 30 * 60 * 1000;

    private final Handler threadPrincipal = new Handler(Looper.getMainLooper());

    @Override
    public void entrar(String email, String senha, boolean confirmarReativacao, RetornoRepositorio<ResultadoLogin> retorno) {
        String emailNormalizado = email.trim().toLowerCase(Locale.ROOT);
        responder(() -> {
            if (EMAIL_FALHA_REDE.equals(emailNormalizado)) {
                retorno.aoFalhar(MensagensErro.SERVIDOR_INACESSIVEL);
                return;
            }
            if (!SENHA_DEMONSTRACAO.equals(senha) || tipoDaConta(emailNormalizado) == null) {
                // Mesma mensagem genérica da API: não revela se o e-mail existe.
                retorno.aoFalhar("E-mail ou senha inválidos.");
                return;
            }
            if (EMAIL_NAO_CONFIRMADO.equals(emailNormalizado)) {
                retorno.aoConcluir(ResultadoLogin.emailNaoConfirmado(emailNormalizado));
                return;
            }
            if (EMAIL_PAUSADO.equals(emailNormalizado) && !confirmarReativacao) {
                retorno.aoConcluir(ResultadoLogin.contaPausada());
                return;
            }
            retorno.aoConcluir(ResultadoLogin.autenticado(criarSessao(emailNormalizado,
                    nomeDaConta(emailNormalizado), tipoDaConta(emailNormalizado),
                    EMAIL_EMPRESA_PENDENTE.equals(emailNormalizado) ? "pendente" : SessaoUsuario.EMPRESA_APROVADA)));
        });
    }

    @Override
    public void cadastrarPessoa(DadosCadastroPessoa dados, RetornoRepositorio<ResultadoCadastro> retorno) {
        responder(() -> {
            if (tipoDaConta(dados.email) != null) {
                retorno.aoFalharComCampos("Este e-mail já está cadastrado.",
                        Collections.singletonMap("email", "Este e-mail já está cadastrado."));
                return;
            }
            retorno.aoConcluir(new ResultadoCadastro(criarSessao(dados.email, dados.nome, TipoConta.PESSOA, null)));
        });
    }

    /** Empresa nova nasce "pendente", como no Site: a moderação precisa aprovar. */
    @Override
    public void cadastrarEmpresa(DadosCadastroEmpresa dados, RetornoRepositorio<ResultadoCadastro> retorno) {
        responder(() -> {
            if (tipoDaConta(dados.email) != null) {
                retorno.aoFalharComCampos("Este e-mail já está cadastrado.",
                        Collections.singletonMap("email", "Este e-mail já está cadastrado."));
                return;
            }
            retorno.aoConcluir(new ResultadoCadastro(criarSessao(dados.email, dados.nome, TipoConta.EMPRESA, "pendente")));
        });
    }

    @Override
    public void renovarSessao(SessaoUsuario sessao, RetornoRepositorio<SessaoUsuario> retorno) {
        responder(() -> retorno.aoConcluir(criarSessao(sessao.getEmail(), sessao.getNome(),
                sessao.getTipoConta(), sessao.getStatusEmpresa())));
    }

    @Override
    public void enviarLinkNovaSenha(String email, RetornoRepositorio<Void> retorno) {
        responder(() -> retorno.aoConcluir(null));
    }

    @Override
    public void alterarSenha(String tokenRecuperacao, String novaSenha, RetornoRepositorio<Void> retorno) {
        responder(() -> retorno.aoConcluir(null));
    }

    @Override
    public void sair(SessaoUsuario sessao) {
        // Nada a avisar: não existe servidor.
    }

    // ---------------------------------------------------------------------

    static TipoConta tipoDaConta(String email) {
        switch (email.trim().toLowerCase(Locale.ROOT)) {
            case EMAIL_PESSOA:
            case EMAIL_NAO_CONFIRMADO:
            case EMAIL_PAUSADO:
                return TipoConta.PESSOA;
            case EMAIL_EMPRESA:
            case EMAIL_EMPRESA_PENDENTE:
                return TipoConta.EMPRESA;
            default:
                return null;
        }
    }

    private static String nomeDaConta(String email) {
        return tipoDaConta(email) == TipoConta.EMPRESA ? "Empresa Demonstração" : "Pessoa Demonstração";
    }

    private static SessaoUsuario criarSessao(String email, String nome, TipoConta tipo, String statusEmpresa) {
        String tokenFalso = "simulado-" + UUID.randomUUID();
        return new SessaoUsuario(UUID.randomUUID().toString(), email.trim().toLowerCase(Locale.ROOT), nome, tipo,
                tipo == TipoConta.EMPRESA ? statusEmpresa : null,
                tokenFalso, tokenFalso, System.currentTimeMillis() + VALIDADE_SESSAO_MILLIS, ORIGEM);
    }

    /** Espera um pouco, como a rede, para o estado de carregamento aparecer na tela. */
    private void responder(Runnable resposta) {
        threadPrincipal.postDelayed(resposta, ATRASO_MILLIS);
    }
}
