package com.acesso.app.utilitarios;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

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

    /** Mesmas regras de regrasSenha (autenticacaoValidator.js da API): 8 a 72, maiúscula, minúscula, número e símbolo. */
    @Test
    public void novaSenhaSegueAsRegrasDaApi() {
        assertNotNull(Validador.validarNovaSenha(""));
        assertNotNull(Validador.validarNovaSenha("Ab1@"));
        assertNotNull(Validador.validarNovaSenha("A1@" + "a".repeat(70)));
        assertEquals("A senha deve conter ao menos uma letra minúscula.", Validador.validarNovaSenha("ACESSO@2026"));
        assertEquals("A senha deve conter ao menos uma letra maiúscula.", Validador.validarNovaSenha("acesso@2026"));
        assertEquals("A senha deve conter ao menos um número.", Validador.validarNovaSenha("Acesso@acesso"));
        assertTrue(Validador.validarNovaSenha("acesso2026A").startsWith("A senha deve conter ao menos um caractere especial"));
        assertNull(Validador.validarNovaSenha("Acesso@2026"));
        assertNull(Validador.validarNovaSenha("Senha forte 1"));
    }

    @Test
    public void confirmacaoDeSenha() {
        assertNotNull(Validador.validarConfirmacaoSenha("Acesso@2026", ""));
        assertEquals("As senhas não são iguais.", Validador.validarConfirmacaoSenha("Acesso@2026", "Acesso@2025"));
        assertNull(Validador.validarConfirmacaoSenha("Acesso@2026", "Acesso@2026"));
    }

    @Test
    public void cpfOpcionalComDigitoVerificador() {
        assertNull(Validador.validarCpf(""));
        assertNull(Validador.validarCpf("529.982.247-25"));
        assertNotNull(Validador.validarCpf("529.982.247-26"));
        assertNotNull(Validador.validarCpf("111.111.111-11"));
        assertNotNull(Validador.validarCpf("1234"));
    }

    @Test
    public void cnpjObrigatorioComDigitoVerificador() {
        assertNotNull(Validador.validarCnpj(""));
        assertNull(Validador.validarCnpj("11.222.333/0001-81"));
        assertNotNull(Validador.validarCnpj("11.222.333/0001-82"));
        assertNotNull(Validador.validarCnpj("00.000.000/0000-00"));
    }

    @Test
    public void camposOpcionaisDaEmpresa() {
        assertNull(Validador.validarTelefone(""));
        assertNull(Validador.validarTelefone("(11) 98765-4321"));
        assertNull(Validador.validarTelefone("(11) 3456-7890"));
        assertNotNull(Validador.validarTelefone("98765-4321"));
        assertNull(Validador.validarUf("sp"));
        assertNotNull(Validador.validarUf("XX"));
        assertNotNull(Validador.validarUf("S"));
        assertNull(Validador.validarCep("01310-100"));
        assertNotNull(Validador.validarCep("0131"));
        assertNull(Validador.validarSite("https://acesso.org.br"));
        assertNotNull(Validador.validarSite("acesso.org.br"));
        assertNull(Validador.validarTamanhoMaximo("Tecnologia", 120));
        assertNotNull(Validador.validarTamanhoMaximo("x".repeat(121), 120));
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
