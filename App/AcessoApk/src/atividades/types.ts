/**
 * Tipos de "Minha atividade" (`GET /atividade/minha` no backend). O backend junta numa única
 * leitura candidaturas, favoritos, seguidos, curtidas, comentários e compartilhamentos; não há
 * histórico próprio nem paginação.
 *
 * Cada categoria traz uma prévia de até 5 itens e o total real. O escopo vem sempre da sessão
 * (`req.user`), então esta rota não permite ler a atividade de outra pessoa.
 */

import type { StatusCandidatura } from "../vagas";

/** Uma categoria de atividade: até 5 itens de prévia + o total real (pode ser maior que `itens.length`). */
export interface ListaComTotal<T> {
  itens: T[];
  total: number;
}

/**
 * Empresa resumida dentro de vagas, favoritos e empresas seguidas (`ATRIBUTOS_EMPRESA_RESUMO` em
 * `AtividadeService.js`). Traz `usuarioId` direto no objeto, enquanto `EmpresaResumoVaga` aninha
 * `usuario`; por isso o tipo próprio.
 */
export interface EmpresaResumoAtividade {
  id: string;
  usuarioId: string;
  nomeFantasia?: string | null;
  razaoSocial: string;
  logo?: string | null;
  empresaVerificada?: boolean;
  [chave: string]: unknown;
}

/** A `Vaga` embutida em candidatura/favorito: o backend só seleciona `id`/`titulo` (`AtividadeService.js: attributes: ["id", "titulo"]`), mais a `empresa` aninhada acima. */
export interface VagaResumoAtividade {
  id: string;
  titulo: string;
  empresa?: EmpresaResumoAtividade;
  [chave: string]: unknown;
}

/** `Site/Backend/src/models/Candidatura.js`: sem `attributes` restrito no `findAll`, então o registro inteiro vem, mas esta tela só usa os campos abaixo. */
export interface CandidaturaAtividade {
  id: string;
  status: StatusCandidatura;
  vaga: VagaResumoAtividade;
  [chave: string]: unknown;
}

/** `Site/Backend/src/models/FavoritoVaga.js`. */
export interface FavoritoVagaAtividade {
  id: string;
  vaga: VagaResumoAtividade;
  [chave: string]: unknown;
}

/** O usuário seguido: mesma allowlist `ATRIBUTOS_PERFIL_RESUMO` do backend (`id, nome, fotoPerfil, tipoUsuario`), equivalente a `UsuarioResumoSocial` de `src/seguidores/types.ts` sem `capaPerfil`. */
export interface PessoaSeguidaAtividade {
  id: string;
  nome: string;
  fotoPerfil?: string | null;
  tipoUsuario: string;
  [chave: string]: unknown;
}

/** `Site/Backend/src/models/EmpresaSeguida.js`: registro inteiro + `empresa` aninhada. */
export interface EmpresaSeguidaAtividade {
  id: string;
  empresa: EmpresaResumoAtividade;
  [chave: string]: unknown;
}

/** A `Postagem` embutida em curtida/comentário/compartilhamento: só `id, conteudo, usuarioId, criadoEm` (`ATRIBUTOS_POSTAGEM_RESUMO` no backend). */
export interface PostagemResumoAtividade {
  id: string;
  conteudo: string | null;
  usuarioId: string;
  criadoEm: string;
  [chave: string]: unknown;
}

export interface CurtidaAtividade {
  id: string;
  postagem: PostagemResumoAtividade;
  [chave: string]: unknown;
}

/** `Site/Backend/src/models/Comentario.js`: registro inteiro (inclui `comentario`, o texto). */
export interface ComentarioAtividade {
  id: string;
  comentario: string;
  postagem: PostagemResumoAtividade;
  [chave: string]: unknown;
}

export interface CompartilhamentoAtividade {
  id: string;
  postagem: PostagemResumoAtividade;
  [chave: string]: unknown;
}

/**
 * Resposta de `GET /atividade/minha` no backend, desembrulhada (sem `sucesso`): o que
 * `AtividadeService.minha` devolve.
 */
export interface MinhaAtividade {
  /** `false` para conta de empresa: nesse caso `candidaturas`/`vagasFavoritas` vêm sempre vazias (o backend nem consulta), então a tela nem mostra essas duas seções. */
  ehCandidato: boolean;
  candidaturas: ListaComTotal<CandidaturaAtividade>;
  vagasFavoritas: ListaComTotal<FavoritoVagaAtividade>;
  seguindo: {
    pessoas: ListaComTotal<PessoaSeguidaAtividade>;
    empresas: ListaComTotal<EmpresaSeguidaAtividade>;
  };
  interacoesFeed: {
    curtidas: ListaComTotal<CurtidaAtividade>;
    comentarios: ListaComTotal<ComentarioAtividade>;
    compartilhamentos: ListaComTotal<CompartilhamentoAtividade>;
  };
}

export interface MinhaAtividadeResposta {
  sucesso: true;
  atividade: MinhaAtividade;
}
