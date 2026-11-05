import { createFileRoute } from "@tanstack/react-router";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { CentralDeComunicacao } from "@/components/comunicacao/CentralDeComunicacao";

export const Route = createFileRoute("/comunicacao")({
  head: () => ({
    meta: [
      { title: "Central de comunicação — ACESSO" },
      { name: "description", content: "Cartões e frases prontas para mostrar, ouvir ou copiar em entrevistas e conversas." },
    ],
  }),
  component: ComunicacaoPagina,
});

function ComunicacaoPagina() {
  return (
    <EstruturaApp>
      <h1 className="text-3xl font-extrabold">Central de comunicação</h1>
      <p className="mt-2 text-muted-foreground">Frases prontas para você mostrar na tela, ouvir em voz alta ou copiar. Use em entrevistas, em conversas com recrutadores e no dia a dia.</p>
      <CentralDeComunicacao />
    </EstruturaApp>
  );
}
