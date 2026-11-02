package com.acesso.app.utilitarios;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Cifra os tokens da sessão antes de gravá-los no aparelho (AES-256-GCM).
 * A chave fica no Android Keystore: o app a usa, mas ninguém consegue copiá-la para fora do aparelho,
 * então o arquivo de preferências sozinho não revela os tokens.
 *
 * Formato gravado: "gcm1:" + IV em Base64 + ":" + texto cifrado em Base64. Um valor sem esse
 * prefixo é de uma versão anterior do app (texto puro) e é aceito como está; a próxima gravação o cifra.
 */
public final class CifraSegredos {

    private static final String PREFIXO = "gcm1:";
    private static final String TRANSFORMACAO = "AES/GCM/NoPadding";
    private static final int BITS_DA_ETIQUETA = 128;

    /** De onde vem a chave AES (o Keystore no app; uma chave comum nos testes JUnit). */
    public interface ProvedorChave {
        SecretKey chave() throws GeneralSecurityException;
    }

    private final ProvedorChave provedor;

    public CifraSegredos(ProvedorChave provedor) {
        this.provedor = provedor;
    }

    /** Cifra com a chave do Android Keystore (criada na primeira vez). */
    public static CifraSegredos doKeystore() {
        return new CifraSegredos(ChaveKeystore::obterOuCriar);
    }

    public String cifrar(String texto) throws GeneralSecurityException {
        Cipher cifra = Cipher.getInstance(TRANSFORMACAO);
        cifra.init(Cipher.ENCRYPT_MODE, provedor.chave());
        byte[] cifrado = cifra.doFinal(texto.getBytes(StandardCharsets.UTF_8));
        return PREFIXO + Base64.getEncoder().encodeToString(cifra.getIV())
                + ":" + Base64.getEncoder().encodeToString(cifrado);
    }

    /**
     * Devolve o texto original. Valor sem o prefixo é devolvido como está (formato antigo).
     * Lança exceção se o valor foi alterado ou a chave não é a que cifrou (ex.: chave perdida).
     */
    public String decifrar(String valor) throws GeneralSecurityException {
        if (!estaCifrado(valor)) {
            return valor;
        }
        try {
            String[] partes = valor.substring(PREFIXO.length()).split(":", -1);
            if (partes.length != 2) {
                throw new GeneralSecurityException("Formato inválido.");
            }
            byte[] iv = Base64.getDecoder().decode(partes[0]);
            byte[] cifrado = Base64.getDecoder().decode(partes[1]);
            Cipher cifra = Cipher.getInstance(TRANSFORMACAO);
            cifra.init(Cipher.DECRYPT_MODE, provedor.chave(), new GCMParameterSpec(BITS_DA_ETIQUETA, iv));
            return new String(cifra.doFinal(cifrado), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException erro) {
            throw new GeneralSecurityException("Valor corrompido.", erro);
        }
    }

    public static boolean estaCifrado(String valor) {
        return valor != null && valor.startsWith(PREFIXO);
    }

    /** Separada para só carregar as classes do Keystore quando for usada no aparelho. */
    private static final class ChaveKeystore {
        private static final String PROVEDOR = "AndroidKeyStore";
        private static final String APELIDO = "acesso_chave_sessao";

        static SecretKey obterOuCriar() throws GeneralSecurityException {
            try {
                KeyStore armazem = KeyStore.getInstance(PROVEDOR);
                armazem.load(null);
                if (armazem.containsAlias(APELIDO)) {
                    return (SecretKey) armazem.getKey(APELIDO, null);
                }
                KeyGenerator gerador = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, PROVEDOR);
                gerador.init(new KeyGenParameterSpec.Builder(APELIDO,
                        KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                        .setKeySize(256)
                        .build());
                return gerador.generateKey();
            } catch (java.io.IOException erro) {
                throw new GeneralSecurityException("Keystore indisponível.", erro);
            }
        }
    }
}
