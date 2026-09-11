/**
 * Tipos do contrato real de "Minha atividade" (Site/Backend), conforme
 * auditoria da Fase 26 — `AtividadeController`/`AtividadeService.minha`
 * (`GET /atividades/minha`). Nomes de campo em português são LITERAIS ao que
 * a API envia — não são estilo, são o contrato.
 *
 * O endpoint agrega dados que já existem em outras tabelas (candidaturas,
 * favoritos, seguidores, curtidas, comentários, compartilhamentos) numa
 * única leitura de resumo — não é histórico próprio, não tem paginação, e é
 * estritamente escopado ao usuário autenticado (`req.user`, nunca um
 * parâmetro de rota): estruturalmente impossível ler a atividade de outro
 * usuário por aqui. Cada categoria vem como uma PRÉVIA de até 5 itens
 * (`LIMITE_PREVIA` no backend) + a contagem total real.
 */

import type { StatusCandidatura } from "../vagas";

/** Uma categoria de atividade: até 5 itens de prévia + o total real (pode ser maior que `itens.length`). */
export interface ListaComTotal<T> {
  itens: T[];
  total: number;
}

/**
 * A `empresa` embutida em vaga/vaga-favorita/empresa-seguida — o backend
 * seleciona `ATRIBUTOS_EMPRESA_RESUMO = ["id", "usuarioId", "nomeFantasia",
 * "razaoSocial", "logo", "empresaVerificada"]` (`AtividadeService.js`), um
 * `usuarioId` FLAT no próprio objeto — diferente de `EmpresaResumoVaga`
 * (`src/vagas/types.ts`), cujo `usuario?: {id,...}` aninhado é específico do
 * embed de `VagaService.js` em `GET /vagas/:id`. Não são o mesmo formato,
 * por isso um tipo próprio aqui em vez de reaproveitar aquele.
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

/** A `Vaga` embutida em candidatura/favorito — o backend só seleciona `id`/`titulo` (`AtividadeService.js: attributes: ["id", "titulo"]`), mais a `empresa` aninhada acima. */
export interface VagaResumoAtividade {
  id: string;
  titulo: string;
  empresa?: EmpresaResumoAtividade;
  [chave: string]: unknown;
}

/** `Site/Backend/src/models/Candidatura.js` — sem `attributes` restrito no `findAll`, então o registro inteiro vem, mas esta tela só usa os campos abaixo. */
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

/** O usuário seguido — mesma allowlist `ATRIBUTOS_PERFIL_RESUMO` do backend (`id, nome, fotoPerfil, tipoUsuario`), equivalente a `UsuarioResumoSocial` de `src/seguidores/types.ts` sem `capaPerfil`. */
export interface PessoaSeguidaAtividade {
  id: string;
  nome: string;
  fotoPerfil?: string | null;
  tipoUsuario: string;
  [chave: string]: unknown;
}

/** `Site/Backend/src/models/EmpresaSeguida.js` — registro inteiro + `empresa` aninhada. */
export interface EmpresaSeguidaAtividade {
  id: string;
  empresa: EmpresaResumoAtividade;
  [chave: string]: unknown;
}

/** A `Postagem` embutida em curtida/comentário/compartilhamento — só `id, conteudo, usuarioId, created_at` (`ATRIBUTOS_POSTAGEM_RESUMO` no backend). */
export interface PostagemResumoAtividade {
  id: string;
  conteudo: string | null;
  usuarioId: string;
  created_at: string;
  [chave: string]: unknown;
}

export interface CurtidaAtividade {
  id: string;
  postagem: PostagemResumoAtividade;
  [chave: string]: unknown;
}

/** `Site/Backend/src/models/Comentario.js` — registro inteiro (inclui `comentario`, o texto). */
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

/** `GET /atividades/minha` desembrulhado (sem `sucesso`) — o que `AtividadeService.minha` de fato devolve. */
export interface MinhaAtividade {
  /** `false` para conta de empresa — nesse caso `candidaturas`/`vagasFavoritas` vêm sempre vazias (o backend nem consulta), então a tela nem mostra essas duas seções. */
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
