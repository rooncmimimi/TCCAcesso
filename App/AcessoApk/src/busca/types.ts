/**
 * Tipos do contrato real de busca global (Site/Backend), conforme auditoria
 * da Fase R2 — `BuscaController`/`BuscaService` (`GET /busca`, auth
 * obrigatória). Nomes de campo em português são LITERAIS ao que a API
 * envia — não são estilo, são o contrato.
 *
 * `q` precisa ter pelo menos 2 caracteres — o backend recusa com 400
 * (`ApiError.badRequest`) abaixo disso; o app nunca chega a mandar uma
 * busca menor que essa (ver `SearchScreen.tsx`), pra não gerar um erro
 * "esperado" toda vez que o usuário ainda está digitando a primeira letra.
 *
 * IMPORTANTE (achado da auditoria): o modo `tipo=tudo` (resumo) e o modo com
 * `tipo` específico são estruturalmente DIFERENTES, não a mesma resposta com
 * mais/menos itens — o resumo nunca tem `totalPaginas` (não é paginação de
 * verdade, é um recorte de até 5 itens por categoria) e agrupa os 4 totais
 * em `totais`, enquanto um tipo específico devolve `total`/`totalPaginas`
 * reais daquela categoria isolada. Por isso são dois tipos de resposta
 * distintos abaixo, não um só com campos opcionais.
 */

import type { Postagem } from "../feed";
import type { Vaga } from "../vagas";

export type TipoBusca = "usuarios" | "empresas" | "vagas" | "postagens";

/** `Site/Backend/src/models/Candidato.js` — só embutido quando o usuário é candidato (`include` com `required: false`). */
export interface CandidatoResumoBusca {
  id: string;
  tituloProfissional?: string | null;
  cidade?: string | null;
  estado?: string | null;
  [chave: string]: unknown;
}

/** Nunca inclui administrador — o próprio backend exclui (`tipoUsuario: {[Op.ne]: "administrador"}`). */
export interface UsuarioResultadoBusca {
  id: string;
  nome: string;
  fotoPerfil?: string | null;
  tipoUsuario: "candidato" | "empresa";
  candidato?: CandidatoResumoBusca | null;
  [chave: string]: unknown;
}

/** Só empresas aprovadas aparecem (`statusAprovacao: "aprovada"` no backend). */
export interface EmpresaResultadoBusca {
  id: string;
  usuarioId: string;
  nomeFantasia?: string | null;
  razaoSocial: string;
  setor?: string | null;
  cidade?: string | null;
  estado?: string | null;
  logo?: string | null;
  empresaVerificada?: boolean;
  [chave: string]: unknown;
}

export interface BuscarParametros {
  page?: number;
  limit?: number;
}

/** `GET /busca?tipo=usuarios`. */
export interface BuscaUsuariosResposta {
  sucesso: true;
  termo: string;
  tipo: "usuarios";
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
  resultados: { usuarios: UsuarioResultadoBusca[] };
}

/** `GET /busca?tipo=empresas`. */
export interface BuscaEmpresasResposta {
  sucesso: true;
  termo: string;
  tipo: "empresas";
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
  resultados: { empresas: EmpresaResultadoBusca[] };
}

/** `GET /busca?tipo=vagas` — mesmo `Vaga` de `src/vagas/types.ts` (o backend não restringe atributos aqui, é o mesmo model). */
export interface BuscaVagasResposta {
  sucesso: true;
  termo: string;
  tipo: "vagas";
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
  resultados: { vagas: Vaga[] };
}

/** `GET /busca?tipo=postagens` — mesmo `Postagem` de `src/feed/types.ts` (mesmo processamento de mídia/assinatura de URL do feed normal). */
export interface BuscaPostagensResposta {
  sucesso: true;
  termo: string;
  tipo: "postagens";
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
  resultados: { postagens: Postagem[] };
}

/**
 * `GET /busca?tipo=tudo` (ou sem `tipo`) — resumo agrupado, até 5 itens por
 * categoria (`LIMITE_PREVIA` equivalente no backend: `Math.min(limite, 5)`).
 * SEM `totalPaginas` de propósito (ver nota acima) — usar `totais` pra saber
 * se vale mostrar "Ver mais" de cada categoria.
 */
export interface BuscaResumoResposta {
  sucesso: true;
  termo: string;
  tipo: "tudo";
  pagina: 1;
  limite: number;
  total: number;
  totais: {
    usuarios: number;
    empresas: number;
    vagas: number;
    postagens: number;
  };
  resultados: {
    usuarios: UsuarioResultadoBusca[];
    empresas: EmpresaResultadoBusca[];
    vagas: Vaga[];
    postagens: Postagem[];
  };
}
