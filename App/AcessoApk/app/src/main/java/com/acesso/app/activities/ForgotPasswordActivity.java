package com.acesso.app.activities;

import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.ActivityForgotPasswordBinding;
import com.acesso.app.utils.StatusMessage;
import com.acesso.app.viewmodels.ForgotPasswordViewModel;

public class ForgotPasswordActivity extends AppCompatActivity {

    private ActivityForgotPasswordBinding binding;
    private ForgotPasswordViewModel viewModel;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityForgotPasswordBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        viewModel = new ViewModelProvider(this).get(ForgotPasswordViewModel.class);

        binding.toolbar.setNavigationOnClickListener(v -> finish());
        binding.sendButton.setOnClickListener(v ->
                viewModel.sendResetLink(String.valueOf(binding.emailInput.getText())));

        viewModel.getEmailError().observe(this, binding.emailLayout::setError);
        viewModel.isLoading().observe(this, loading -> {
            binding.sendButton.setEnabled(!loading);
            binding.sendButton.setText(loading ? R.string.action_sending : R.string.action_send_link);
            if (loading) {
                StatusMessage.showProgress(binding.statusMessage, getString(R.string.action_sending));
            }
        });
        viewModel.getErrorMessage().observe(this, message -> {
            if (message != null) {
                StatusMessage.showError(binding.statusMessage, message);
            }
        });
        viewModel.isEmailSent().observe(this, sent -> {
            if (sent) {
                StatusMessage.showSuccess(binding.statusMessage, getString(R.string.forgot_sent));
            }
        });
    }
}
