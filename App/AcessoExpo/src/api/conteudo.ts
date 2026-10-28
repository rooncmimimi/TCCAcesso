import { FalhaApi } from '../servicos/erros';
import { requisitar } from '../servicos/http';
import { sessaoGlobal } from '../sessao/global';
import * as leitores from './leitores';

/**
 * Chamadas da área logada (feed, vagas, candidaturas, perfil e notificações), sempre em nome do
 * usuário: o token é renovado sozinho quando vence (GerenciadorSessao.comSessao).
 */

const TAMANHO_PAGINA = 20;

const comSessao = <T>(enviar: (token: string) => Promise<T>) => sessaoGlobal.comSessao(enviar);

/** GET /postagens?page=1&limit=20 */
export function listarPublicacoes() {
  return comSessao(async (token) =>
    leitores.publicacoes(await requisitar('postagens', { token, consulta: { page: 1, limit: TAMANHO_PAGINA } })),
  );
}

/** POST /postagens { conteudo } */
export function publicar(conteudo: string) {
  return comSessao(async (token) => {
    await requisitar('postagens', { token, metodo: 'POST', corpo: { conteudo: conteudo.trim() } });
  });
}

/** POST /postagens/:id/curtidas → alterna e devolve { curtido, total } */
export function curtir(publicacaoId: string) {
  return comSessao(async (token) =>
    leitores.curtida(await requisitar(`postagens/${encodeURIComponent(publicacaoId)}/curtidas`, { token, metodo: 'POST', corpo: {} })),
  );
}

/** GET /postagens/:id/comentarios */
export function listarComentarios(publicacaoId: string) {
  return comSessao(async (token) =>
    leitores.comentarios(
      await requisitar(`postagens/${encodeURIComponent(publicacaoId)}/comentarios`, { token, consulta: { page: 1, limit: 50 } }),
    ),
  );
}

/** POST /postagens/:id/comentarios { comentario, comentarioPaiId? } (resposta quando há comentário pai) */
export function comentar(publicacaoId: string, texto: string, comentarioPaiId?: string | null) {
  const corpo: Record<string, string> = { comentario: texto.trim() };
  if (comentarioPaiId) {
    corpo.comentarioPaiId = comentarioPaiId;
  }
  return comSessao(async (token) => {
    await requisitar(`postagens/${encodeURIComponent(publicacaoId)}/comentarios`, { token, metodo: 'POST', corpo });
  });
}

/** DELETE /comentarios/:id (só o autor, ou administrador) */
export function excluirComentario(comentarioId: string) {
  return comSessao(async (token) => {
    await requisitar(`comentarios/${encodeURIComponent(comentarioId)}`, { token, metodo: 'DELETE' });
  });
}

export interface FiltrosVagas {
  busca?: string;
  modalidade?: string | null;
  publicoAlvo?: string | null;
}

/** GET /vagas?search=&modalidade=&publicoAlvo=&page=1&limit=20 */
export function listarVagas(filtros: FiltrosVagas = {}) {
  return comSessao(async (token) =>
    leitores.vagas(
      await requisitar('vagas', {
        token,
        consulta: {
          search: filtros.busca,
          modalidade: filtros.modalidade,
          publicoAlvo: filtros.publicoAlvo,
          page: 1,
          limit: TAMANHO_PAGINA,
        },
      }),
    ),
  );
}

/** GET /vagas/:id */
export function obterVaga(vagaId: string) {
  return comSessao(async (token) => {
    const vaga = leitores.vagaDetalhe(await requisitar(`vagas/${encodeURIComponent(vagaId)}`, { token }));
    if (!vaga) {
      throw new FalhaApi('Vaga não encontrada.', { status: 404 });
    }
    return vaga;
  });
}

/** POST /vagas/:id/candidaturas { mensagem? } (mensagem opcional, até 2000 caracteres) */
export function candidatar(vagaId: string, mensagem?: string) {
  const corpo = mensagem && mensagem.trim() ? { mensagem: mensagem.trim() } : {};
  return comSessao(async (token) => {
    await requisitar(`vagas/${encodeURIComponent(vagaId)}/candidaturas`, { token, metodo: 'POST', corpo });
  });
}

/** GET /candidaturas/minhas?page=1&limit=50 */
export function listarCandidaturas() {
  return comSessao(async (token) =>
    leitores.candidaturas(await requisitar('candidaturas/minhas', { token, consulta: { page: 1, limit: 50 } })),
  );
}

/** GET /dashboard/empresa e GET /vagas/minhas?page=1&limit=20 */
export function carregarResumoEmpresa() {
  return comSessao(async (token) => {
    const [dashboard, minhas] = await Promise.all([
      requisitar('dashboard/empresa', { token }),
      requisitar('vagas/minhas', { token, consulta: { page: 1, limit: TAMANHO_PAGINA } }),
    ]);
    return leitores.resumoEmpresa(dashboard, minhas);
  });
}

/** Perfil da conta logada: GET /empresas/me (empresa) ou GET /perfil/candidatos/usuario/:id (pessoa). */
export function carregarMeuPerfil(tipo: 'candidato' | 'empresa', idUsuario: string) {
  const empresa = tipo === 'empresa';
  return comSessao(async (token) =>
    leitores.perfil(
      await requisitar(empresa ? 'empresas/me' : `perfil/candidatos/usuario/${encodeURIComponent(idUsuario)}`, { token }),
      empresa,
    ),
  );
}

/** GET /notificacoes?page=1&limit=50 */
export function listarNotificacoes() {
  return comSessao(async (token) =>
    leitores.notificacoes(await requisitar('notificacoes', { token, consulta: { page: 1, limit: 50 } })),
  );
}

/** GET /notificacoes/nao-lidas → { naoLidas } */
export function contarNaoLidas() {
  return comSessao(async (token) => {
    const json = await requisitar<{ naoLidas?: unknown }>('notificacoes/nao-lidas', { token });
    const total = Number(json.naoLidas);
    return Number.isFinite(total) ? total : 0;
  });
}

/** PATCH /notificacoes/:id/lida */
export function marcarComoLida(id: string) {
  return comSessao(async (token) => {
    await requisitar(`notificacoes/${encodeURIComponent(id)}/lida`, { token, metodo: 'PATCH' });
  });
}

/** PATCH /notificacoes/lidas */
export function marcarTodasComoLidas() {
  return comSessao(async (token) => {
    await requisitar('notificacoes/lidas', { token, metodo: 'PATCH' });
  });
}
