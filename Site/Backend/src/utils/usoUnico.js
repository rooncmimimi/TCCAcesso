/**
 * Registro, em memória, de identificadores que só podem ser usados uma vez (o `jti` do código de
 * entrega do Google).
 *
 * `reservar` é síncrono de propósito: no Node, duas requisições simultâneas com o mesmo código não
 * conseguem as duas "ver" o identificador livre, porque a checagem e a reserva acontecem sem
 * nenhum `await` no meio.
 *
 * **Limite declarado:** a memória é do processo. Hoje o servidor é uma instância só, então vale. Com
 * mais de uma instância (ou depois de um reinício dentro da validade do código, que é curta), o
 * mesmo código poderia ser aceito de novo em outra instância. O que continua barrando o ataque nesse
 * caso é o vínculo com o navegador: sem o segredo do `sessionStorage`, o código não serve. Se o
 * servidor passar a ter várias instâncias, troque por uma tabela ou um cache compartilhado.
 */
export class RegistroDeUsoUnico {
    #reservados = new Map();

    /** Reserva `id` até `expiraEmSegundos` (instante Unix, como o `exp` do JWT). `false` se já estava reservado. */
    reservar(id, expiraEmSegundos, agora = Date.now()) {
        this.#limpar(agora);

        if (this.#reservados.has(id)) {
            return false;
        }

        this.#reservados.set(id, expiraEmSegundos * 1000);
        return true;
    }

    /** Devolve o identificador: usado quando o código **não** chegou a cumprir o seu papel e pode ser reapresentado. */
    liberar(id) {
        this.#reservados.delete(id);
    }

    #limpar(agora) {
        for (const [id, expiraEm] of this.#reservados) {
            if (expiraEm <= agora) {
                this.#reservados.delete(id);
            }
        }
    }

    get tamanho() {
        return this.#reservados.size;
    }
}

/** Códigos de entrega do Google já usados. */
export const codigosDeEntregaUsados = new RegistroDeUsoUnico();
