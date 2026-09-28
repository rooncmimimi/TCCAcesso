package com.acesso.app.activities;

import android.content.Intent;
import android.os.Bundle;
import android.view.inputmethod.EditorInfo;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.ActivityLoginBinding;
import com.acesso.app.utils.StatusMessage;
import com.acesso.app.viewmodels.LoginViewModel;

/** Primeira tela do app. Se já houver sessão salva, vai direto para a tela principal. */
public class LoginActivity extends AppCompatActivity {

    private ActivityLoginBinding binding;
    private LoginViewModel viewModel;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityLoginBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        viewModel = new ViewModelProvider(this).get(LoginViewModel.class);
        observeViewModel();

        binding.loginButton.setOnClickListener(v -> submit());
        binding.passwordInput.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_DONE) {
                submit();
                return true;
            }
            return false;
        });
        binding.forgotPasswordButton.setOnClickListener(v ->
                startActivity(new Intent(this, ForgotPasswordActivity.class)));
        binding.createAccountButton.setOnClickListener(v ->
                startActivity(new Intent(this, RegisterActivity.class)));

        if (savedInstanceState == null) {
            viewModel.checkSavedSession();
        }
    }

    private void submit() {
        viewModel.login(
                String.valueOf(binding.emailInput.getText()),
                String.valueOf(binding.passwordInput.getText()));
    }

    private void observeViewModel() {
        viewModel.getEmailError().observe(this, binding.emailLayout::setError);
        viewModel.getPasswordError().observe(this, binding.passwordLayout::setError);

        viewModel.isLoading().observe(this, loading -> {
            binding.loginButton.setEnabled(!loading);
            binding.createAccountButton.setEnabled(!loading);
            binding.forgotPasswordButton.setEnabled(!loading);
            binding.loginButton.setText(loading ? R.string.action_logging_in : R.string.action_login);
            if (loading) {
                StatusMessage.showProgress(binding.statusMessage, getString(R.string.action_logging_in));
            } else if (viewModel.getErrorMessage().getValue() == null) {
                StatusMessage.hide(binding.statusMessage);
            }
        });

        viewModel.getErrorMessage().observe(this, message -> {
            if (message != null) {
                StatusMessage.showError(binding.statusMessage, message);
            }
        });

        viewModel.isLoggedIn().observe(this, loggedIn -> {
            if (loggedIn) {
                openMain();
            }
        });
    }

    private void openMain() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }
}
