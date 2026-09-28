package com.acesso.app.viewmodels;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.acesso.app.models.SignUpResult;
import com.acesso.app.repositories.AuthRepository;
import com.acesso.app.repositories.RepositoryCallback;
import com.acesso.app.utils.SessionManager;
import com.acesso.app.utils.Validator;

import java.time.LocalDate;

public class RegisterViewModel extends AndroidViewModel {

    /** Resultado final do cadastro, para a tela decidir para onde ir. */
    public enum Outcome { NONE, LOGGED_IN, CONFIRM_EMAIL }

    /** Os dados digitados, agrupados para não passar sete parâmetros soltos. */
    public static class Form {
        public String name;
        public String email;
        public String password;
        public String passwordConfirmation;
        public String city;
        public String birthDate;
        public boolean termsAccepted;
    }

    /** Uma mensagem por campo; null quando o campo está correto. */
    public static class FormErrors {
        public String name;
        public String email;
        public String password;
        public String passwordConfirmation;
        public String city;
        public String birthDate;
        public String terms;

        boolean hasAny() {
            return name != null || email != null || password != null || passwordConfirmation != null
                    || city != null || birthDate != null || terms != null;
        }
    }

    private final AuthRepository authRepository;
    private final SessionManager sessionManager;

    private final MutableLiveData<FormErrors> formErrors = new MutableLiveData<>(new FormErrors());
    private final MutableLiveData<String> errorMessage = new MutableLiveData<>();
    private final MutableLiveData<Boolean> loading = new MutableLiveData<>(false);
    private final MutableLiveData<Outcome> outcome = new MutableLiveData<>(Outcome.NONE);

    public RegisterViewModel(@NonNull Application application) {
        super(application);
        authRepository = new AuthRepository(application);
        sessionManager = new SessionManager(application);
    }

    public LiveData<FormErrors> getFormErrors() {
        return formErrors;
    }

    public LiveData<String> getErrorMessage() {
        return errorMessage;
    }

    public LiveData<Boolean> isLoading() {
        return loading;
    }

    public LiveData<Outcome> getOutcome() {
        return outcome;
    }

    public void register(Form form) {
        if (Boolean.TRUE.equals(loading.getValue())) {
            return;
        }
        errorMessage.setValue(null);

        FormErrors errors = validate(form);
        formErrors.setValue(errors);
        if (errors.hasAny()) {
            return;
        }

        LocalDate birthDate = Validator.parseBrazilianDate(form.birthDate);
        String birthDateIso = birthDate != null ? birthDate.toString() : null;

        loading.setValue(true);
        authRepository.signUp(form.name, form.email, form.password, form.city, birthDateIso,
                new RepositoryCallback<SignUpResult>() {
                    @Override
                    public void onSuccess(SignUpResult result) {
                        loading.setValue(false);
                        if (result.needsEmailConfirmation()) {
                            outcome.setValue(Outcome.CONFIRM_EMAIL);
                        } else {
                            sessionManager.save(result.getSession());
                            outcome.setValue(Outcome.LOGGED_IN);
                        }
                    }

                    @Override
                    public void onError(String message) {
                        loading.setValue(false);
                        errorMessage.setValue(message);
                    }
                });
    }

    static FormErrors validate(Form form) {
        FormErrors errors = new FormErrors();
        errors.name = Validator.validateName(form.name);
        errors.email = Validator.validateEmail(form.email);
        errors.password = Validator.validateNewPassword(form.password);
        errors.passwordConfirmation =
                Validator.validatePasswordConfirmation(form.password, form.passwordConfirmation);
        errors.city = Validator.validateCity(form.city);
        errors.birthDate = Validator.validateBirthDate(form.birthDate, LocalDate.now());
        errors.terms = Validator.validateTermsAccepted(form.termsAccepted);
        return errors;
    }
}
