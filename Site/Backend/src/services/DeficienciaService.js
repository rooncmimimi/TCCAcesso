import { Deficiencia } from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";

/**
 * Catálogo de deficiências.
 * Leitura pública; escrita restrita a administradores (aplicado na rota).
 */
class DeficienciaService {
    async listar() {
        return Deficiencia.findAll({ order: [["nome", "ASC"]] });
    }

    async buscarPorId(id) {
        const deficiencia = await Deficiencia.findByPk(id);

        if (!deficiencia) {
            throw ErroApi.naoEncontrado("Deficiência não encontrada.");
        }

        return deficiencia;
    }

    async criar(data) {
        const existente = await Deficiencia.findOne({
            where: { nome: data.nome }
        });

        if (existente) {
            throw ErroApi.conflito("Esta deficiência já está cadastrada.");
        }

        return Deficiencia.create({
            nome: data.nome,
            descricao: data.descricao || null
        });
    }

    async atualizar(id, data) {
        const deficiencia = await this.buscarPorId(id);

        await deficiencia.update({
            nome: data.nome ?? deficiencia.nome,
            descricao: data.descricao ?? deficiencia.descricao
        });

        return deficiencia;
    }

    async excluir(id) {
        const deficiencia = await this.buscarPorId(id);

        await deficiencia.destroy();

        return { mensagem: "Deficiência removida com sucesso." };
    }
}

export default new DeficienciaService();
