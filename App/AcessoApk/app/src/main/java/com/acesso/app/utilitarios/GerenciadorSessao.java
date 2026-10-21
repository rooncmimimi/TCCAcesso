package com.acesso.app.utilitarios;

import android.content.Context;
import android.content.SharedPreferences;

import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.TipoConta;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.repositorios.RepositorioAutenticacaoSupabase;

import java.security.GeneralSecurityException;

/**
 * Guarda a sessão no aparelho para o usuário não precisar entrar toda vez.
 * É a fonte da verdade do app sobre "tem alguém logado?": existe sessão salva
 * e ela veio da fonte de login ativa.
 *
 * A senha nunca é salva: só os tokens que o servidor devolve. Os tokens são cifrados com uma chave do
 * Android Keystore (CifraSegredos); o arquivo é privado do app (MODE_PRIVATE) e o backup está desligado
 * no manifesto (allowBackup=false).
 */
public class GerenciadorSessao {

    private static final String NOME_PREFERENCIAS = "acesso_sessao";
    private static final String CHAVE_ID_USUARIO = "id_usuario";
    private static final String CHAVE_EMAIL = "email";
    private static final String CHAVE_NOME = "nome";
    private static final String CHAVE_TIPO_CONTA = "tipo_conta";
    private static final String CHAVE_STATUS_EMPRESA = "status_empresa";
    private static final String CHAVE_TOKEN_ACESSO = "token_acesso";
    private static final String CHAVE_TOKEN_RENOVACAO = "token_renovacao";
    private static final String CHAVE_EXPIRA_EM = "expira_em";
    private static final String CHAVE_ORIGEM = "origem";

    private final SharedPreferences preferencias;
    private final CifraSegredos cifra = CifraSegredos.doKeystore();

    public GerenciadorSessao(Context contexto) {
        preferencias = contexto.getApplicationContext().getSharedPreferences(NOME_PREFERENCIAS, Context.MODE_PRIVATE);
    }

    public void salvar(SessaoUsuario sessao) {
        preferencias.edit()
                .putString(CHAVE_ID_USUARIO, sessao.getIdUsuario())
                .putString(CHAVE_EMAIL, sessao.getEmail())
                .putString(CHAVE_NOME, sessao.getNome())
                .putString(CHAVE_TIPO_CONTA, sessao.getTipoConta().getCodigo())
                .putString(CHAVE_STATUS_EMPRESA, sessao.getStatusEmpresa())
                .putString(CHAVE_TOKEN_ACESSO, proteger(sessao.getTokenAcesso()))
                .putString(CHAVE_TOKEN_RENOVACAO, proteger(sessao.getTokenRenovacao()))
                .putLong(CHAVE_EXPIRA_EM, sessao.getExpiraEmMillis())
                .putString(CHAVE_ORIGEM, sessao.getOrigem())
                .apply();
    }

    /**
     * Troca só o status da empresa, sem mexer nos tokens (que podem ter sido renovados
     * enquanto a consulta estava em andamento).
     */
    public void atualizarStatusEmpresa(String statusEmpresa) {
        if (preferencias.getString(CHAVE_TOKEN_ACESSO, null) != null) {
            preferencias.edit().putString(CHAVE_STATUS_EMPRESA, statusEmpresa).apply();
        }
    }

    /**
     * Devolve a sessão salva, ou null se ninguém estiver logado. Uma sessão de outra fonte de login
     * (ex.: simulada ou Supabase, quando o build usa a API) não vale para esta fonte, mas também NÃO é
     * apagada: quem alterna entre builds com configurações diferentes não perde o login de cada um.
     * Só uma gravação nova (login) a substitui.
     */
    public SessaoUsuario obter() {
        String guardadoAcesso = preferencias.getString(CHAVE_TOKEN_ACESSO, null);
        String guardadoRenovacao = preferencias.getString(CHAVE_TOKEN_RENOVACAO, null);
        if (guardadoAcesso == null || guardadoRenovacao == null) {
            return null;
        }
        // Sessões salvas antes de existir a origem vieram do Supabase.
        String origem = preferencias.getString(CHAVE_ORIGEM, RepositorioAutenticacaoSupabase.ORIGEM);
        if (!FabricaRepositorios.origemAtiva().equals(origem)) {
            return null;
        }
        String tokenAcesso;
        String tokenRenovacao;
        try {
            tokenAcesso = cifra.decifrar(guardadoAcesso);
            tokenRenovacao = cifra.decifrar(guardadoRenovacao);
        } catch (GeneralSecurityException erro) {
            // Os tokens não podem mais ser lidos (chave do Keystore perdida ou dado corrompido): nova entrada.
            limpar();
            return null;
        }
        if (!CifraSegredos.estaCifrado(guardadoAcesso) || !CifraSegredos.estaCifrado(guardadoRenovacao)) {
            // Sessão gravada por uma versão anterior, em texto puro: passa a ser guardada cifrada.
            preferencias.edit()
                    .putString(CHAVE_TOKEN_ACESSO, proteger(tokenAcesso))
                    .putString(CHAVE_TOKEN_RENOVACAO, proteger(tokenRenovacao))
                    .apply();
        }
        TipoConta tipo = TipoConta.doCodigo(preferencias.getString(CHAVE_TIPO_CONTA, TipoConta.PESSOA.getCodigo()));
        return new SessaoUsuario(
                preferencias.getString(CHAVE_ID_USUARIO, null),
                preferencias.getString(CHAVE_EMAIL, null),
                preferencias.getString(CHAVE_NOME, null),
                tipo,
                preferencias.getString(CHAVE_STATUS_EMPRESA, null),
                tokenAcesso,
                tokenRenovacao,
                preferencias.getLong(CHAVE_EXPIRA_EM, 0),
                origem);
    }

    public boolean temSessao() {
        return obter() != null;
    }

    public void limpar() {
        preferencias.edit().clear().apply();
    }

    /**
     * Cifra o token para gravar. Se o Keystore do aparelho falhar (acontece em alguns modelos antigos),
     * grava sem cifra, para o login ainda se manter, em vez de impedir o uso do app.
     */
    private String proteger(String token) {
        try {
            return cifra.cifrar(token);
        } catch (GeneralSecurityException erro) {
            return token;
        }
    }
}
