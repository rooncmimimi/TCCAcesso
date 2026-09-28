package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.repositories.AuthRepository;
import com.acesso.app.repositories.RepositoryCallback;
import com.acesso.app.utils.Validator;

public class ResetPasswordViewModel extends AndroidViewModel {

    private final AuthRepository authRepository;

    private final MutableLiveData<String> passwordError = new MutableLiveData<>();
    private final MutableLiveData<String> confirmationError = new MutableLiveData<>();
    private final MutableLiveData<String> errorMessage = new MutableLiveData<>();
    private final MutableLiveData<Boolean> loading = new MutableLiveData<>(false);
    private final MutableLiveData<Boolean> passwordChanged = new MutableLiveData<>(false);

    public ResetPasswordViewModel(@NonNull Application application) {
        super(application);
        authRepository = new AuthRepository(application);
    }

    public LiveData<String> getPasswordError() {
        return passwordError;
    }

    public LiveData<String> getConfirmationError() {
        return confirmationError;
    }

    public LiveData<String> getErrorMessage() {
        return errorMessage;
    }

    public LiveData<Boolean> isLoading() {
        return loading;
    }

    public LiveData<Boolean> isPasswordChanged() {
        return passwordChanged;
    }

    public void changePassword(String recoveryToken, String password, String confirmation) {
        if (Boolean.TRUE.equals(loading.getValue())) {
            return;
        }
        errorMessage.setValue(null);
        String passwordProblem = Validator.validateNewPassword(password);
        String confirmationProblem = Validator.validatePasswordConfirmation(password, confirmation);
        passwordError.setValue(passwordProblem);
        confirmationError.setValue(confirmationProblem);
        if (passwordProblem != null || confirmationProblem != null) {
            return;
        }
        if (recoveryToken == null) {
            errorMessage.setValue("Este link de recuperação é inválido ou expirou. Peça um novo link.");
            return;
        }

        loading.setValue(true);
        authRepository.updatePassword(recoveryToken, password, new RepositoryCallback<Void>() {
            @Override
            public void onSuccess(Void result) {
                loading.setValue(false);
                passwordChanged.setValue(true);
            }

            @Override
            public void onError(String message) {
                loading.setValue(false);
                // Token do link vencido ou já usado: explica em vez de falar em "sessão".
                errorMessage.setValue(message.startsWith("Sua sessão expirou")
                        ? "Este link de recuperação é inválido ou expirou. Peça um novo link."
                        : message);
            }
        });
    }
}
