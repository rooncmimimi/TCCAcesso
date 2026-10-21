package com.acesso.app.utilitarios;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

public class MedidasImagemTeste {

    @Test
    public void amostragemNuncaDeixaAImagemMenorQueOAlvo() {
        assertEquals(1, MedidasImagem.amostragem(800, 600, 1024));
        assertEquals(1, MedidasImagem.amostragem(2000, 1000, 1024));
        assertEquals(2, MedidasImagem.amostragem(4000, 3000, 1024));
        assertEquals(4, MedidasImagem.amostragem(4096, 3072, 1024));
        assertEquals(1, MedidasImagem.amostragem(0, 0, 1024));
        assertEquals(1, MedidasImagem.amostragem(4000, 3000, 0));
    }

    @Test
    public void limitarMantemAProporcaoENuncaAmplia() {
        assertArrayEquals(new int[]{1000, 500}, MedidasImagem.limitar(2000, 1000, 1000));
        assertArrayEquals(new int[]{500, 1000}, MedidasImagem.limitar(1000, 2000, 1000));
        assertArrayEquals(new int[]{300, 200}, MedidasImagem.limitar(300, 200, 1000));
        assertArrayEquals(new int[]{1, 1000}, MedidasImagem.limitar(1, 5000, 1000));
    }

    @Test
    public void urlCompletaPassaComoEstaECaminhoDaApiUsaOServidorDaApi() {
        String api = "https://acesso-backend.onrender.com/api";
        assertEquals("https://cdn.test/a.jpg", MedidasImagem.resolverUrl(api, " https://cdn.test/a.jpg "));
        assertEquals("http://10.0.2.2:3000/uploads/perfis/a.jpg",
                MedidasImagem.resolverUrl("http://10.0.2.2:3000/api", "/uploads/perfis/a.jpg"));
        assertEquals("https://acesso-backend.onrender.com/uploads/a.jpg", MedidasImagem.resolverUrl(api, "/uploads/a.jpg"));
    }

    @Test
    public void esquemasPerigososEEnderecosInvalidosViramNulo() {
        String api = "https://acesso-backend.onrender.com/api";
        assertNull(MedidasImagem.resolverUrl(api, null));
        assertNull(MedidasImagem.resolverUrl(api, "file:///sdcard/x.jpg"));
        assertNull(MedidasImagem.resolverUrl(api, "content://media/1"));
        assertNull(MedidasImagem.resolverUrl(api, "javascript:alert(1)"));
        assertNull(MedidasImagem.resolverUrl(api, "//evil.test/x.jpg"));
        assertNull(MedidasImagem.resolverUrl(api, "uploads/sem-barra.jpg"));
        assertNull(MedidasImagem.resolverUrl("sem-esquema", "/uploads/a.jpg"));
    }
}
