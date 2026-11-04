package com.acesso.app.utilitarios;

import static org.junit.Assert.assertEquals;

import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.modelos.TipoConta;

import org.junit.Test;

/** Regra da API do Site: a conta de empresa nasce de uma conta de candidato logada. */
public class ModoCadastroEmpresaTeste {

    private static SessaoUsuario sessao(TipoConta tipo) {
        return new SessaoUsuario("u1", "alguem@acesso.test", "Alguém Exemplo", tipo,
                tipo == TipoConta.EMPRESA ? "pendente" : null, "token", "renovacao", Long.MAX_VALUE, "api");
    }

    @Test
    public void semConta_comRegraDaApi_precisaDeContaDePessoa() {
        assertEquals(ModoCadastroEmpresa.PRECISA_CONTA_DE_PESSOA, ModoCadastroEmpresa.de(true, null));
    }

    @Test
    public void logadoComoPessoa_comRegraDaApi_cadastraEmNomeDessaConta() {
        assertEquals(ModoCadastroEmpresa.COM_CONTA_DE_PESSOA, ModoCadastroEmpresa.de(true, sessao(TipoConta.PESSOA)));
    }

    /** Quem já é empresa não cria outra empresa por aqui: o Site também mostra a explicação nesse caso. */
    @Test
    public void logadoComoEmpresa_comRegraDaApi_continuaPrecisandoDeContaDePessoa() {
        assertEquals(ModoCadastroEmpresa.PRECISA_CONTA_DE_PESSOA, ModoCadastroEmpresa.de(true, sessao(TipoConta.EMPRESA)));
    }

    /** Fontes sem a regra (Supabase) não mudam: formulário livre, com ou sem sessão. */
    @Test
    public void semARegraDaApi_ocadastroEhLivre() {
        assertEquals(ModoCadastroEmpresa.LIVRE, ModoCadastroEmpresa.de(false, null));
        assertEquals(ModoCadastroEmpresa.LIVRE, ModoCadastroEmpresa.de(false, sessao(TipoConta.PESSOA)));
    }
}
