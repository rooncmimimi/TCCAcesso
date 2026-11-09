import { createFileRoute } from "@tanstack/react-router";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { useSessao } from "@/hooks/useSessao";
import { PerfilPessoal } from "@/components/perfil/PerfilPessoal";
import { PerfilEmpresa } from "@/components/perfil/PerfilEmpresa";
import { textoDaPagina } from "@/i18n/textoDaPagina";

export const Route = createFileRoute("/perfil/")({
  head: () => ({
    meta: [
      { title: textoDaPagina("perfilindex.meuPerfilAcesso") },
      { name: "description", content: textoDaPagina("perfilindex.seuPerfilProfissionalAcessivel") },
      { property: "og:title", content: textoDaPagina("perfilindex.meuPerfilAcesso") },
      { property: "og:description", content: textoDaPagina("perfilindex.perfilProfissionalCom") },
    ],
  }),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <Perfil />
    </GuardaAcesso>
  ),
});

/**
 * Roteador do perfil: uma empresa vê seu perfil empresarial (logo, vagas, status
 * de aprovação); candidato e administrador veem o perfil pessoal (experiência,
 * formação, publicações). Nunca mistura os dois conceitos na mesma tela.
 */
function Perfil() {
  const { usuario } = useSessao();

  if (usuario?.tipo === "empresa") {
    return <PerfilEmpresa />;
  }

  return <PerfilPessoal />;
}
