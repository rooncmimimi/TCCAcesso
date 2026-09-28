package com.acesso.app.activities;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.ActivityRegisterBinding;
import com.acesso.app.utils.StatusMessage;
import com.acesso.app.viewmodels.RegisterViewModel;
import com.google.android.material.datepicker.CalendarConstraints;
import com.google.android.material.datepicker.DateValidatorPointBackward;
import com.google.android.material.datepicker.MaterialDatePicker;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

public class RegisterActivity extends AppCompatActivity {

    private static final DateTimeFormatter BR_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private ActivityRegisterBinding binding;
    private RegisterViewModel viewModel;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityRegisterBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        viewModel = new ViewModelProvider(this).get(RegisterViewModel.class);
        observeViewModel();

        binding.toolbar.setNavigationOnClickListener(v -> finish());
        binding.birthDateLayout.setEndIconOnClickListener(v -> openDatePicker());
        binding.readTermsButton.setOnClickListener(v ->
                startActivity(new Intent(this, TermsActivity.class)));
        binding.goToLoginButton.setOnClickListener(v -> finish());
        binding.registerButton.setOnClickListener(v -> submit());
    }

    private void submit() {
        RegisterViewModel.Form form = new RegisterViewModel.Form();
        form.name = String.valueOf(binding.fullNameInput.getText());
        form.email = String.valueOf(binding.emailInput.getText());
        form.password = String.valueOf(binding.passwordInput.getText());
        form.passwordConfirmation = String.valueOf(binding.passwordConfirmationInput.getText());
        form.city = String.valueOf(binding.cityInput.getText());
        form.birthDate = String.valueOf(binding.birthDateInput.getText());
        form.termsAccepted = binding.termsCheckBox.isChecked();
        viewModel.register(form);
    }

    /** Calendário como alternativa a digitar a data. Só permite datas no passado. */
    private void openDatePicker() {
        CalendarConstraints constraints = new CalendarConstraints.Builder()
                .setValidator(DateValidatorPointBackward.now())
                .build();
        MaterialDatePicker<Long> picker = MaterialDatePicker.Builder.datePicker()
                .setTitleText(R.string.birth_date_picker_title)
                .setInputMode(MaterialDatePicker.INPUT_MODE_TEXT)
                .setCalendarConstraints(constraints)
                .build();
        picker.addOnPositiveButtonClickListener(selection -> {
            String date = Instant.ofEpochMilli(selection).atZone(ZoneOffset.UTC).toLocalDate().format(BR_DATE);
            binding.birthDateInput.setText(date);
        });
        picker.show(getSupportFragmentManager(), "birth_date_picker");
    }

    private void observeViewModel() {
        viewModel.getFormErrors().observe(this, errors -> {
            binding.fullNameLayout.setError(errors.name);
            binding.emailLayout.setError(errors.email);
            binding.passwordLayout.setError(errors.password);
            binding.passwordConfirmationLayout.setError(errors.passwordConfirmation);
            binding.cityLayout.setError(errors.city);
            binding.birthDateLayout.setError(errors.birthDate);
            if (errors.terms != null) {
                binding.termsError.setText(errors.terms);
                binding.termsError.setVisibility(View.VISIBLE);
            } else {
                binding.termsError.setVisibility(View.GONE);
            }
            focusFirstError(errors);
        });

        viewModel.isLoading().observe(this, loading -> {
            binding.registerButton.setEnabled(!loading);
            binding.registerButton.setText(loading ? R.string.action_registering : R.string.action_register);
            if (loading) {
                StatusMessage.showProgress(binding.statusMessage, getString(R.string.action_registering));
            } else if (viewModel.getErrorMessage().getValue() == null) {
                StatusMessage.hide(binding.statusMessage);
            }
        });

        viewModel.getErrorMessage().observe(this, message -> {
            if (message != null) {
                StatusMessage.showError(binding.statusMessage, message);
            }
        });

        viewModel.getOutcome().observe(this, outcome -> {
            if (outcome == RegisterViewModel.Outcome.LOGGED_IN) {
                Intent intent = new Intent(this, MainActivity.class);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                startActivity(intent);
                finish();
            } else if (outcome == RegisterViewModel.Outcome.CONFIRM_EMAIL) {
                showConfirmEmailDialog();
            }
        });
    }

    /** Leva o foco (e o TalkBack) ao primeiro campo com problema. */
    private void focusFirstError(RegisterViewModel.FormErrors errors) {
        if (errors.name != null) binding.fullNameInput.requestFocus();
        else if (errors.email != null) binding.emailInput.requestFocus();
        else if (errors.password != null) binding.passwordInput.requestFocus();
        else if (errors.passwordConfirmation != null) binding.passwordConfirmationInput.requestFocus();
        else if (errors.city != null) binding.cityInput.requestFocus();
        else if (errors.birthDate != null) binding.birthDateInput.requestFocus();
        else if (errors.terms != null) binding.termsCheckBox.requestFocus();
    }

    private void showConfirmEmailDialog() {
        new MaterialAlertDialogBuilder(this)
                .setTitle(R.string.register_confirm_email_title)
                .setMessage(R.string.register_confirm_email_message)
                .setCancelable(false)
                .setPositiveButton(R.string.action_go_to_login, (dialog, which) -> finish())
                .show();
    }
}
