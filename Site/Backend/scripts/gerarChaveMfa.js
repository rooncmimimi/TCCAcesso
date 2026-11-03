/**
 * Gera uma chave aleatória para `MFA_CHAVE_CIFRA` (a chave que cifra o segredo do TOTP).
 *
 *     npm run mfa:gerar-chave
 *
 * Só imprime na tela: nada é gravado em arquivo nem enviado a lugar nenhum. Copie o valor para o painel do Render
 * (Environment). 48 bytes aleatórios do sistema, em base64url (64 caracteres), bem acima do mínimo de 32.
 *
 * Atenção: trocar esta chave depois invalida os segredos de TOTP já guardados (use `npm run admin:resetar-totp`).
 */
import crypto from "node:crypto";

const chave = crypto.randomBytes(48).toString("base64url");

console.log("\nMFA_CHAVE_CIFRA gerada (copie para o Render; não a guarde em arquivo nem em chat):\n");
console.log(chave);
console.log("\nTrocar esta chave depois invalida os TOTP já ativados.\n");
