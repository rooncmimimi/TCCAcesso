package com.acesso.app.utilitarios;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import org.junit.Test;

import java.security.GeneralSecurityException;

import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;

/** Cifra dos tokens com uma chave comum (o Keystore só existe no aparelho). */
public class CifraSegredosTeste {

    private static SecretKey novaChave() throws Exception {
        KeyGenerator gerador = KeyGenerator.getInstance("AES");
        gerador.init(256);
        return gerador.generateKey();
    }

    private static CifraSegredos com(SecretKey chave) {
        return new CifraSegredos(() -> chave);
    }

    @Test
    public void cifraEDecifraDevolveOTextoOriginal() throws Exception {
        CifraSegredos cifra = com(novaChave());
        String token = "eyJhbGciOi.exemplo-fake.assinatura-ficticia";

        String guardado = cifra.cifrar(token);

        assertTrue(CifraSegredos.estaCifrado(guardado));
        assertFalse("o token não pode aparecer no valor gravado", guardado.contains("exemplo-fake"));
        assertEquals(token, cifra.decifrar(guardado));
    }

    @Test
    public void cadaCifragemUsaUmIvNovo() throws Exception {
        CifraSegredos cifra = com(novaChave());
        assertNotEquals(cifra.cifrar("igual"), cifra.cifrar("igual"));
    }

    @Test
    public void textoComAcentosEVazioVoltaIgual() throws Exception {
        CifraSegredos cifra = com(novaChave());
        assertEquals("sessão-ção", cifra.decifrar(cifra.cifrar("sessão-ção")));
        assertEquals("", cifra.decifrar(cifra.cifrar("")));
    }

    @Test
    public void valorSemPrefixoVemDeUmaVersaoAnteriorEEAceitoComoEsta() throws Exception {
        CifraSegredos cifra = com(novaChave());
        assertFalse(CifraSegredos.estaCifrado("token-antigo-em-texto-puro"));
        assertEquals("token-antigo-em-texto-puro", cifra.decifrar("token-antigo-em-texto-puro"));
    }

    @Test
    public void chaveDiferenteNaoDecifra() throws Exception {
        String guardado = com(novaChave()).cifrar("segredo");
        try {
            com(novaChave()).decifrar(guardado);
            fail("devia falhar com outra chave");
        } catch (GeneralSecurityException esperado) {
            // chave perdida: o app trata como "precisa entrar de novo"
        }
    }

    @Test
    public void valorAlteradoOuMalFormadoFalha() throws Exception {
        CifraSegredos cifra = com(novaChave());
        String guardado = cifra.cifrar("segredo");
        String adulterado = guardado.substring(0, guardado.length() - 4) + "AAAA";
        for (String ruim : new String[]{adulterado, "gcm1:sem-separador", "gcm1:!!!:???", "gcm1:"}) {
            try {
                cifra.decifrar(ruim);
                fail("devia falhar para " + ruim);
            } catch (GeneralSecurityException esperado) {
                // ok
            }
        }
    }
}
