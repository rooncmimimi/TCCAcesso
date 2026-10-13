package com.acesso.app.telas;

import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;

import com.acesso.app.databinding.TelaTermosBinding;

public class TelaTermos extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);
        TelaTermosBinding componentes = TelaTermosBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());
        componentes.barraSuperior.setNavigationOnClickListener(v -> finish());
    }
}
