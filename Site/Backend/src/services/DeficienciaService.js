import { Deficiencia } from "../models/index.js";
import ApiError from "../utils/ApiError.js";

/**
 * Catálogo de deficiências.
 * Leitura pública; escrita restrita a administradores (aplicado na rota).
 */
class DeficienciaService {
    async findAll() {
        return Deficiencia.findAll({ order: [["nome", "ASC"]] });
    }

    async findById(id) {
        const deficiencia = await Deficiencia.findByPk(id);

        if (!deficiencia) {
            throw ApiError.notFound("Deficiência não encontrada.");
        }

        return deficiencia;
    }

    async create(data) {
        const existente = await Deficiencia.findOne({
            where: { nome: data.nome }
        });

        if (existente) {
            throw ApiError.conflict("Esta deficiência já está cadastrada.");
        }

        return Deficiencia.create({
            nome: data.nome,
            descricao: data.descricao || null
        });
    }

    async update(id, data) {
        const deficiencia = await this.findById(id);

        await deficiencia.update({
            nome: data.nome ?? deficiencia.nome,
            descricao: data.descricao ?? deficiencia.descricao
        });

        return deficiencia;
    }

    async delete(id) {
        const deficiencia = await this.findById(id);

        await deficiencia.destroy();

        return { mensagem: "Deficiência removida com sucesso." };
    }
}

export default new DeficienciaService();
