/**
 * Tipos do contrato real de bloqueio e denúncia (Site/Backend), conforme
 * auditoria da Fase 19 — `usuarioRoutes.js`/`BloqueioController`/
 * `BloqueioService` (bloqueio) e `denunciaRoutes.js`/`DenunciaController`/
 * `DenunciaService`/`denunciaValidator.js` (denúncia). Nomes de campo em
 * português são literais ao que a API envia.
 *
 * IMPORTANTE (achado da auditoria): o app não tem NENHUMA tela
 * administrativa (Fase 3, item 15) — `DenunciaController` expõe
 * `listar`/`detalhe`/resolução, mas `denunciaRoutes.js` só monta `POST /`
 * publicamente; o resto vive em rotas de administrador que este módulo
 * nunca chama. Aqui só existe a AÇÃO de denunciar, nunca uma fila de
 * moderação.
 *
 * Outro achado: `GET /usuarios/bloqueados` fica em `usuarioRoutes.js`, não
 * numa rota própria de bloqueio — o backend não separa isso num recurso
 * `/bloqueios`, é sempre `/usuarios/.../bloquear`.
 */

/** Mesma allowlist de campos de `SeguidorService`/`UsuarioResumoSocial` — nunca CPF/e-mail/endereço. */
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

/** `GET /usuarios/bloqueados` — mesmo envelope de paginação de `/postagens`/`/vagas`. */
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

/** Rótulos legíveis — os valores do backend são códigos, não texto pronto para tela nem leitor de tela. */
export const MOTIVO_DENUNCIA_LABEL: Record<MotivoDenuncia, string> = {
  spam: "Spam",
  conteudo_ofensivo: "Conteúdo ofensivo",
  discurso_odio: "Discurso de ódio",
  assedio: "Assédio",
  fraude: "Fraude ou golpe",
  informacao_falsa: "Informação falsa",
  conteudo_inadequado: "Conteúdo inadequado",
  outro: "Outro motivo",
};
