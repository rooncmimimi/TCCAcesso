package com.acesso.app.utilitarios;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Validações dos formulários. Cada método devolve a mensagem de erro em
 * português, ou null quando o valor está correto.
 * Não depende do Android, por isso pode ser testada com JUnit comum.
 */
public final class Validador {

    public static final int TAMANHO_MINIMO_SENHA = 8;
    public static final int TAMANHO_MAXIMO_SENHA = 72;
    public static final int TAMANHO_MAXIMO_PUBLICACAO = 3000;

    /** Siglas aceitas no campo UF. */
    private static final String UFS =
            "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO";

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

    /**
     * Usada no cadastro e na troca de senha. Mesmas regras da API do Site
     * (regrasSenha em autenticacaoValidator.js): 8 a 72 caracteres, com letra
     * minúscula, maiúscula, número e símbolo.
     */
    public static String validarNovaSenha(String senha) {
        if (senha == null || senha.isEmpty()) {
            return "Crie uma senha.";
        }
        if (senha.length() < TAMANHO_MINIMO_SENHA || senha.length() > TAMANHO_MAXIMO_SENHA) {
            return "A senha deve ter entre " + TAMANHO_MINIMO_SENHA + " e " + TAMANHO_MAXIMO_SENHA + " caracteres.";
        }
        boolean temMinuscula = false;
        boolean temMaiuscula = false;
        boolean temNumero = false;
        boolean temSimbolo = false;
        for (char caractere : senha.toCharArray()) {
            if (caractere >= 'a' && caractere <= 'z') temMinuscula = true;
            else if (caractere >= 'A' && caractere <= 'Z') temMaiuscula = true;
            else if (caractere >= '0' && caractere <= '9') temNumero = true;
            else temSimbolo = true;
        }
        if (!temMinuscula) {
            return "A senha deve conter ao menos uma letra minúscula.";
        }
        if (!temMaiuscula) {
            return "A senha deve conter ao menos uma letra maiúscula.";
        }
        if (!temNumero) {
            return "A senha deve conter ao menos um número.";
        }
        if (!temSimbolo) {
            return "A senha deve conter ao menos um caractere especial (ex.: @, #, !).";
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

    // ---------------------------------------------------------------------
    // Campos opcionais do cadastro (iguais aos do Site). Vazio é aceito.

    /** Telefone com DDD: 10 dígitos (fixo) ou 11 (celular). */
    public static String validarTelefone(String telefone) {
        if (estaVazio(telefone)) {
            return null;
        }
        int digitos = somenteDigitos(telefone).length();
        return digitos == 10 || digitos == 11 ? null : "Informe o telefone com DDD, por exemplo: (11) 98765-4321";
    }

    public static String validarCpf(String cpf) {
        if (estaVazio(cpf)) {
            return null;
        }
        return digitosVerificadoresValidos(somenteDigitos(cpf), 11) ? null : "Informe um CPF válido.";
    }

    // ---------------------------------------------------------------------
    // Cadastro de empresa

    public static String validarCnpj(String cnpj) {
        if (estaVazio(cnpj)) {
            return "Informe o CNPJ da empresa.";
        }
        return digitosVerificadoresValidos(somenteDigitos(cnpj), 14) ? null : "Informe um CNPJ válido.";
    }

    public static String validarRazaoSocial(String razaoSocial) {
        if (estaVazio(razaoSocial)) {
            return "Informe a razão social.";
        }
        int tamanho = razaoSocial.trim().length();
        return tamanho >= 3 && tamanho <= 200 ? null : "Informe a razão social (3 a 200 caracteres).";
    }

    public static String validarUf(String uf) {
        if (estaVazio(uf)) {
            return null;
        }
        String sigla = uf.trim().toUpperCase(Locale.ROOT);
        return sigla.length() == 2 && UFS.contains(sigla) ? null : "Informe a UF com 2 letras, por exemplo: SP";
    }

    public static String validarCep(String cep) {
        if (estaVazio(cep)) {
            return null;
        }
        return somenteDigitos(cep).length() == 8 ? null : "Informe um CEP válido (8 dígitos).";
    }

    public static String validarSite(String site) {
        if (estaVazio(site)) {
            return null;
        }
        return site.trim().matches("(?i)^https?://[^\\s.]+\\.[^\\s]+$")
                ? null
                : "Informe uma URL válida (começando com http:// ou https://).";
    }

    /** Para campos opcionais com limite de tamanho (ex.: cidade, setor, endereço). */
    public static String validarTamanhoMaximo(String valor, int maximo) {
        if (estaVazio(valor) || valor.trim().length() <= maximo) {
            return null;
        }
        return "Use no máximo " + maximo + " caracteres.";
    }

    // ---------------------------------------------------------------------
    // Publicação e vaga (regras de postagemValidator.js e vagaValidator.js do Site)

    public static String validarPublicacao(String conteudo) {
        if (estaVazio(conteudo)) {
            return "Escreva algo para publicar.";
        }
        return conteudo.trim().length() <= TAMANHO_MAXIMO_PUBLICACAO
                ? null
                : "A publicação pode ter no máximo " + TAMANHO_MAXIMO_PUBLICACAO + " caracteres.";
    }

    public static String validarTituloVaga(String titulo) {
        int tamanho = estaVazio(titulo) ? 0 : titulo.trim().length();
        return tamanho >= 5 && tamanho <= 200 ? null : "O título deve ter entre 5 e 200 caracteres.";
    }

    public static String validarDescricaoVaga(String descricao) {
        int tamanho = estaVazio(descricao) ? 0 : descricao.trim().length();
        return tamanho >= 20 && tamanho <= 8000 ? null : "A descrição deve ter entre 20 e 8000 caracteres.";
    }

    // ---------------------------------------------------------------------

    public static String somenteDigitos(String valor) {
        return valor == null ? "" : valor.replaceAll("\\D", "");
    }

    /** Confere os dígitos verificadores de CPF (11) ou CNPJ (14). Sequências repetidas são inválidas. */
    static boolean digitosVerificadoresValidos(String digitos, int tamanho) {
        if (digitos.length() != tamanho || digitos.chars().distinct().count() == 1) {
            return false;
        }
        return digitos.charAt(tamanho - 2) == digitoVerificador(digitos, tamanho - 2)
                && digitos.charAt(tamanho - 1) == digitoVerificador(digitos, tamanho - 1);
    }

    private static char digitoVerificador(String digitos, int quantidade) {
        int soma = 0;
        for (int i = 0; i < quantidade; i++) {
            int peso = digitos.length() == 11
                    ? quantidade + 1 - i
                    : (quantidade - i - 1) % 8 + 2;
            soma += (digitos.charAt(i) - '0') * peso;
        }
        int resto = soma % 11;
        return (char) ('0' + (resto < 2 ? 0 : 11 - resto));
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
