import type { ResumoSeguidores } from '../api/leitores';

export function textoSeguidores(resumo: ResumoSeguidores, empresa: boolean): string {
  const seguidores = `${resumo.totalSeguidores} ${resumo.totalSeguidores === 1 ? 'seguidor' : 'seguidores'}`;
  return empresa ? seguidores : `${seguidores} · ${resumo.totalSeguindo} seguindo`;
}

/** Texto e dica do botão de seguir, conforme o estado (como no app Android). */
export function botaoSeguir(resumo: ResumoSeguidores, nome: string, empresa: boolean) {
  if (resumo.seguindo) {
    return { titulo: 'Seguindo', rotulo: `Seguindo ${nome}`, dica: 'Toque duas vezes para deixar de seguir', ativo: true };
  }
  if (resumo.solicitacaoPendente) {
    return { titulo: 'Pedido enviado', rotulo: `Pedido para seguir ${nome} enviado`, dica: 'Toque duas vezes para cancelar o pedido', ativo: true };
  }
  if (!empresa && resumo.perfilPrivado) {
    return { titulo: 'Solicitar para seguir', rotulo: `Solicitar para seguir ${nome}`, dica: 'Este perfil é privado', ativo: false };
  }
  return { titulo: 'Seguir', rotulo: `Seguir ${nome}`, dica: undefined, ativo: false };
}
