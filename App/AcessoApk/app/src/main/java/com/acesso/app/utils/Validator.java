package com.acesso.app.utils;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.regex.Pattern;

/**
 * Validações dos formulários. Cada método devolve a mensagem de erro em
 * português, ou null quando o valor está correto.
 * Não depende do Android, por isso pode ser testada com JUnit comum.
 */
public final class Validator {

    public static final int MIN_PASSWORD_LENGTH = 8;

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private static final DateTimeFormatter BR_DATE =
            DateTimeFormatter.ofPattern("dd/MM/uuuu").withResolverStyle(ResolverStyle.STRICT);

    private Validator() {
    }

    public static String validateEmail(String email) {
        if (isBlank(email)) {
            return "Informe seu e-mail.";
        }
        if (!EMAIL_PATTERN.matcher(email.trim()).matches()) {
            return "Digite um e-mail válido, por exemplo: nome@email.com";
        }
        return null;
    }

    /** Usada no login: aqui basta a senha não estar vazia. */
    public static String validateLoginPassword(String password) {
        if (password == null || password.isEmpty()) {
            return "Informe sua senha.";
        }
        return null;
    }

    /** Usada no cadastro e na troca de senha. */
    public static String validateNewPassword(String password) {
        if (password == null || password.isEmpty()) {
            return "Crie uma senha.";
        }
        if (password.length() < MIN_PASSWORD_LENGTH) {
            return "A senha precisa ter pelo menos " + MIN_PASSWORD_LENGTH + " caracteres.";
        }
        boolean hasLetter = false;
        boolean hasDigit = false;
        for (char c : password.toCharArray()) {
            if (Character.isLetter(c)) hasLetter = true;
            if (Character.isDigit(c)) hasDigit = true;
        }
        if (!hasLetter || !hasDigit) {
            return "A senha precisa ter letras e números.";
        }
        return null;
    }

    public static String validatePasswordConfirmation(String password, String confirmation) {
        if (confirmation == null || confirmation.isEmpty()) {
            return "Repita a senha para confirmar.";
        }
        if (!confirmation.equals(password)) {
            return "As senhas não são iguais.";
        }
        return null;
    }

    public static String validateName(String name) {
        if (isBlank(name)) {
            return "Informe seu nome completo.";
        }
        String trimmed = name.trim();
        if (trimmed.length() < 3 || !trimmed.contains(" ")) {
            return "Informe nome e sobrenome.";
        }
        if (trimmed.length() > 120) {
            return "O nome pode ter no máximo 120 caracteres.";
        }
        return null;
    }

    public static String validateCity(String city) {
        if (isBlank(city)) {
            return "Informe sua cidade.";
        }
        if (city.trim().length() > 120) {
            return "A cidade pode ter no máximo 120 caracteres.";
        }
        return null;
    }

    /** Data de nascimento é opcional; se preenchida, deve ser dd/mm/aaaa e a pessoa ter 14 anos ou mais. */
    public static String validateBirthDate(String birthDate, LocalDate today) {
        if (isBlank(birthDate)) {
            return null;
        }
        LocalDate date = parseBrazilianDate(birthDate);
        if (date == null) {
            return "Use o formato dia/mês/ano, por exemplo: 25/09/2000";
        }
        if (date.isAfter(today.minusYears(14))) {
            return "É preciso ter pelo menos 14 anos para usar o ACESSO.";
        }
        if (date.isBefore(today.minusYears(120))) {
            return "Confira o ano de nascimento.";
        }
        return null;
    }

    public static String validateTermsAccepted(boolean accepted) {
        return accepted ? null : "Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.";
    }

    /** Converte "25/09/2000" em LocalDate, ou devolve null se for inválida. */
    public static LocalDate parseBrazilianDate(String text) {
        if (isBlank(text)) {
            return null;
        }
        try {
            return LocalDate.parse(text.trim(), BR_DATE);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    public static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
