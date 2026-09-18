/**
 * Tipos de bloqueio e denúncia.
 *
 * O app só envia denúncias; a fila de moderação (listar, detalhar e resolver) fica nas rotas de
 * administrador, usadas pelo Site. O bloqueio não tem recurso próprio na API: as rotas ficam em
 * `/usuarios` (`/usuarios/bloqueados` e `/usuarios/:usuarioId/bloquear`).
 */

/** Mesma allowlist de campos de `SeguidorService`/`UsuarioResumoSocial`, nunca CPF/e-mail/endereço. */
export interface UsuarioBloqueado {
  id: string;
  nome: string;
  fotoPerfil: string | null;
  tipoUsuario: "candidato" | "empresa" | "administrador";
  [chave: string]: unknown;
}

export interface ListarBloqueadosParametros {
  page?: number;
  limit?: number;
}

/** `GET /usuarios/bloqueados`: mesmo envelope de paginação de `/postagens`/`/vagas`. */
export interface ListaBloqueadosResposta {
  sucesso: true;
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  bloqueados: UsuarioBloqueado[];
}

/** `POST /usuarios/:usuarioId/bloquear` e `DELETE /usuarios/:usuarioId/bloquear`. */
export interface BloquearResposta {
  sucesso: true;
  bloqueado: boolean;
}

/** `Denuncia.entidadeTipo` ENUM (`models/Denuncia.js`). */
export type EntidadeTipoDenuncia = "postagem" | "comentario" | "usuario" | "mensagem" | "vaga" | "empresa";

/** `Denuncia.motivo` ENUM. */
export type MotivoDenuncia =
  | "spam"
  | "conteudo_ofensivo"
  | "discurso_odio"
  | "assedio"
  | "fraude"
  | "informacao_falsa"
  | "conteudo_inadequado"
  | "outro";

/** `POST /denuncias`. */
export interface CriarDenunciaDados {
  entidadeTipo: EntidadeTipoDenuncia;
  entidadeId: string;
  motivo: MotivoDenuncia;
  descricao?: string;
}

export interface Denuncia {
  id: string;
  denuncianteId: string;
  entidadeTipo: EntidadeTipoDenuncia;
  entidadeId: string;
  motivo: MotivoDenuncia;
  descricao: string | null;
  status: "pendente" | "em_analise" | "resolvida" | "arquivada";
  [chave: string]: unknown;
}

export interface CriarDenunciaResposta {
  sucesso: true;
  denuncia: Denuncia;
}

/** Rótulos legíveis: os valores do backend são códigos, não texto pronto para tela nem leitor de tela. */
export const ROTULOS_MOTIVO_DENUNCIA: Record<MotivoDenuncia, string> = {
  spam: "Spam",
  conteudo_ofensivo: "Conteúdo ofensivo",
  discurso_odio: "Discurso de ódio",
  assedio: "Assédio",
  fraude: "Fraude ou golpe",
  informacao_falsa: "Informação falsa",
  conteudo_inadequado: "Conteúdo inadequado",
  outro: "Outro motivo",
};
