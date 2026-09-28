package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.repositories.AuthRepository;
import com.acesso.app.repositories.RepositoryCallback;
import com.acesso.app.utils.Validator;

public class ForgotPasswordViewModel extends AndroidViewModel {

    private final AuthRepository authRepository;

    private final MutableLiveData<String> emailError = new MutableLiveData<>();
    private final MutableLiveData<String> errorMessage = new MutableLiveData<>();
    private final MutableLiveData<Boolean> loading = new MutableLiveData<>(false);
    private final MutableLiveData<Boolean> emailSent = new MutableLiveData<>(false);

    public ForgotPasswordViewModel(@NonNull Application application) {
        super(application);
        authRepository = new AuthRepository(application);
    }

    public LiveData<String> getEmailError() {
        return emailError;
    }

    public LiveData<String> getErrorMessage() {
        return errorMessage;
    }

    public LiveData<Boolean> isLoading() {
        return loading;
    }

    public LiveData<Boolean> isEmailSent() {
        return emailSent;
    }

    public void sendResetLink(String email) {
        if (Boolean.TRUE.equals(loading.getValue())) {
            return;
        }
        errorMessage.setValue(null);
        String problem = Validator.validateEmail(email);
        emailError.setValue(problem);
        if (problem != null) {
            return;
        }

        loading.setValue(true);
        authRepository.sendPasswordReset(email, new RepositoryCallback<Void>() {
            @Override
            public void onSuccess(Void result) {
                loading.setValue(false);
                emailSent.setValue(true);
            }

            @Override
            public void onError(String message) {
                loading.setValue(false);
                errorMessage.setValue(message);
            }
        });
    }
}
