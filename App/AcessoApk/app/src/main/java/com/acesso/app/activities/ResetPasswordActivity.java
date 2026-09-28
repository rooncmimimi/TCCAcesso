package com.acesso.app.activities;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.ActivityResetPasswordBinding;
import com.acesso.app.utils.StatusMessage;
import com.acesso.app.viewmodels.ResetPasswordViewModel;

/**
 * Aberta pelo link do e-mail de recuperação (acesso://redefinir-senha).
 * O Supabase coloca um token temporário depois do "#" do link; com ele
 * o app consegue trocar a senha sem o usuário estar logado.
 */
public class ResetPasswordActivity extends AppCompatActivity {

    private ActivityResetPasswordBinding binding;
    private ResetPasswordViewModel viewModel;
    private String recoveryToken;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityResetPasswordBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        viewModel = new ViewModelProvider(this).get(ResetPasswordViewModel.class);
        recoveryToken = readRecoveryToken(getIntent().getData());

        binding.toolbar.setNavigationOnClickListener(v -> goToLogin());
        binding.saveButton.setOnClickListener(v -> viewModel.changePassword(
                recoveryToken,
                String.valueOf(binding.passwordInput.getText()),
                String.valueOf(binding.passwordConfirmationInput.getText())));

        if (recoveryToken == null) {
            StatusMessage.showError(binding.statusMessage, getString(R.string.reset_invalid_link));
        }

        viewModel.getPasswordError().observe(this, binding.passwordLayout::setError);
        viewModel.getConfirmationError().observe(this, binding.passwordConfirmationLayout::setError);
        viewModel.isLoading().observe(this, loading -> {
            binding.saveButton.setEnabled(!loading);
            binding.saveButton.setText(loading ? R.string.action_saving : R.string.action_save_password);
            if (loading) {
                StatusMessage.showProgress(binding.statusMessage, getString(R.string.action_saving));
            }
        });
        viewModel.getErrorMessage().observe(this, message -> {
            if (message != null) {
                StatusMessage.showError(binding.statusMessage, message);
            }
        });
        viewModel.isPasswordChanged().observe(this, changed -> {
            if (changed) {
                Toast.makeText(this, R.string.reset_success, Toast.LENGTH_LONG).show();
                goToLogin();
            }
        });
    }

    /** Lê o access_token de um link como acesso://redefinir-senha#access_token=...&type=recovery */
    static String readRecoveryToken(Uri uri) {
        if (uri == null || uri.getFragment() == null) {
            return null;
        }
        Uri params = Uri.parse("acesso://x?" + uri.getFragment());
        if (!"recovery".equals(params.getQueryParameter("type"))) {
            return null;
        }
        return params.getQueryParameter("access_token");
    }

    private void goToLogin() {
        Intent intent = new Intent(this, LoginActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }
}
