package com.acesso.app.utilitarios;

import static org.junit.Assert.assertEquals;

import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.TipoConta;

import org.junit.Test;

public class NavegacaoTeste {

    private static SessaoUsuario sessao(TipoConta tipo, String statusEmpresa) {
        return new SessaoUsuario("1", "conta@acesso.test", "Conta Teste", tipo, statusEmpresa,
                "token", "renovacao", Long.MAX_VALUE, "simulada");
    }

    @Test
    public void semSessaoVaiParaApresentacao() {
        assertEquals(Navegacao.Destino.APRESENTACAO, Navegacao.destinoPara(null));
    }

    @Test
    public void pessoaVaiParaAreaDaPessoa() {
        assertEquals(Navegacao.Destino.AREA_PESSOA, Navegacao.destinoPara(sessao(TipoConta.PESSOA, null)));
    }

    @Test
    public void empresaAprovadaVaiParaAreaDaEmpresa() {
        assertEquals(Navegacao.Destino.AREA_EMPRESA, Navegacao.destinoPara(sessao(TipoConta.EMPRESA, "aprovada")));
    }

    @Test
    public void empresaNaoAprovadaFicaNaTelaDeStatus() {
        assertEquals(Navegacao.Destino.EMPRESA_EM_ANALISE, Navegacao.destinoPara(sessao(TipoConta.EMPRESA, "pendente")));
        assertEquals(Navegacao.Destino.EMPRESA_EM_ANALISE, Navegacao.destinoPara(sessao(TipoConta.EMPRESA, "reprovada")));
        assertEquals(Navegacao.Destino.EMPRESA_EM_ANALISE, Navegacao.destinoPara(sessao(TipoConta.EMPRESA, "suspensa")));
    }

    /** Status desconhecido (ex.: Supabase) não bloqueia: quem recusa as rotas de empresa é a API. */
    @Test
    public void empresaComStatusDesconhecidoNaoEBloqueadaPeloApp() {
        assertEquals(Navegacao.Destino.AREA_EMPRESA, Navegacao.destinoPara(sessao(TipoConta.EMPRESA, null)));
    }

    /** Status de empresa numa conta de pessoa é ignorado. */
    @Test
    public void statusDeEmpresaNaoAfetaPessoa() {
        assertEquals(Navegacao.Destino.AREA_PESSOA, Navegacao.destinoPara(sessao(TipoConta.PESSOA, "pendente")));
    }
}
