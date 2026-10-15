import validator from "validator";

/**
 * Forma canônica de um e-mail: a que o cadastro grava no banco.
 *
 * É exatamente a regra do `.normalizeEmail()` dos validadores (express-validator usa o mesmo
 * pacote `validator`): minúsculas e, para os provedores que tratam endereços diferentes como a
 * mesma caixa de entrada, sem os pontos e sem a "+etiqueta" do Gmail (`Maria.Silva+x@gmail.com`
 * vira `mariasilva@gmail.com`), e a remoção de subendereço de Outlook, Yahoo e iCloud.
 *
 * Existe para comparar e-mails que vêm de lugares diferentes (formulário e Google) na mesma forma.
 * Texto que não é um e-mail válido volta só em minúsculas e sem espaços nas pontas.
 */
export const emailCanonico = (email) => {
    const texto = String(email ?? "").trim();

    if (!texto) {
        return "";
    }

    // `normalizeEmail` não valida: texto sem "@" sairia como "@texto". Só o que é e-mail passa por ele.
    if (!validator.isEmail(texto)) {
        return texto.toLowerCase();
    }

    return validator.normalizeEmail(texto) || texto.toLowerCase();
};

export default emailCanonico;
