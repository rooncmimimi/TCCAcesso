import { Empresa } from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";
import { garantirDono, garantirEmpresaAprovada } from "../utils/autorizacao.js";

/**
 * Autoriza (dono e `garantirEmpresaAprovada`) antes de qualquer upload ir para o Storage, nas rotas
 * de logo e capa (`empresaRoutes.js`), antes de `upload.single` e `processarLogoCapa`. Sem isso,
 * uma empresa pendente, reprovada ou suspensa (ou editando outra empresa) só seria recusada em
 * `EmpresaService.atualizar()`, com o arquivo já órfão no Storage.
 *
 * Usa as mesmas funções do serviço, que continua checando de novo para qualquer chamada que não
 * passe por esta rota.
 */
const garantirEmpresaAprovadaMiddleware = async (req, res, next) => {
    try {
        const empresa = await Empresa.findByPk(req.params.id);

        if (!empresa) {
            throw ErroApi.naoEncontrado("Empresa não encontrada.");
        }

        garantirDono(req.user, empresa.usuarioId);
        garantirEmpresaAprovada(empresa, req.user);

        return next();
    } catch (erro) {
        return next(erro);
    }
};

export default garantirEmpresaAprovadaMiddleware;
