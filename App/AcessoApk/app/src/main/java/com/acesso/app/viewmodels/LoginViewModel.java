package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.models.AuthSession;
import com.acesso.app.repositories.AuthRepository;
import com.acesso.app.repositories.RepositoryCallback;
import com.acesso.app.utils.SessionManager;
import com.acesso.app.utils.Validator;

public class LoginViewModel extends AndroidViewModel {

    private final AuthRepository authRepository;
    private final SessionManager sessionManager;

    private final MutableLiveData<String> emailError = new MutableLiveData<>();
    private final MutableLiveData<String> passwordError = new MutableLiveData<>();
    private final MutableLiveData<String> errorMessage = new MutableLiveData<>();
    private final MutableLiveData<Boolean> loading = new MutableLiveData<>(false);
    private final MutableLiveData<Boolean> loggedIn = new MutableLiveData<>(false);

    public LoginViewModel(@NonNull Application application) {
        super(application);
        authRepository = new AuthRepository(application);
        sessionManager = new SessionManager(application);
    }

    public LiveData<String> getEmailError() {
        return emailError;
    }

    public LiveData<String> getPasswordError() {
        return passwordError;
    }

    public LiveData<String> getErrorMessage() {
        return errorMessage;
    }

    public LiveData<Boolean> isLoading() {
        return loading;
    }

    public LiveData<Boolean> isLoggedIn() {
        return loggedIn;
    }

    /** Ao abrir o app: se já existe sessão salva, entra direto (renovando o token se preciso). */
    public void checkSavedSession() {
        AuthSession saved = sessionManager.get();
        if (saved == null) {
            return;
        }
        if (!saved.isExpired(System.currentTimeMillis())) {
            loggedIn.setValue(true);
            return;
        }
        loading.setValue(true);
        authRepository.refreshSession(saved.getRefreshToken(), new RepositoryCallback<AuthSession>() {
            @Override
            public void onSuccess(AuthSession session) {
                sessionManager.save(session);
                loading.setValue(false);
                loggedIn.setValue(true);
            }

            @Override
            public void onError(String message) {
                sessionManager.clear();
                loading.setValue(false);
            }
        });
    }

    public void login(String email, String password) {
        if (Boolean.TRUE.equals(loading.getValue())) {
            return;
        }
        errorMessage.setValue(null);

        String emailProblem = Validator.validateEmail(email);
        String passwordProblem = Validator.validateLoginPassword(password);
        emailError.setValue(emailProblem);
        passwordError.setValue(passwordProblem);
        if (emailProblem != null || passwordProblem != null) {
            return;
        }

        loading.setValue(true);
        authRepository.signIn(email, password, new RepositoryCallback<AuthSession>() {
            @Override
            public void onSuccess(AuthSession session) {
                sessionManager.save(session);
                loading.setValue(false);
                loggedIn.setValue(true);
            }

            @Override
            public void onError(String message) {
                loading.setValue(false);
                errorMessage.setValue(message);
            }
        });
    }
}
