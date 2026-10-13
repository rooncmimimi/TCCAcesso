package com.acesso.app.utilitarios;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

import org.junit.Test;

import java.time.LocalDate;

public class ValidadorTeste {

    private static final LocalDate HOJE = LocalDate.of(2026, 9, 28);

    @Test
    public void emailVazioEInvalido() {
        assertEquals("Informe seu e-mail.", Validador.validarEmail("  "));
        assertNotNull(Validador.validarEmail("mariana@"));
        assertNotNull(Validador.validarEmail("mariana.com"));
        assertNull(Validador.validarEmail(" mariana.souza@email.com.br "));
    }

    @Test
    public void senhaDoLoginSoPrecisaEstarPreenchida() {
        assertEquals("Informe sua senha.", Validador.validarSenhaLogin(""));
        assertNull(Validador.validarSenhaLogin("x"));
    }

    @Test
    public void novaSenhaPrecisaDeTamanhoLetrasENumeros() {
        assertNotNull(Validador.validarNovaSenha("abc123"));
        assertNotNull(Validador.validarNovaSenha("abcdefgh"));
        assertNotNull(Validador.validarNovaSenha("12345678"));
        assertNull(Validador.validarNovaSenha("acesso2026"));
    }

    @Test
    public void confirmacaoDeSenha() {
        assertNotNull(Validador.validarConfirmacaoSenha("acesso2026", ""));
        assertEquals("As senhas não são iguais.", Validador.validarConfirmacaoSenha("acesso2026", "acesso2025"));
        assertNull(Validador.validarConfirmacaoSenha("acesso2026", "acesso2026"));
    }

    @Test
    public void nomePrecisaDeSobrenome() {
        assertNotNull(Validador.validarNome(""));
        assertNotNull(Validador.validarNome("Mariana"));
        assertNull(Validador.validarNome("Mariana Souza"));
    }

    @Test
    public void cidadeObrigatoria() {
        assertNotNull(Validador.validarCidade(" "));
        assertNull(Validador.validarCidade("São Paulo"));
    }

    @Test
    public void dataDeNascimentoOpcional() {
        assertNull(Validador.validarDataNascimento("", HOJE));
        assertNull(Validador.validarDataNascimento("25/09/2000", HOJE));
        assertNotNull(Validador.validarDataNascimento("31/02/2000", HOJE));
        assertNotNull(Validador.validarDataNascimento("2000-09-25", HOJE));
        assertNotNull(Validador.validarDataNascimento("01/01/2020", HOJE));
        assertEquals(LocalDate.of(2000, 9, 25), Validador.converterDataBrasileira("25/09/2000"));
    }

    @Test
    public void termosObrigatorios() {
        assertNotNull(Validador.validarAceiteTermos(false));
        assertNull(Validador.validarAceiteTermos(true));
    }
}
