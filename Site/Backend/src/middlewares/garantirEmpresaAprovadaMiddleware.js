import { Empresa } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { garantirDono, garantirEmpresaAprovada } from "../utils/authorization.js";

/**
 * Autoriza (dono + `garantirEmpresaAprovada`) ANTES de qualquer upload ir
 * para o Storage — usado só nas rotas de logo/capa (`empresaRoutes.js`),
 * ANTES de `upload.single`/`processarLogoCapa` na cadeia de middlewares.
 *
 * Antes desta correção, a autorização só acontecia dentro de
 * `EmpresaService.update()`, chamado pelo CONTROLLER — ou seja, DEPOIS que
 * o multer/`processarLogoCapa` já tinham enviado o arquivo pro Supabase
 * Storage. Uma empresa pendente/reprovada/suspensa (ou tentando editar a
 * empresa de outra) gerava um arquivo órfão no Storage mesmo sendo negada
 * em seguida pelo Service — o upload nunca deveria ter acontecido.
 *
 * Reaproveita as MESMAS duas funções que `EmpresaService.update()` já usa
 * (nenhuma implementação nova da regra) — só adianta a checagem pra antes
 * do upload. `EmpresaService.update()` continua chamando as duas de novo
 * depois (chamada direta ao Service, fora de uma rota HTTP, ou qualquer
 * outra rota que passe por ele, continuam protegidas do mesmo jeito).
 */
const garantirEmpresaAprovadaMiddleware = async (req, res, next) => {
    try {
        const empresa = await Empresa.findByPk(req.params.id);

        if (!empresa) {
            throw ApiError.notFound("Empresa não encontrada.");
        }

        garantirDono(req.user, empresa.usuarioId);
        garantirEmpresaAprovada(empresa, req.user);

        return next();
    } catch (erro) {
        return next(erro);
    }
};

export default garantirEmpresaAprovadaMiddleware;
