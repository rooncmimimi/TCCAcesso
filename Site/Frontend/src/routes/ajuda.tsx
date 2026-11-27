import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CentralDeAjuda } from "@/components/ajuda/CentralDeAjuda";
import { PUBLICOS, TEMAS_DE_AJUDA } from "@/dados/tutoriaisAjuda";
import { useSessao } from "@/hooks/useSessao";
import { textoDaPagina } from "@/i18n/textoDaPagina";
import { EstruturaApp } from "@/layouts/EstruturaApp";

/** Central de Ajuda, aberta a todos. `?publico=` escolhe a área e `?tema=` abre direto um tutorial. */
export const Route = createFileRoute("/ajuda")({
  // Valor que não existe é ignorado e mostra a lista, em vez de quebrar a página.
  validateSearch: z.object({
    tema: z.enum(TEMAS_DE_AJUDA).optional().catch(undefined),
    publico: z.enum(PUBLICOS).optional().catch(undefined),
  }),
  head: () => ({
    meta: [
      { title: textoDaPagina("ajuda.tituloDaPagina") },
      { name: "description", content: textoDaPagina("ajuda.descricaoDaPagina") },
    ],
  }),
  component: Ajuda,
});

function Ajuda() {
  const { tema, publico } = Route.useSearch();
  const { usuario } = useSessao();

  return (
    <EstruturaApp>
      {/* Sem escolha no endereço, a empresa logada começa na área dela; o resto, na de candidatos. */}
      <CentralDeAjuda tema={tema} publico={publico ?? (usuario?.tipo === "empresa" ? "empresa" : "candidato")} />
    </EstruturaApp>
  );
}
