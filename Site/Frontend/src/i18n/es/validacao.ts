import type { Dicionario } from "../dicionario";

export const validacao: Dicionario["validacao"] = {
  informeEmail: "Escribe tu correo electrónico.",
  emailInvalido: "Escribe un correo electrónico válido.",
  codigo6: "El código debe tener 6 dígitos.",
  codigoNumeros: "El código debe contener solo números.",
  senhaTamanho: "La contraseña debe tener entre 8 y 72 caracteres.",
  senhaMaiuscula: "La contraseña debe contener al menos una letra mayúscula.",
  senhaMinuscula: "La contraseña debe contener al menos una letra minúscula.",
  senhaNumero: "La contraseña debe contener al menos un número.",
  senhaEspecial: "La contraseña debe contener al menos un carácter especial.",
  confirmeNovaSenha: "Confirma la nueva contraseña.",
  senhasNaoCoincidem: "Las contraseñas no coinciden.",
  dicaSenha: "Usa al menos 8 caracteres, con mayúscula, minúscula, número y carácter especial.",
  informeSenha: "Escribe tu contraseña.",
};
