/**
 * Tipos da busca global (`GET /busca`).
 *
 * O backend recusa termos com menos de 2 caracteres; a `BuscaScreen` nem envia essas buscas, para
 * não gerar erro enquanto a pessoa ainda digita.
 *
 * O resumo (`tipo=tudo`) e a busca de um tipo têm formatos diferentes: o resumo traz até 5 itens
 * por categoria e os totais em `totais`, sem paginação; um tipo específico traz `total` e
 * `totalPaginas` daquela categoria. Por isso são dois tipos de resposta, e não um só com campos
 * opcionais.
 */

import type { Postagem } from "../feed";
import type { Vaga } from "../vagas";

export type TipoBusca = "usuarios" | "empresas" | "vagas" | "postagens";

/** `Site/Backend/src/models/Candidato.js`: só embutido quando o usuário é candidato (`include` com `required: false`). */
export interface CandidatoResumoBusca {
  id: string;
  tituloProfissional?: string | null;
  cidade?: string | null;
  estado?: string | null;
  [chave: string]: unknown;
}

/** Nunca inclui administrador: o próprio backend exclui (`tipoUsuario: {[Op.ne]: "administrador"}`). */
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

/** `GET /busca?tipo=vagas`: mesmo `Vaga` de `src/vagas/types.ts` (o backend não restringe atributos aqui, é o mesmo model). */
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

/** `GET /busca?tipo=postagens`: mesmo `Postagem` de `src/feed/types.ts` (mesmo processamento de mídia/assinatura de URL do feed normal). */
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
 * `GET /busca?tipo=tudo` (ou sem `tipo`): até 5 itens por categoria. Não tem `totalPaginas`; use
 * `totais` para decidir se mostra "Ver mais" em cada categoria.
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
