import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

/**
 * `/cadastro` não tem tela própria: todo cadastro começa pelo de candidato.
 *
 * A conta de candidato é a base — a conta de empresa é criada a partir dela e fica vinculada a ela.
 * Por isso não há mais tela perguntando "candidato ou empresa": quem quer cadastrar uma empresa
 * passa pelo cadastro de candidato primeiro, e `?depois=empresa` carrega essa intenção até o fim.
 *
 * A rota continua existindo só para não quebrar link antigo: redireciona, preservando o que
 * importa (`?perfil=empresa` vira a intenção de empresa, `?retomar=true` segue a retomada).
 */
export const Route = createFileRoute("/cadastro/")({
  validateSearch: z.object({
    perfil: z.enum(["candidato", "empresa"]).optional(),
    retomar: z.coerce.boolean().optional(),
    depois: z.enum(["empresa"]).optional(),
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/cadastro/candidato",
      search: {
        retomar: search.retomar,
        depois: search.depois ?? (search.perfil === "empresa" ? "empresa" : undefined),
      },
    });
  },
});
