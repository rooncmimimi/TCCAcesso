package com.acesso.app.activities;

import android.content.Intent;
import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;

import com.acesso.app.R;
import com.acesso.app.databinding.ActivityMainBinding;
import com.acesso.app.fragments.PlaceholderFragment;
import com.acesso.app.utils.SessionManager;

/**
 * Tela principal depois do login, com a barra de navegação inferior.
 * Cada aba troca o fragment exibido. Por enquanto as abas mostram um
 * aviso de "em desenvolvimento"; elas serão construídas nas próximas fases.
 */
public class MainActivity extends AppCompatActivity {

    private ActivityMainBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (new SessionManager(this).get() == null) {
            goToLogin();
            return;
        }

        binding = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        binding.bottomNavigation.setOnItemSelectedListener(item -> {
            showTab(item.getItemId());
            return true;
        });

        if (savedInstanceState == null) {
            binding.bottomNavigation.setSelectedItemId(R.id.nav_home);
        }
    }

    private void showTab(int itemId) {
        Fragment fragment;
        if (itemId == R.id.nav_jobs) {
            fragment = PlaceholderFragment.newInstance(R.string.nav_jobs, false);
        } else if (itemId == R.id.nav_create) {
            fragment = PlaceholderFragment.newInstance(R.string.nav_create, false);
        } else if (itemId == R.id.nav_search) {
            fragment = PlaceholderFragment.newInstance(R.string.nav_search, false);
        } else if (itemId == R.id.nav_profile) {
            fragment = PlaceholderFragment.newInstance(R.string.nav_profile, true);
        } else {
            fragment = PlaceholderFragment.newInstance(R.string.nav_home, false);
        }
        getSupportFragmentManager().beginTransaction()
                .replace(R.id.fragmentContainer, fragment)
                .commit();
    }

    public void goToLogin() {
        Intent intent = new Intent(this, LoginActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }
}
