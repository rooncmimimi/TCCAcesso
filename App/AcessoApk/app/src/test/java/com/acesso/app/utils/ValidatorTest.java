package com.acesso.app.utils;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

import org.junit.Test;

import java.time.LocalDate;

public class ValidatorTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 9, 28);

    @Test
    public void emailVazioEInvalido() {
        assertEquals("Informe seu e-mail.", Validator.validateEmail("  "));
        assertNotNull(Validator.validateEmail("mariana@"));
        assertNotNull(Validator.validateEmail("mariana.com"));
        assertNull(Validator.validateEmail(" mariana.souza@email.com.br "));
    }

    @Test
    public void senhaDoLoginSoPrecisaEstarPreenchida() {
        assertEquals("Informe sua senha.", Validator.validateLoginPassword(""));
        assertNull(Validator.validateLoginPassword("x"));
    }

    @Test
    public void senhaNovaPrecisaDeTamanhoLetrasENumeros() {
        assertNotNull(Validator.validateNewPassword("abc123"));
        assertNotNull(Validator.validateNewPassword("abcdefgh"));
        assertNotNull(Validator.validateNewPassword("12345678"));
        assertNull(Validator.validateNewPassword("acesso2026"));
    }

    @Test
    public void confirmacaoDeSenha() {
        assertNotNull(Validator.validatePasswordConfirmation("acesso2026", ""));
        assertEquals("As senhas não são iguais.", Validator.validatePasswordConfirmation("acesso2026", "acesso2025"));
        assertNull(Validator.validatePasswordConfirmation("acesso2026", "acesso2026"));
    }

    @Test
    public void nomePrecisaDeSobrenome() {
        assertNotNull(Validator.validateName(""));
        assertNotNull(Validator.validateName("Mariana"));
        assertNull(Validator.validateName("Mariana Souza"));
    }

    @Test
    public void cidadeObrigatoria() {
        assertNotNull(Validator.validateCity(" "));
        assertNull(Validator.validateCity("São Paulo"));
    }

    @Test
    public void dataDeNascimentoOpcional() {
        assertNull(Validator.validateBirthDate("", TODAY));
        assertNull(Validator.validateBirthDate("25/09/2000", TODAY));
        assertNotNull(Validator.validateBirthDate("31/02/2000", TODAY));
        assertNotNull(Validator.validateBirthDate("2000-09-25", TODAY));
        assertNotNull(Validator.validateBirthDate("01/01/2020", TODAY));
        assertEquals(LocalDate.of(2000, 9, 25), Validator.parseBrazilianDate("25/09/2000"));
    }

    @Test
    public void termosObrigatorios() {
        assertNotNull(Validator.validateTermsAccepted(false));
        assertNull(Validator.validateTermsAccepted(true));
    }
}
