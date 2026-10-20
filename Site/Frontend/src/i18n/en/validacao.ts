import type { Dicionario } from "../dicionario";

export const validacao: Dicionario["validacao"] = {
  informeEmail: "Enter your email.",
  emailInvalido: "Enter a valid email address.",
  codigo6: "The code must have 6 digits.",
  codigoNumeros: "The code must contain only numbers.",
  senhaTamanho: "The password must be between 8 and 72 characters.",
  senhaMaiuscula: "The password must contain at least one uppercase letter.",
  senhaMinuscula: "The password must contain at least one lowercase letter.",
  senhaNumero: "The password must contain at least one number.",
  senhaEspecial: "The password must contain at least one special character.",
  confirmeNovaSenha: "Confirm the new password.",
  senhasNaoCoincidem: "The passwords do not match.",
  dicaSenha: "Use at least 8 characters, with an uppercase letter, a lowercase letter, a number and a special character.",
  informeSenha: "Enter your password.",
};
