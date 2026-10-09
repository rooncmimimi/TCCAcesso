package com.acesso.app.utilitarios;

import android.content.Context;
import android.content.SharedPreferences;

import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.TipoConta;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.repositorios.RepositorioAutenticacaoSupabase;

/**
 * Guarda a sessão no aparelho para o usuário não precisar entrar toda vez.
 * É a fonte da verdade do app sobre "tem alguém logado?": existe sessão salva
 * e ela veio da fonte de login ativa.
 *
 * A senha nunca é salva: só os tokens que o servidor devolve. O arquivo é privado
 * do app (MODE_PRIVATE) e o backup está desligado no manifesto (allowBackup=false).
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
                .putString(CHAVE_TOKEN_ACESSO, sessao.getTokenAcesso())
                .putString(CHAVE_TOKEN_RENOVACAO, sessao.getTokenRenovacao())
                .putLong(CHAVE_EXPIRA_EM, sessao.getExpiraEmMillis())
                .putString(CHAVE_ORIGEM, sessao.getOrigem())
                .apply();
    }

    /**
     * Devolve a sessão salva, ou null se ninguém estiver logado. Uma sessão de outra
     * fonte de login (ex.: simulada, depois de trocar para a API) é descartada.
     */
    public SessaoUsuario obter() {
        String tokenAcesso = preferencias.getString(CHAVE_TOKEN_ACESSO, null);
        String tokenRenovacao = preferencias.getString(CHAVE_TOKEN_RENOVACAO, null);
        if (tokenAcesso == null || tokenRenovacao == null) {
            return null;
        }
        // Sessões salvas antes de existir a origem vieram do Supabase.
        String origem = preferencias.getString(CHAVE_ORIGEM, RepositorioAutenticacaoSupabase.ORIGEM);
        if (!FabricaRepositorios.origemAtiva().equals(origem)) {
            limpar();
            return null;
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
}
