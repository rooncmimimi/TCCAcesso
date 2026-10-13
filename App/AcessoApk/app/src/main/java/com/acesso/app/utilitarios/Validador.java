package com.acesso.app.utilitarios;

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
public final class Validador {

    public static final int TAMANHO_MINIMO_SENHA = 8;

    private static final Pattern PADRAO_EMAIL =
            Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private static final DateTimeFormatter DATA_BRASILEIRA =
            DateTimeFormatter.ofPattern("dd/MM/uuuu").withResolverStyle(ResolverStyle.STRICT);

    private Validador() {
    }

    public static String validarEmail(String email) {
        if (estaVazio(email)) {
            return "Informe seu e-mail.";
        }
        if (!PADRAO_EMAIL.matcher(email.trim()).matches()) {
            return "Digite um e-mail válido, por exemplo: nome@email.com";
        }
        return null;
    }

    /** Usada no login: aqui basta a senha não estar vazia. */
    public static String validarSenhaLogin(String senha) {
        if (senha == null || senha.isEmpty()) {
            return "Informe sua senha.";
        }
        return null;
    }

    /** Usada no cadastro e na troca de senha. */
    public static String validarNovaSenha(String senha) {
        if (senha == null || senha.isEmpty()) {
            return "Crie uma senha.";
        }
        if (senha.length() < TAMANHO_MINIMO_SENHA) {
            return "A senha precisa ter pelo menos " + TAMANHO_MINIMO_SENHA + " caracteres.";
        }
        boolean temLetra = false;
        boolean temNumero = false;
        for (char caractere : senha.toCharArray()) {
            if (Character.isLetter(caractere)) temLetra = true;
            if (Character.isDigit(caractere)) temNumero = true;
        }
        if (!temLetra || !temNumero) {
            return "A senha precisa ter letras e números.";
        }
        return null;
    }

    public static String validarConfirmacaoSenha(String senha, String confirmacao) {
        if (confirmacao == null || confirmacao.isEmpty()) {
            return "Repita a senha para confirmar.";
        }
        if (!confirmacao.equals(senha)) {
            return "As senhas não são iguais.";
        }
        return null;
    }

    public static String validarNome(String nome) {
        if (estaVazio(nome)) {
            return "Informe seu nome completo.";
        }
        String nomeLimpo = nome.trim();
        if (nomeLimpo.length() < 3 || !nomeLimpo.contains(" ")) {
            return "Informe nome e sobrenome.";
        }
        if (nomeLimpo.length() > 120) {
            return "O nome pode ter no máximo 120 caracteres.";
        }
        return null;
    }

    public static String validarCidade(String cidade) {
        if (estaVazio(cidade)) {
            return "Informe sua cidade.";
        }
        if (cidade.trim().length() > 120) {
            return "A cidade pode ter no máximo 120 caracteres.";
        }
        return null;
    }

    /** Data de nascimento é opcional; se preenchida, deve ser dd/mm/aaaa e a pessoa ter 14 anos ou mais. */
    public static String validarDataNascimento(String dataNascimento, LocalDate hoje) {
        if (estaVazio(dataNascimento)) {
            return null;
        }
        LocalDate data = converterDataBrasileira(dataNascimento);
        if (data == null) {
            return "Use o formato dia/mês/ano, por exemplo: 25/09/2000";
        }
        if (data.isAfter(hoje.minusYears(14))) {
            return "É preciso ter pelo menos 14 anos para usar o ACESSO.";
        }
        if (data.isBefore(hoje.minusYears(120))) {
            return "Confira o ano de nascimento.";
        }
        return null;
    }

    public static String validarAceiteTermos(boolean aceitou) {
        return aceitou ? null : "Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.";
    }

    /** Converte "25/09/2000" em LocalDate, ou devolve null se for inválida. */
    public static LocalDate converterDataBrasileira(String texto) {
        if (estaVazio(texto)) {
            return null;
        }
        try {
            return LocalDate.parse(texto.trim(), DATA_BRASILEIRA);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    public static boolean estaVazio(String valor) {
        return valor == null || valor.trim().isEmpty();
    }
}
