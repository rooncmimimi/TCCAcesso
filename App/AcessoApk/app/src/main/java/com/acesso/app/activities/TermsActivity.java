package com.acesso.app.activities;

import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;

import com.acesso.app.databinding.ActivityTermsBinding;

public class TermsActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ActivityTermsBinding binding = ActivityTermsBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        binding.toolbar.setNavigationOnClickListener(v -> finish());
    }
}
