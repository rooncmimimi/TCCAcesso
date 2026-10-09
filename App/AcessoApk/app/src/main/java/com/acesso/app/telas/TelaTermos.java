package com.acesso.app.telas;

import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;

import com.acesso.app.databinding.TelaTermosBinding;
import com.acesso.app.utilitarios.MargensSistema;

public class TelaTermos extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);
        TelaTermosBinding componentes = TelaTermosBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());
        MargensSistema.aplicar(this, componentes.getRoot());
        componentes.barraSuperior.setNavigationOnClickListener(v -> finish());
    }
}
