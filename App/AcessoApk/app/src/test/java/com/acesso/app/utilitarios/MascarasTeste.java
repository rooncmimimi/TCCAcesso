package com.acesso.app.utilitarios;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class MascarasTeste {

    @Test
    public void formataCpfCnpjECep() {
        assertEquals("529.982.247-25", Mascaras.formatar("52998224725", Mascaras.CPF));
        assertEquals("11.222.333/0001-81", Mascaras.formatar("11222333000181", Mascaras.CNPJ));
        assertEquals("01310-100", Mascaras.formatar("01310100", Mascaras.CEP));
    }

    @Test
    public void formataEnquantoDigitaSemSobrarSimbolo() {
        assertEquals("529.98", Mascaras.formatar("52998", Mascaras.CPF));
        assertEquals("529", Mascaras.formatar("529", Mascaras.CPF));
        assertEquals("", Mascaras.formatar("", Mascaras.CPF));
    }

    @Test
    public void ignoraLetrasEDigitosAMais() {
        assertEquals("529.982.247-25", Mascaras.formatar("529.982.247-25999", Mascaras.CPF));
        assertEquals("01310-100", Mascaras.formatar("cep 01310-100", Mascaras.CEP));
    }

    @Test
    public void telefoneFixoECelular() {
        assertEquals("(11) 3456-7890", Mascaras.formatarTelefone("1134567890"));
        assertEquals("(11) 98765-4321", Mascaras.formatarTelefone("11987654321"));
    }
}
