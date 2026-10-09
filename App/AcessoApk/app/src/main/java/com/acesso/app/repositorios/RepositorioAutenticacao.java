package com.acesso.app.repositorios;

import com.acesso.app.modelos.DadosCadastroEmpresa;
import com.acesso.app.modelos.DadosCadastroPessoa;
import com.acesso.app.modelos.ResultadoCadastro;
import com.acesso.app.modelos.ResultadoLogin;
import com.acesso.app.modelos.SessaoUsuario;

/**
 * Contrato de autenticação do app. Telas e ViewModels só conhecem esta interface;
 * quem fala com o servidor é a implementação escolhida em FabricaRepositorios:
 *
 * <ul>
 *   <li>{@link RepositorioAutenticacaoSupabase}: Supabase Auth (como o app já funcionava).</li>
 *   <li>{@link RepositorioAutenticacaoApi}: API Express do Site (Site/Backend, rotas /api/auth).</li>
 *   <li>{@link RepositorioAutenticacaoSimulado}: respostas falsas, só no build de debug.</li>
 * </ul>
 *
 * Todas as respostas chegam na thread principal. As validações do app (Validador) só
 * melhoram a experiência: o servidor sempre valida de novo.
 */
public interface RepositorioAutenticacao {

    /**
     * Login com e-mail e senha. Senha errada, conta bloqueada ou falha de rede chegam em
     * aoFalhar. E-mail não confirmado e conta pausada chegam em aoConcluir (ResultadoLogin).
     *
     * @param confirmarReativacao true quando o usuário já aceitou reativar a conta pausada.
     */
    void entrar(String email, String senha, boolean confirmarReativacao, RetornoRepositorio<ResultadoLogin> retorno);

    void cadastrarPessoa(DadosCadastroPessoa dados, RetornoRepositorio<ResultadoCadastro> retorno);

    void cadastrarEmpresa(DadosCadastroEmpresa dados, RetornoRepositorio<ResultadoCadastro> retorno);

    /**
     * Gera uma sessão nova a partir do token de renovação. Se a sessão não vale mais
     * (token revogado ou vencido), a falha vem com MensagensErro.SESSAO_EXPIRADA.
     */
    void renovarSessao(SessaoUsuario sessao, RetornoRepositorio<SessaoUsuario> retorno);

    void enviarLinkNovaSenha(String email, RetornoRepositorio<Void> retorno);

    /** Troca a senha usando o token que veio no link de recuperação. */
    void alterarSenha(String tokenRecuperacao, String novaSenha, RetornoRepositorio<Void> retorno);

    /** Encerra a sessão no servidor. Mesmo se falhar (ex.: sem internet), o app apaga a sessão local. */
    void sair(SessaoUsuario sessao);
}
