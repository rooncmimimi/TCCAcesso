import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout puro de `/perfil` — existe só para o TanStack Router poder ter dois
 * filhos independentes: `/perfil` (perfil.index.tsx, sempre o usuário logado)
 * e `/perfil/$usuarioId` (perfil.$usuarioId.tsx, perfil de outra pessoa/empresa).
 *
 * BUG CORRIGIDO: antes deste arquivo virar um layout, `perfil.tsx` tinha o
 * conteúdo do "meu perfil" diretamente aqui. Como `perfil.$usuarioId.tsx` é
 * filho de `/perfil` na árvore de rotas (convenção do TanStack Router para
 * arquivos com o mesmo prefixo), o filho só é renderizado dentro de um
 * `<Outlet />` do pai — que não existia. Resultado: navegar para
 * `/perfil/<id-de-outra-pessoa>` renderizava o componente do PAI (que sempre
 * mostra o usuário logado), então qualquer "ver perfil" de outra pessoa
 * aparentava abrir o próprio perfil, mesmo com a URL certa na barra de
 * endereço. Mover o conteúdo de "meu perfil" para `perfil.index.tsx` resolve
 * isso sem tocar em nenhuma lógica de `PerfilPessoal`/`PerfilEmpresa`.
 */
export const Route = createFileRoute("/perfil")({
  component: () => <Outlet />,
});
